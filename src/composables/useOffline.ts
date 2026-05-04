import { ref, computed, watch } from 'vue';
import { offlineStore } from '../services/offline/offlineStore';
import { syncQueue } from '../services/offline/syncQueue';
import { syncService } from '../services/offline/syncService';
import { indexedDbService } from '../services/offline/indexedDb';
import { useNetworkStatus } from '../services/offline/networkStatus';
import type { SyncState } from '../services/offline/types';

export function useOffline() {
  const { isOnline } = useNetworkStatus();
  const syncState = ref<SyncState>({
    status: 'idle',
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
  });

  const isSyncing = computed(() => syncState.value.status === 'syncing');
  const hasPendingChanges = computed(() => syncState.value.pendingCount > 0);
  const hasError = computed(() => syncState.value.status === 'error');

  async function updateSyncState() {
    const pendingCount = await syncQueue.getPendingCount();
    const lastSyncTime = await indexedDbService.getMetadata('lastSyncTime');
    const { status, lastError } = syncService.getStatus();

    syncState.value = {
      status: status.value,
      pendingCount,
      lastSyncTime,
      lastError: lastError.value,
    };
  }

  async function sync() {
    if (!isOnline.value) {
      console.log('Cannot sync: offline');
      return;
    }

    try {
      await syncService.processQueue();
      await updateSyncState();
    } catch (error) {
      console.error('Sync failed:', error);
      await updateSyncState();
      throw error;
    }
  }

  async function fullSync() {
    if (!isOnline.value) {
      console.log('Cannot sync: offline');
      return;
    }

    try {
      await offlineStore.syncWithServer();
      await updateSyncState();
    } catch (error) {
      console.error('Full sync failed:', error);
      await updateSyncState();
      throw error;
    }
  }

  // Автоматическая синхронизация при подключении к сети
  watch(isOnline, async (online) => {
    if (online) {
      console.log('Connection restored, syncing...');
      await sync();
    }
  });

  // Периодическое обновление состояния синхронизации
  setInterval(() => {
    updateSyncState();
  }, 5000);

  // Инициализация
  updateSyncState();

  return {
    syncState,
    isSyncing,
    hasPendingChanges,
    hasError,
    sync,
    fullSync,
    updateSyncState,
  };
}
