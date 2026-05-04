import type { Note } from '../../types';
import type { SyncQueueItem } from './types';

const DB_NAME = 'notebox-offline';
const DB_VERSION = 1;

const STORE_NOTES = 'notes';
const STORE_SYNC_QUEUE = 'syncQueue';
const STORE_METADATA = 'metadata';

class IndexedDbService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    // Проверяем поддержку IndexedDB
    if (typeof indexedDB === 'undefined') {
      throw new Error('IndexedDB is not supported in this browser');
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store для заметок
        if (!db.objectStoreNames.contains(STORE_NOTES)) {
          const notesStore = db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
          notesStore.createIndex('parentId', 'parentId', { unique: false });
          notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Store для очереди синхронизации
        if (!db.objectStoreNames.contains(STORE_SYNC_QUEUE)) {
          const syncQueueStore = db.createObjectStore(STORE_SYNC_QUEUE, {
            keyPath: 'id',
            autoIncrement: true
          });
          syncQueueStore.createIndex('noteId', 'noteId', { unique: false });
          syncQueueStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Store для метаданных
        if (!db.objectStoreNames.contains(STORE_METADATA)) {
          db.createObjectStore(STORE_METADATA, { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async ensureDb(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async getAllNotes(): Promise<Note[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTES, 'readonly');
      const store = transaction.objectStore(STORE_NOTES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getNote(id: string): Promise<Note | undefined> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTES, 'readonly');
      const store = transaction.objectStore(STORE_NOTES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveNote(note: Note): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTES, 'readwrite');
      const store = transaction.objectStore(STORE_NOTES);
      const request = store.put(note);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async saveNotes(notes: Note[]): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTES, 'readwrite');
      const store = transaction.objectStore(STORE_NOTES);

      let completed = 0;
      const errors: DOMException[] = [];

      notes.forEach(note => {
        const request = store.put(note);
        request.onsuccess = () => {
          completed++;
          if (completed === notes.length) {
            if (errors.length > 0) {
              reject(errors[0]);
            } else {
              resolve();
            }
          }
        };
        request.onerror = () => {
          if (request.error) {
            errors.push(request.error);
          }
          completed++;
          if (completed === notes.length) {
            reject(errors[0]);
          }
        };
      });

      if (notes.length === 0) {
        resolve();
      }
    });
  }

  async deleteNote(id: string): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NOTES, 'readwrite');
      const store = transaction.objectStore(STORE_NOTES);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<number> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_QUEUE);
      const request = store.add(item);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_QUEUE, 'readonly');
      const store = transaction.objectStore(STORE_SYNC_QUEUE);
      const index = store.index('timestamp');
      const request = index.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_QUEUE);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_QUEUE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_SYNC_QUEUE, 'readwrite');
      const store = transaction.objectStore(STORE_SYNC_QUEUE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMetadata(key: string): Promise<any> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_METADATA, 'readonly');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  async setMetadata(key: string, value: any): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_METADATA, 'readwrite');
      const store = transaction.objectStore(STORE_METADATA);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.ensureDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_NOTES, STORE_SYNC_QUEUE, STORE_METADATA],
        'readwrite'
      );

      transaction.objectStore(STORE_NOTES).clear();
      transaction.objectStore(STORE_SYNC_QUEUE).clear();
      transaction.objectStore(STORE_METADATA).clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const indexedDbService = new IndexedDbService();
