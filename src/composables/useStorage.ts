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

          // Получаем все локальные заметки из IndexedDB (включая несинхронизированные)
          const allLocalNotes = await offlineStore.loadFromCache();

          // Мерджим с локальными заметками, сохраняя несинхронизированные изменения
          const serverNotesMap = new Map(serverNotes.map(n => [n.id, n]));

          const mergedNotes: Note[] = [];

          // Добавляем все заметки с сервера
          serverNotes.forEach(serverNote => {
            mergedNotes.push(serverNote);
          });

          // Добавляем локальные заметки которых нет на сервере (несинхронизированные)
          allLocalNotes.forEach(localNote => {
            if (!serverNotesMap.has(localNote.id)) {
              mergedNotes.push(localNote);
            }
          });

          notes.value = mergedNotes;
          await offlineStore.saveToCache(mergedNotes);
          await indexedDbService.setMetadata('lastSyncTime', Date.now());
        } catch (err) {
          console.error('Failed to load from server:', err);
          // Загружаем актуальные данные из IndexedDB (могли быть обновлены во время загрузки)
          const freshLocalNotes = await offlineStore.loadFromCache();
          if (freshLocalNotes.length > 0) {
            notes.value = freshLocalNotes;
          } else {
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
