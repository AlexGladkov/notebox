import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUIStore } from '../stores/uiStore';
import { useNotesStore } from '../stores/notesStore';
import { useNotes } from './useNotes';
import { useTabs } from './useTabs';
import { useTheme } from './useTheme';
import { useRecentNotes } from './useRecentNotes';
import type { CommandPaletteItem, CommandPaletteSection } from '../types/commandPalette';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

export function useCommandPalette() {
  const router = useRouter();
  const uiStore = useUIStore();
  const notesStore = useNotesStore();
  const { createNote } = useNotes();
  const { openTab } = useTabs();
  const { cycleTheme } = useTheme();
  const { recentNoteIds } = useRecentNotes();
  const { notes } = storeToRefs(notesStore);

  const query = ref('');
  const selectedIndex = ref(0);
  const previousActiveElement = ref<HTMLElement | null>(null);

  const isOpen = computed(() => uiStore.commandPaletteOpen);

  // Глобальные команды
  const commands = computed<CommandPaletteItem[]>(() => [
    {
      id: 'new-note',
      type: 'command' as const,
      title: 'Новая заметка',
      description: 'Создать новую заметку в корне',
      icon: '📝',
      shortcut: isMac ? '⌘N' : 'Ctrl+N',
      keywords: ['create', 'add', 'note', 'page', 'новая', 'создать', 'заметка'],
      action: async () => {
        const note = await createNote('Новая страница', null);
        openTab(note.id);
        close();
      },
    },
    {
      id: 'open-graph',
      type: 'command' as const,
      title: 'Граф связей',
      description: 'Открыть визуализацию связей заметок',
      icon: '🗺️',
      shortcut: isMac ? '⌘G' : 'Ctrl+G',
      keywords: ['graph', 'links', 'map', 'visualization', 'граф', 'связи', 'карта'],
      action: () => {
        router.push('/graph');
        close();
      },
    },
    {
      id: 'toggle-theme',
      type: 'command' as const,
      title: 'Переключить тему',
      description: 'Циклически переключить светлую/темную/системную тему',
      icon: '🎨',
      keywords: ['theme', 'dark', 'light', 'mode', 'тема', 'темная', 'светлая'],
      action: () => {
        cycleTheme();
      },
    },
    {
      id: 'open-settings',
      type: 'command' as const,
      title: 'Настройки',
      description: 'Открыть настройки профиля',
      icon: '⚙️',
      keywords: ['settings', 'preferences', 'profile', 'настройки', 'профиль'],
      action: () => {
        uiStore.openModal('settings');
        close();
      },
    },
  ]);

  // Недавние заметки
  const recentNotes = computed<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [];
    for (const noteId of recentNoteIds.value.slice(0, 5)) {
      const note = notesStore.getNoteById(noteId);
      if (note) {
        items.push({
          id: `recent-${note.id}`,
          type: 'note' as const,
          title: note.title || 'Без названия',
          description: note.parentId ? 'Недавняя заметка' : 'Корневая заметка',
          icon: note.icon || '📄',
          action: () => {
            openTab(note.id);
            close();
          },
        });
      }
    }
    return items;
  });

  // Fuzzy-поиск с весами
  function fuzzyMatch(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Точное совпадение в начале — максимальный вес
    if (lowerText.startsWith(lowerQuery)) return 100;

    // Содержит запрос
    if (lowerText.includes(lowerQuery)) return 50;

    // Совпадение по отдельным словам
    const queryWords = lowerQuery.split(/\s+/);
    const matchedWords = queryWords.filter(w => lowerText.includes(w));
    if (matchedWords.length === queryWords.length) return 30;
    if (matchedWords.length > 0) return 10;

    return 0;
  }

  // Поиск по заметкам
  const searchResults = computed<CommandPaletteItem[]>(() => {
    if (!query.value.trim()) {
      return [];
    }

    const q = query.value.trim();

    return notes.value
      .map(note => {
        const titleScore = fuzzyMatch(note.title || '', q);
        return { note, score: titleScore };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
      .map(item => ({
        id: `search-${item.note.id}`,
        type: 'search-result' as const,
        title: item.note.title || 'Без названия',
        description: item.note.parentId ? 'Результат поиска' : 'Корневая заметка',
        icon: item.note.icon || '📄',
        action: () => {
          openTab(item.note.id);
          close();
        },
      }));
  });

  // Фильтрация команд по запросу
  const filteredCommands = computed<CommandPaletteItem[]>(() => {
    if (!query.value.trim()) {
      return commands.value;
    }

    const q = query.value.trim();

    return commands.value
      .map(cmd => {
        const titleScore = fuzzyMatch(cmd.title, q);
        const descScore = cmd.description ? fuzzyMatch(cmd.description, q) : 0;
        const keywordsScore = cmd.keywords
          ? Math.max(...cmd.keywords.map(kw => fuzzyMatch(kw, q)))
          : 0;
        const score = Math.max(titleScore, descScore, keywordsScore);
        return { cmd, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd);
  });

  // Секции
  const sections = computed<CommandPaletteSection[]>(() => {
    const result: CommandPaletteSection[] = [];

    // Недавние заметки (только если нет поискового запроса)
    if (!query.value.trim() && recentNotes.value.length > 0) {
      result.push({
        id: 'recent',
        title: 'Недавние заметки',
        items: recentNotes.value,
      });
    }

    // Команды
    if (filteredCommands.value.length > 0) {
      result.push({
        id: 'commands',
        title: 'Команды',
        items: filteredCommands.value,
      });
    }

    // Результаты поиска
    if (searchResults.value.length > 0) {
      result.push({
        id: 'search',
        title: 'Результаты поиска',
        items: searchResults.value,
      });
    }

    return result;
  });

  // Все элементы в плоском списке
  const allItems = computed<CommandPaletteItem[]>(() => {
    return sections.value.flatMap(s => s.items);
  });

  // Выбранный элемент
  const selectedItem = computed(() => {
    return allItems.value[selectedIndex.value] || null;
  });

  // Открытие палитры
  const open = (): void => {
    previousActiveElement.value = document.activeElement as HTMLElement;
    uiStore.openCommandPalette();
    query.value = '';
    selectedIndex.value = 0;
  };

  // Закрытие палитры
  const close = (): void => {
    uiStore.closeCommandPalette();
    query.value = '';
    selectedIndex.value = 0;

    // Восстанавливаем фокус
    if (previousActiveElement.value) {
      previousActiveElement.value.focus();
      previousActiveElement.value = null;
    }
  };

  // Переключение открытия/закрытия
  const toggle = (): void => {
    if (isOpen.value) {
      close();
    } else {
      open();
    }
  };

  // Выполнение выбранного элемента
  const executeItem = (item: CommandPaletteItem): void => {
    item.action();
  };

  // Навигация вверх
  const navigateUp = (): void => {
    if (selectedIndex.value > 0) {
      selectedIndex.value--;
    }
  };

  // Навигация вниз
  const navigateDown = (): void => {
    if (selectedIndex.value < allItems.value.length - 1) {
      selectedIndex.value++;
    }
  };

  // Выполнение выбранного элемента по Enter
  const executeSelected = (): void => {
    const item = selectedItem.value;
    if (item) {
      executeItem(item);
    }
  };

  // Сброс выбранного индекса при изменении запроса
  const resetSelection = (): void => {
    selectedIndex.value = 0;
  };

  // Регистрация глобальных горячих клавиш
  function handleGlobalKeydown(e: KeyboardEvent) {
    const isMod = e.metaKey || e.ctrlKey;

    // Открытие/закрытие палитры
    if (isMod && e.key === 'k') {
      e.preventDefault();
      toggle();
      return;
    }

    // Горячие клавиши команд (только когда палитра закрыта)
    if (!isOpen.value) {
      if (isMod && e.key === 'n') {
        e.preventDefault();
        commands.value.find(c => c.id === 'new-note')?.action();
      } else if (isMod && e.key === 'g') {
        e.preventDefault();
        commands.value.find(c => c.id === 'open-graph')?.action();
      }
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleGlobalKeydown);
  });

  return {
    isOpen,
    query,
    sections,
    allItems,
    selectedIndex,
    selectedItem,
    open,
    close,
    toggle,
    executeItem,
    navigateUp,
    navigateDown,
    executeSelected,
    resetSelection,
  };
}
