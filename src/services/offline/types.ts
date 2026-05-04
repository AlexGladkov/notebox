import type { Note } from '../../types';

export type SyncOperation = 'create' | 'update' | 'delete' | 'move';

export interface SyncQueueItem {
  id?: number;
  noteId: string;
  operation: SyncOperation;
  payload: Partial<Note>;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface OfflineMetadata {
  lastSyncTime: number | null;
  schemaVersion: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncTime: number | null;
  lastError: string | null;
}
