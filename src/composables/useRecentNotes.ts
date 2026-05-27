import { ref, type Ref } from 'vue';

const STORAGE_KEY = 'notebox-recent-notes';
const MAX_RECENT_NOTES = 10;

interface RecentNote {
  noteId: string;
  timestamp: number;
}

export function useRecentNotes() {
  const recentNoteIds: Ref<string[]> = ref([]);

  // Загрузка из localStorage
  const loadRecentNotes = (): void => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: RecentNote[] = JSON.parse(stored);
        recentNoteIds.value = parsed
          .sort((a, b) => b.timestamp - a.timestamp)
          .map(item => item.noteId);
      }
    } catch (e) {
      console.warn('Не удалось загрузить недавние заметки из localStorage:', e);
      recentNoteIds.value = [];
    }
  };

  // Сохранение в localStorage
  const saveRecentNotes = (): void => {
    try {
      const items: RecentNote[] = recentNoteIds.value.map((noteId, index) => ({
        noteId,
        timestamp: Date.now() - index * 1000, // Сохраняем порядок
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Не удалось сохранить недавние заметки в localStorage:', e);
    }
  };

  // Добавление заметки в список недавних
  const addRecentNote = (noteId: string): void => {
    // Удаляем из текущей позиции, если уже есть
    const filtered = recentNoteIds.value.filter(id => id !== noteId);

    // Добавляем в начало
    recentNoteIds.value = [noteId, ...filtered].slice(0, MAX_RECENT_NOTES);

    saveRecentNotes();
  };

  // Удаление заметки из списка недавних (например, если заметка удалена)
  const removeRecentNote = (noteId: string): void => {
    recentNoteIds.value = recentNoteIds.value.filter(id => id !== noteId);
    saveRecentNotes();
  };

  // Инициализация
  loadRecentNotes();

  return {
    recentNoteIds,
    addRecentNote,
    removeRecentNote,
  };
}
