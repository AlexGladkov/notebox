import { indexedDbService } from './indexedDb';
import type { SyncQueueItem } from './types';

const MAX_RETRY_COUNT = 3;

class SyncQueue {
  private sequenceCounters = new Map<string, number>();
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Мьютекс: если инициализация уже идёт, ждём её завершения
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Создаём Promise для инициализации
    this.initializationPromise = this.doInitialization();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async doInitialization(): Promise<void> {
    // Восстанавливаем счётчики из существующих записей в IndexedDB
    const allItems = await indexedDbService.getSyncQueue();
    const maxSequenceByNote = new Map<string, number>();
    const itemsNeedingSequence: SyncQueueItem[] = [];

    for (const item of allItems) {
      if (item.sequence !== undefined) {
        const current = maxSequenceByNote.get(item.noteId) || 0;
        maxSequenceByNote.set(item.noteId, Math.max(current, item.sequence));
      } else {
        // Backward compatibility: записи без sequence получат sequence на основе timestamp
        itemsNeedingSequence.push(item);
      }
    }

    // Миграция старых записей: присваиваем sequence на основе timestamp
    if (itemsNeedingSequence.length > 0) {
      console.log(`[SyncQueue] Migrating ${itemsNeedingSequence.length} items without sequence`);

      // Группируем по noteId и сортируем по timestamp
      const itemsByNote = new Map<string, SyncQueueItem[]>();
      for (const item of itemsNeedingSequence) {
        const noteItems = itemsByNote.get(item.noteId) || [];
        noteItems.push(item);
        itemsByNote.set(item.noteId, noteItems);
      }

      for (const [noteId, noteItems] of itemsByNote) {
        // Сортируем по timestamp
        noteItems.sort((a, b) => a.timestamp - b.timestamp);

        // Присваиваем sequence
        const baseSequence = maxSequenceByNote.get(noteId) || 0;
        for (let i = 0; i < noteItems.length; i++) {
          const item = noteItems[i];
          const newSequence = baseSequence + i + 1;
          const updatedItem: SyncQueueItem = {
            ...item,
            sequence: newSequence,
          };
          await indexedDbService.updateSyncQueueItem(updatedItem);
          maxSequenceByNote.set(noteId, newSequence);
        }
      }
    }

    // Инициализируем счётчики максимальными значениями
    for (const [noteId, maxSeq] of maxSequenceByNote) {
      this.sequenceCounters.set(noteId, maxSeq);
    }

    this.initialized = true;
  }

  async add(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'sequence'>): Promise<void> {
    await this.ensureInitialized();

    // Генерируем sequence для этой заметки
    const currentSequence = this.sequenceCounters.get(item.noteId) || 0;
    const nextSequence = currentSequence + 1;

    try {
      await indexedDbService.addToSyncQueue({
        ...item,
        sequence: nextSequence,
        retryCount: 0,
      });
      // Обновляем счётчик только после успешного сохранения
      this.sequenceCounters.set(item.noteId, nextSequence);
    } catch (error) {
      console.error(`Failed to add item to sync queue for note ${item.noteId}:`, error);
      throw error;
    }
  }

  async getAll(): Promise<SyncQueueItem[]> {
    return indexedDbService.getSyncQueue();
  }

  async remove(id: number): Promise<void> {
    await indexedDbService.removeSyncQueueItem(id);
  }

  async incrementRetry(item: SyncQueueItem, error: string): Promise<void> {
    const updatedItem: SyncQueueItem = {
      ...item,
      retryCount: item.retryCount + 1,
      lastError: error,
    };

    if (updatedItem.retryCount >= MAX_RETRY_COUNT) {
      console.error(`Max retries reached for sync item ${item.id}, error: ${error}`);
      // Можно добавить логику для уведомления пользователя
    }

    await indexedDbService.updateSyncQueueItem(updatedItem);
  }

  async clear(): Promise<void> {
    await indexedDbService.clearSyncQueue();
  }

  async getPendingCount(): Promise<number> {
    const items = await this.getAll();
    return items.filter(item => item.retryCount < MAX_RETRY_COUNT).length;
  }

  async getFailedItems(): Promise<SyncQueueItem[]> {
    const items = await this.getAll();
    return items.filter(item => item.retryCount >= MAX_RETRY_COUNT);
  }

  shouldRetry(item: SyncQueueItem): boolean {
    return item.retryCount < MAX_RETRY_COUNT;
  }

  getRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s
    return Math.min(1000 * Math.pow(2, retryCount), 4000);
  }

  async getItemsByNoteId(noteId: string): Promise<SyncQueueItem[]> {
    await this.ensureInitialized();
    const allItems = await this.getAll();
    return allItems
      .filter(item => item.noteId === noteId)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }

  async updateNoteId(oldId: string, newId: string): Promise<void> {
    await this.ensureInitialized();
    const items = await this.getItemsByNoteId(oldId);

    // ВАЖНО: Rollback не является атомарным, т.к. каждый updateSyncQueueItem() - отдельная транзакция.
    // В редких случаях сбоя во время rollback может остаться inconsistent state.
    // Для полной атомарности требуется батч-обновление в одной IndexedDB транзакции.
    const updatedItems: SyncQueueItem[] = [];
    try {
      for (const item of items) {
        const updatedItem: SyncQueueItem = {
          ...item,
          noteId: newId,
        };
        await indexedDbService.updateSyncQueueItem(updatedItem);
        updatedItems.push(item); // Сохраняем оригинальные items для возможного отката
      }

      // Обновляем счётчик sequence только после успешного обновления всех items
      const oldSequence = this.sequenceCounters.get(oldId);
      if (oldSequence !== undefined) {
        this.sequenceCounters.set(newId, oldSequence);
        this.sequenceCounters.delete(oldId);
      }
    } catch (error) {
      // При ошибке пытаемся откатить изменения
      console.error(`Failed to update noteId from ${oldId} to ${newId}, rolling back:`, error);
      for (const originalItem of updatedItems) {
        try {
          await indexedDbService.updateSyncQueueItem(originalItem);
        } catch (rollbackError) {
          console.error(`Failed to rollback item ${originalItem.id}:`, rollbackError);
        }
      }
      throw error;
    }
  }
}

export const syncQueue = new SyncQueue();
