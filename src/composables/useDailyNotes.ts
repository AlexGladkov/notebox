import { ref, computed } from 'vue';
import type { Note } from '../types';
import { useNotesStore } from '../stores/notesStore';

const DAILY_NOTE_PREFIX = '📅 ';
const DEFAULT_TEMPLATE = `# {{date}}

## Сегодня
-

## Заметки

`;

export function useDailyNotes() {
  const notesStore = useNotesStore();
  const currentDate = ref(new Date());

  // Форматирование даты в формат YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Форматирование даты для отображения (DD.MM.YYYY)
  const formatDisplayDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Получить название заметки для даты
  const getDailyNoteTitle = (date: Date): string => {
    return `${DAILY_NOTE_PREFIX}${formatDate(date)}`;
  };

  // Найти существующую заметку для даты
  const findDailyNote = (date: Date): Note | undefined => {
    const title = getDailyNoteTitle(date);
    return notesStore.notes.find(note => note.title === title);
  };

  // Получить или создать заметку для даты
  const getOrCreateDailyNote = async (date: Date): Promise<Note> => {
    const existingNote = findDailyNote(date);

    if (existingNote) {
      return existingNote;
    }

    // Создаем новую заметку через notesStore для правильной offline поддержки
    const title = getDailyNoteTitle(date);
    const template = localStorage.getItem('dailyNoteTemplate') || DEFAULT_TEMPLATE;
    const content = template.replace('{{date}}', formatDisplayDate(date));

    const newNote = await notesStore.createNote({
      title,
      content,
      icon: '📅',
      parentId: null,
    });

    return newNote;
  };

  // Получить заметку для текущей даты
  const getCurrentDailyNote = computed(() => {
    return findDailyNote(currentDate.value);
  });

  // Переход к предыдущему дню
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate.value);
    newDate.setDate(newDate.getDate() - 1);
    currentDate.value = newDate;
  };

  // Переход к следующему дню
  const goToNextDay = () => {
    const newDate = new Date(currentDate.value);
    newDate.setDate(newDate.getDate() + 1);
    currentDate.value = newDate;
  };

  // Переход к сегодняшнему дню
  const goToToday = () => {
    currentDate.value = new Date();
  };

  // Переход к определенной дате
  const goToDate = (date: Date) => {
    currentDate.value = date;
  };

  // Проверка, является ли выбранная дата сегодняшней
  const isToday = computed(() => {
    const today = new Date();
    return formatDate(currentDate.value) === formatDate(today);
  });

  // Получить все ежедневные заметки
  const getAllDailyNotes = computed(() => {
    return notesStore.notes
      .filter(note => note.title.startsWith(DAILY_NOTE_PREFIX))
      .sort((a, b) => b.title.localeCompare(a.title)); // Сортировка по дате (новые сверху)
  });

  // Сохранить шаблон
  const saveTemplate = (template: string) => {
    localStorage.setItem('dailyNoteTemplate', template);
  };

  // Получить текущий шаблон
  const getTemplate = (): string => {
    return localStorage.getItem('dailyNoteTemplate') || DEFAULT_TEMPLATE;
  };

  return {
    currentDate,
    getCurrentDailyNote,
    getOrCreateDailyNote,
    findDailyNote,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    goToDate,
    isToday,
    formatDate,
    formatDisplayDate,
    getAllDailyNotes,
    saveTemplate,
    getTemplate,
  };
}
