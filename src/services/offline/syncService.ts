import { ref } from 'vue';
import { notesApi } from '../../api/notes';
import { indexedDbService } from './indexedDb';
import { syncQueue } from './syncQueue';
import type { SyncQueueItem, SyncStatus } from './types';

// Timeout для операций синхронизации заметки (30 секунд)
const SYNC_TIMEOUT_MS = 30000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

class SyncService {
  private isProcessing = ref(false);
  private syncStatus = ref<SyncStatus>('idle');
  private lastError = ref<string | null>(null);
  private noteLocks = new Map<string, Promise<void>>();

  async processQueue(): Promise<void> {
    if (this.isProcessing.value) {
      console.log('Sync already in progress');
      return;
    }

    this.isProcessing.value = true;
    this.syncStatus.value = 'syncing';
    this.lastError.value = null;

    try {
      const items = await syncQueue.getAll();
      const pendingItems = items.filter(item => syncQueue.shouldRetry(item));

      // Группируем операции по noteId
      const itemsByNote = new Map<string, SyncQueueItem[]>();
      for (const item of pendingItems) {
        const noteItems = itemsByNote.get(item.noteId) || [];
        noteItems.push(item);
        itemsByNote.set(item.noteId, noteItems);
      }

      // Обрабатываем операции для каждой заметки последовательно
      for (const [noteId, noteItems] of itemsByNote) {
        // Сортируем по sequence для гарантии порядка (обрабатываем undefined для backward compatibility)
        noteItems.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

        // Ждём завершения предыдущей операции для этой заметки
        const existingLock = this.noteLocks.get(noteId);
        if (existingLock) {
          await existingLock.catch(() => {
            // Игнорируем ошибки предыдущей блокировки, продолжаем обработку
          });
        }

        // Создаём новую блокировку для этой заметки с timeout
        const lockPromise = withTimeout(
          this.processNoteItems(noteId, noteItems),
          SYNC_TIMEOUT_MS,
          `Sync timeout for note ${noteId}`
        );
        this.noteLocks.set(noteId, lockPromise);

        try {
          await lockPromise;
        } catch (error) {
          console.error(`Failed to process items for note ${noteId}:`, error);
          // Продолжаем обработку других заметок
        } finally {
          this.noteLocks.delete(noteId);
        }
      }

      this.syncStatus.value = 'idle';
    } catch (error) {
      this.syncStatus.value = 'error';
      this.lastError.value = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to process sync queue:', error);
    } finally {
      this.isProcessing.value = false;
    }
  }

  private async processNoteItems(noteId: string, items: SyncQueueItem[]): Promise<void> {
    console.log(`[SyncService] Processing ${items.length} items for note ${noteId}, sequences: [${items.map(i => i.sequence || 'N/A').join(', ')}]`);

    for (const item of items) {
      try {
        await this.processSyncItem(item);
        await syncQueue.remove(item.id!);
        console.log(`[SyncService] Successfully synced ${item.operation} for note ${noteId}, sequence: ${item.sequence || 'N/A'}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to sync item ${item.id} for note ${noteId}:`, errorMessage);
        await syncQueue.incrementRetry(item, errorMessage);
        this.lastError.value = errorMessage;
      }

      // Добавляем небольшую задержку между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    switch (item.operation) {
      case 'create':
        await this.syncCreate(item);
        break;
      case 'update':
        await this.syncUpdate(item);
        break;
      case 'delete':
        await this.syncDelete(item);
        break;
      case 'move':
        await this.syncMove(item);
        break;
      default:
        throw new Error(`Unknown operation: ${item.operation}`);
    }
  }

