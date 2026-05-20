import { ref, onMounted } from 'vue';
import type { Note } from '../types';
import { notesApi, ApiError } from '../api';
import { offlineStore } from '../services/offline/offlineStore';
import { indexedDbService } from '../services/offline/indexedDb';
import { useNetworkStatus } from './useNetworkStatus';

/**
 * Удаляет дубликаты заметок по ID и title.
 * Для заметок с одинаковым title (например, "📥 Inbox") оставляет только самую свежую (по updatedAt).
 */
function deduplicateNotes(notes: Note[]): Note[] {
  const seenIds = new Set<string>();
  const titleMap = new Map<string, Note[]>();

  // Группируем заметки по title
  notes.forEach(note => {
    const key = `${note.title}:${note.parentId || 'root'}`;
    if (!titleMap.has(key)) {
      titleMap.set(key, []);
    }
    titleMap.get(key)!.push(note);
  });

  const result: Note[] = [];

  // Для каждой группы заметок с одинаковым title + parentId
  titleMap.forEach((group, key) => {
    if (group.length === 1) {
      // Одна заметка - добавляем как есть
      result.push(group[0]);
    } else {
      // Несколько заметок - сортируем по updatedAt и берем самую свежую
      const sorted = group.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      result.push(sorted[0]);
      console.warn(`Deduplicated ${group.length} copies of "${group[0].title}", kept the most recent`);
    }
  });

  return result;
}

export function useStorage() {
  const notes = ref<Note[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const { isOnline } = useNetworkStatus();

  const loadNotes = async (): Promise<void> => {
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

          // Дедупликация: удаляем дубликаты по title для специальных заметок
          const deduplicatedNotes = deduplicateNotes(mergedNotes);

          notes.value = deduplicatedNotes;
          await offlineStore.saveToCache(deduplicatedNotes);
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

  const loadFromStorage = async (): Promise<void> => {
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
