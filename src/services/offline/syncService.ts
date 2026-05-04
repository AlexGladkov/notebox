import { ref } from 'vue';
import { notesApi } from '../../api/notes';
import { indexedDbService } from './indexedDb';
import { syncQueue } from './syncQueue';
import type { SyncQueueItem, SyncStatus } from './types';

class SyncService {
  private isProcessing = ref(false);
  private syncStatus = ref<SyncStatus>('idle');
  private lastError = ref<string | null>(null);

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

      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          await syncQueue.remove(item.id!);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to sync item ${item.id}:`, errorMessage);
          await syncQueue.incrementRetry(item, errorMessage);
          this.lastError.value = errorMessage;
        }

        // Добавляем небольшую задержку между запросами
        await new Promise(resolve => setTimeout(resolve, 100));
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

      // Обновляем локальную заметку с данными с сервера
      await indexedDbService.saveNote(serverNote);
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
