import { ref, onMounted } from 'vue';
import type { Note } from '../types';
import { notesApi, ApiError } from '../api';
import { offlineStore } from '../services/offline/offlineStore';
import { indexedDbService } from '../services/offline/indexedDb';
import { useNetworkStatus } from './useNetworkStatus';

export function useStorage() {
  const notes = ref<Note[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const { isOnline } = useNetworkStatus();

  const loadNotes = async () => {
    try {
      loading.value = true;
      error.value = null;

      // Сначала загружаем из кэша для быстрого отображения
      const cachedNotes = await offlineStore.loadFromCache();
      if (cachedNotes.length > 0) {
        notes.value = cachedNotes;
        loading.value = false;
      }

      // Если онлайн, загружаем с сервера и синхронизируем
      if (isOnline.value) {
        try {
          const serverNotes = await notesApi.getAll();
          notes.value = serverNotes;
          await offlineStore.saveToCache(serverNotes);
          await indexedDbService.setMetadata('lastSyncTime', Date.now());
        } catch (err) {
          console.error('Failed to load from server:', err);
          // Если есть кэш, используем его
          if (cachedNotes.length === 0) {
            error.value = err instanceof ApiError ? err.message : 'Failed to load notes';
            notes.value = [];
          }
        }
      } else if (cachedNotes.length === 0) {
        // Офлайн и нет кэша
        error.value = 'Нет подключения к интернету и нет локального кэша';
        notes.value = [];
      }
    } catch (err) {
      console.error('Failed to load notes:', err);
      error.value = err instanceof ApiError ? err.message : 'Failed to load notes';
      notes.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadFromStorage = async () => {
    await loadNotes();
  };

  onMounted(() => {
    loadFromStorage();
  });

  return {
    notes,
    loading,
    error,
    loadNotes,
    loadFromStorage,
  };
}
