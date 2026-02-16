import { ref, computed } from 'vue';
import type { Note } from '../types';

export interface Tab {
  id: string;      // уникальный ID вкладки
  noteId: string;  // ID заметки
  title: string;   // название (для отображения)
}

const MAX_TABS = 50;

// Глобальное состояние вкладок
const tabs = ref<Tab[]>([]);
const activeTabId = ref<string | null>(null);
let tabCounter = 0;

export function useTabs(getNoteById: (id: string) => Note | undefined) {
  /**
   * Генерирует уникальный ID для вкладки
   */
  const generateTabId = (): string => {
    return `tab-${Date.now()}-${tabCounter++}`;
  };

  /**
   * Открывает заметку во вкладке
   * @param noteId - ID заметки
   * @param forceNew - Принудительно создать новую вкладку (для Ctrl+клик)
   */
  const openTab = (noteId: string, forceNew: boolean = false): void => {
    const note = getNoteById(noteId);
    if (!note) return;

    // Проверяем, не открыта ли уже эта заметка
    if (!forceNew) {
      const existingTab = tabs.value.find(tab => tab.noteId === noteId);
      if (existingTab) {
        activeTabId.value = existingTab.id;
        return;
      }
    }

    // Проверяем лимит вкладок
    if (tabs.value.length >= MAX_TABS) {
      console.warn(`Достигнут максимум вкладок (${MAX_TABS})`);
      alert(`Достигнуто максимальное количество вкладок (${MAX_TABS}). Закройте некоторые вкладки, чтобы открыть новые.`);
      return;
    }

    // Создаём новую вкладку
    const newTab: Tab = {
      id: generateTabId(),
      noteId: note.id,
      title: note.title,
    };

    if (forceNew || !activeTabId.value) {
      // Добавляем в конец
      tabs.value.push(newTab);
    } else {
      // Заменяем активную вкладку
      const activeIndex = tabs.value.findIndex(t => t.id === activeTabId.value);
      if (activeIndex !== -1) {
        tabs.value[activeIndex] = newTab;
      } else {
        tabs.value.push(newTab);
      }
    }

    activeTabId.value = newTab.id;
  };

  /**
   * Закрывает вкладку
   * @param tabId - ID вкладки
   */
  const closeTab = (tabId: string): void => {
    const index = tabs.value.findIndex(t => t.id === tabId);
    if (index === -1) return;

    tabs.value.splice(index, 1);

    // Если закрыли активную вкладку, активируем соседнюю
    if (activeTabId.value === tabId) {
      if (tabs.value.length === 0) {
        activeTabId.value = null;
      } else {
        // Активируем следующую вкладку справа, или последнюю
        const nextIndex = Math.min(index, tabs.value.length - 1);
        activeTabId.value = tabs.value[nextIndex].id;
      }
    }
  };

  /**
   * Закрывает все вкладки кроме указанной
   * @param tabId - ID вкладки, которую нужно оставить
   */
  const closeOtherTabs = (tabId: string): void => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (!tab) return;

    tabs.value = [tab];
    activeTabId.value = tab.id;
  };

  /**
   * Закрывает все вкладки
   */
  const closeAllTabs = (): void => {
    tabs.value = [];
    activeTabId.value = null;
  };

  /**
   * Устанавливает активную вкладку
   * @param tabId - ID вкладки
   */
  const setActiveTab = (tabId: string): void => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab) {
      activeTabId.value = tabId;
    }
  };

  /**
   * Перемещает вкладку
   * @param fromIndex - Исходный индекс
   * @param toIndex - Целевой индекс
   */
  const moveTab = (fromIndex: number, toIndex: number): void => {
    if (
      fromIndex < 0 ||
      fromIndex >= tabs.value.length ||
      toIndex < 0 ||
      toIndex >= tabs.value.length
    ) {
      return;
    }

    const [movedTab] = tabs.value.splice(fromIndex, 1);
    tabs.value.splice(toIndex, 0, movedTab);
  };

  /**
   * Получает активную заметку
   */
  const getActiveNote = (): Note | undefined => {
    if (!activeTabId.value) return undefined;
    const activeTab = tabs.value.find(t => t.id === activeTabId.value);
    if (!activeTab) return undefined;

    const note = getNoteById(activeTab.noteId);

    // Если заметка была удалена, закрываем вкладку
    if (!note) {
      closeTab(activeTab.id);
      return undefined;
    }

    return note;
  };

  /**
   * Обновляет название вкладки при изменении названия заметки
   * @param noteId - ID заметки
   * @param title - Новое название
   */
  const updateTabTitle = (noteId: string, title: string): void => {
    tabs.value.forEach(tab => {
      if (tab.noteId === noteId) {
        tab.title = title;
      }
    });
  };

  /**
   * Удаляет все вкладки с указанным noteId (при удалении заметки)
   * @param noteId - ID заметки
   */
  const removeTabsByNoteId = (noteId: string): void => {
    const tabsToClose = tabs.value.filter(t => t.noteId === noteId);
    tabsToClose.forEach(tab => closeTab(tab.id));
  };

  /**
   * Удаляет все вкладки, относящиеся к папкам из списка (при удалении папки)
   * @param folderIds - Массив ID папок
   */
  const removeTabsByFolderIds = (folderIds: string[]): void => {
    const tabsToClose = tabs.value.filter(tab => {
      const note = getNoteById(tab.noteId);
      return note && folderIds.includes(note.folderId);
    });

    tabsToClose.forEach(tab => closeTab(tab.id));
  };

  /**
   * Получает индекс вкладки
   */
  const getTabIndex = (tabId: string): number => {
    return tabs.value.findIndex(t => t.id === tabId);
  };

  return {
    tabs: computed(() => tabs.value),
    activeTabId: computed(() => activeTabId.value),
    openTab,
    closeTab,
    closeOtherTabs,
    closeAllTabs,
    setActiveTab,
    moveTab,
    getActiveNote,
    updateTabTitle,
    removeTabsByNoteId,
    removeTabsByFolderIds,
    getTabIndex,
  };
}
