import { defineStore } from 'pinia';
import { watch } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Tab {
  id: string;
  noteId: string;
  title: string;
}

const MAX_TABS = 50;
const THEME_STORAGE_KEY = 'notebox-theme';

export const useUIStore = defineStore('ui', {
  state: () => ({
    // Tabs
    tabs: [] as Tab[],
    activeTabId: null as string | null,
    tabCounter: 0,

    // Theme
    themeMode: 'system' as ThemeMode,
    systemPrefersDark: false,
    themeInitialized: false,

    // Search
    searchQuery: '',

    // Modals
    activeModal: null as string | null,
  }),

  getters: {
    activeTab: (state) => state.tabs.find(t => t.id === state.activeTabId),
    effectiveTheme: (state) => {
      if (state.themeMode === 'system') {
        return state.systemPrefersDark ? 'dark' : 'light';
      }
      return state.themeMode;
    },
  },

  actions: {
    // Tabs
    generateTabId(): string {
      return `tab-${Date.now()}-${this.tabCounter++}`;
    },

    openTab(noteId: string, noteTitle: string, forceNew: boolean = false): void {
      // Проверяем, не открыта ли уже эта заметка
      if (!forceNew) {
        const existingTab = this.tabs.find(tab => tab.noteId === noteId);
        if (existingTab) {
          this.activeTabId = existingTab.id;
          return;
        }
      }

      // Проверяем лимит вкладок
      if (this.tabs.length >= MAX_TABS) {
        console.warn(`Достигнут максимум вкладок (${MAX_TABS})`);
        alert(`Достигнуто максимальное количество вкладок (${MAX_TABS}). Закройте некоторые вкладки, чтобы открыть новые.`);
        return;
      }

      // Создаём новую вкладку
      const newTab: Tab = {
        id: this.generateTabId(),
        noteId,
        title: noteTitle,
      };

      if (forceNew || !this.activeTabId) {
        // Добавляем в конец
        this.tabs.push(newTab);
      } else {
        // Заменяем активную вкладку
        const activeIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
        if (activeIndex !== -1) {
          this.tabs[activeIndex] = newTab;
        } else {
          this.tabs.push(newTab);
        }
      }

      this.activeTabId = newTab.id;
    },

    closeTab(tabId: string): void {
      const index = this.tabs.findIndex(t => t.id === tabId);
      if (index === -1) return;

      this.tabs.splice(index, 1);

      // Если закрыли активную вкладку, активируем соседнюю
      if (this.activeTabId === tabId) {
        if (this.tabs.length === 0) {
          this.activeTabId = null;
        } else {
          // Активируем следующую вкладку справа, или последнюю
          const nextIndex = Math.min(index, this.tabs.length - 1);
          this.activeTabId = this.tabs[nextIndex].id;
        }
      }
    },

    closeOtherTabs(tabId: string): void {
      const tab = this.tabs.find(t => t.id === tabId);
      if (!tab) return;

      this.tabs = [tab];
      this.activeTabId = tab.id;
    },

    closeAllTabs(): void {
      this.tabs = [];
      this.activeTabId = null;
    },

    setActiveTab(tabId: string): void {
      const tab = this.tabs.find(t => t.id === tabId);
      if (tab) {
        this.activeTabId = tabId;
      }
    },

    moveTab(fromIndex: number, toIndex: number): void {
      if (
        fromIndex < 0 ||
        fromIndex >= this.tabs.length ||
        toIndex < 0 ||
        toIndex >= this.tabs.length
      ) {
        return;
      }

      const [movedTab] = this.tabs.splice(fromIndex, 1);
      this.tabs.splice(toIndex, 0, movedTab);
    },

    updateTabTitle(noteId: string, title: string): void {
      this.tabs.forEach(tab => {
        if (tab.noteId === noteId) {
          tab.title = title;
        }
      });
    },

    removeTabsByNoteId(noteId: string): void {
      const tabsToClose = this.tabs.filter(t => t.noteId === noteId);
      tabsToClose.forEach(tab => this.closeTab(tab.id));
    },

    // Theme
    applyTheme(): void {
      const html = document.documentElement;
      if (this.effectiveTheme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    },

    cycleTheme(): void {
      const modes: ThemeMode[] = ['light', 'dark', 'system'];
      const currentIndex = modes.indexOf(this.themeMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      this.themeMode = modes[nextIndex];
    },

    setTheme(mode: ThemeMode): void {
      this.themeMode = mode;
    },

    loadTheme(): void {
      try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && ['light', 'dark', 'system'].includes(stored)) {
          this.themeMode = stored as ThemeMode;
        }
      } catch (e) {
        console.warn('localStorage недоступен, используется системная тема');
      }
    },

    saveTheme(): void {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, this.themeMode);
      } catch (e) {
        console.warn('localStorage недоступен, тема не сохранена');
      }
    },

    initSystemThemeListener(): void {
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.systemPrefersDark = mediaQuery.matches;

        const listener = (e: MediaQueryListEvent) => {
          this.systemPrefersDark = e.matches;
          this.applyTheme();
        };

        // Поддержка старого и нового API
        if (mediaQuery.addEventListener) {
          mediaQuery.addEventListener('change', listener);
        } else if ((mediaQuery as any).addListener) {
          (mediaQuery as any).addListener(listener);
        }
      } else {
        this.systemPrefersDark = false;
      }
    },

    initializeTheme(): void {
      if (this.themeInitialized) return;

      this.loadTheme();
      this.initSystemThemeListener();
      this.applyTheme();

      // Слушаем изменения localStorage из других вкладок
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === THEME_STORAGE_KEY && e.newValue) {
          const newTheme = e.newValue as ThemeMode;
          if (['light', 'dark', 'system'].includes(newTheme)) {
            this.themeMode = newTheme;
          }
        }
      });

      // Следим за изменениями и применяем тему
      watch(() => this.effectiveTheme, () => {
        this.applyTheme();
      });

      watch(() => this.themeMode, () => {
        this.saveTheme();
      });

      this.themeInitialized = true;
    },

    // Search
    setSearchQuery(query: string): void {
      this.searchQuery = query;
    },

    // Modals
    openModal(modalId: string): void {
      this.activeModal = modalId;
    },

    closeModal(): void {
      this.activeModal = null;
    },
  },
});