  private async syncCreate(item: SyncQueueItem): Promise<void> {
    const localNote = await indexedDbService.getNote(item.noteId);
    if (!localNote) {
      throw new Error('Local note not found');
    }

    try {
      const serverNote = await notesApi.create({
        title: localNote.title,
        content: localNote.content,
        parentId: localNote.parentId,
        icon: localNote.icon,
        backdropType: localNote.backdropType,
        backdropValue: localNote.backdropValue,
        backdropPositionY: localNote.backdropPositionY,
      });

      // ID mapping: обновляем все pending операции с новым server ID
      if (serverNote.id !== item.noteId) {
        console.log(`[SyncService] ID mapping: ${item.noteId} -> ${serverNote.id}`);
        // Сначала сохраняем новую заметку, чтобы не потерять данные при сбое
        await indexedDbService.saveNote(serverNote);
        // Сохраняем ID mapping в metadata для будущих запросов
        await indexedDbService.setMetadata(`id_mapping:${item.noteId}`, serverNote.id);
        // Обновляем pending операции с новым server ID
        await syncQueue.updateNoteId(item.noteId, serverNote.id);
        // Только после успешного сохранения удаляем старую локальную заметку
        try {
          await indexedDbService.deleteNote(item.noteId);
        } catch (error) {
          // Логируем ошибку, но не прерываем процесс - данные уже сохранены с новым ID
          console.error(`Failed to delete old local note ${item.noteId}:`, error);
        }
      } else {
        // Обновляем локальную заметку с данными с сервера
        await indexedDbService.saveNote(serverNote);
      }
    } catch (error: any) {
      // Если заметка уже существует на сервере, пытаемся обновить
      if (error?.status === 409 || error?.message?.includes('already exists')) {
        await this.syncUpdate(item);
      } else {
        throw error;
      }
    }
  }

  private async syncUpdate(item: SyncQueueItem): Promise<void> {
    const localNote = await indexedDbService.getNote(item.noteId);
    if (!localNote) {
      throw new Error('Local note not found');
    }

    try {
      // Получаем серверную версию для проверки конфликтов
      const serverNote = await notesApi.getById(item.noteId);

      // Проверяем конфликт по updatedAt
      if (serverNote.updatedAt > localNote.updatedAt) {
        // Серверная версия новее - используем её
        await indexedDbService.saveNote(serverNote);
        console.log(`Server version is newer for note ${item.noteId}, using server version`);
        return;
      }

      // Локальная версия новее или равна - обновляем сервер
      const updatedNote = await notesApi.update(item.noteId, {
        title: localNote.title,
        content: localNote.content,
        parentId: localNote.parentId,
        icon: localNote.icon,
        backdropType: localNote.backdropType,
        backdropValue: localNote.backdropValue,
        backdropPositionY: localNote.backdropPositionY,
      });

      // Обновляем локальную версию
      await indexedDbService.saveNote(updatedNote);
    } catch (error: any) {
      // Если заметка не найдена на сервере, создаём её
      if (error?.status === 404 || error?.message?.includes('not found')) {
        await this.syncCreate(item);
      } else {
        throw error;
      }
    }
  }

  private async syncDelete(item: SyncQueueItem): Promise<void> {
    try {
      await notesApi.delete(item.noteId, true);
      await indexedDbService.deleteNote(item.noteId);
    } catch (error: any) {
      // Если заметка уже удалена на сервере, игнорируем ошибку
      if (error?.status === 404 || error?.message?.includes('not found')) {
        await indexedDbService.deleteNote(item.noteId);
      } else {
        throw error;
      }
    }
  }

  private async syncMove(item: SyncQueueItem): Promise<void> {
    const localNote = await indexedDbService.getNote(item.noteId);
    if (!localNote) {
      throw new Error('Local note not found');
    }

    try {
      const updatedNote = await notesApi.move(item.noteId, {
        parentId: localNote.parentId ?? null,
      });

      await indexedDbService.saveNote(updatedNote);
    } catch (error: any) {
      // Если заметка не найдена, создаём её
      if (error?.status === 404 || error?.message?.includes('not found')) {
        await this.syncCreate(item);
      } else {
        throw error;
      }
    }
  }

  async fullSync(): Promise<void> {
    try {
      this.syncStatus.value = 'syncing';

      // Сначала обрабатываем очередь локальных изменений
      await this.processQueue();

      // Затем загружаем все заметки с сервера
      const serverNotes = await notesApi.getAll();

      // Обновляем локальный кэш
      await indexedDbService.saveNotes(serverNotes);

      // Обновляем время последней синхронизации
      await indexedDbService.setMetadata('lastSyncTime', Date.now());

      this.syncStatus.value = 'idle';
    } catch (error) {
      this.syncStatus.value = 'error';
      this.lastError.value = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to perform full sync:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      status: this.syncStatus,
      isProcessing: this.isProcessing,
      lastError: this.lastError,
    };
  }
}

export const syncService = new SyncService();
