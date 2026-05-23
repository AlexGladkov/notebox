import { indexedDbService } from './indexedDb';
import type { SyncQueueItem } from './types';

const MAX_RETRY_COUNT = 3;

class SyncQueue {
  private sequenceCounters = new Map<string, number>();
  private initialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    // Восстанавливаем счётчики из существующих записей в IndexedDB
    const allItems = await indexedDbService.getSyncQueue();
    const maxSequenceByNote = new Map<string, number>();

    for (const item of allItems) {
      if (item.sequence !== undefined) {
        const current = maxSequenceByNote.get(item.noteId) || 0;
        maxSequenceByNote.set(item.noteId, Math.max(current, item.sequence));
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
    this.sequenceCounters.set(item.noteId, nextSequence);

    await indexedDbService.addToSyncQueue({
      ...item,
      sequence: nextSequence,
      retryCount: 0,
    });
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
    const allItems = await this.getAll();
    return allItems
      .filter(item => item.noteId === noteId)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
  }

  async updateNoteId(oldId: string, newId: string): Promise<void> {
    const items = await this.getItemsByNoteId(oldId);

    for (const item of items) {
      const updatedItem: SyncQueueItem = {
        ...item,
        noteId: newId,
      };
      await indexedDbService.updateSyncQueueItem(updatedItem);
    }

    // Обновляем счётчик sequence
    const oldSequence = this.sequenceCounters.get(oldId);
    if (oldSequence !== undefined) {
      this.sequenceCounters.set(newId, oldSequence);
      this.sequenceCounters.delete(oldId);
    }
  }
}

export const syncQueue = new SyncQueue();
