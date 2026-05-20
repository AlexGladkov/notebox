# План рефакторинга: Frontend State Management - Store Patterns

## Резюме

**Цель:** Унифицировать паттерны управления состоянием во frontend-части приложения.

**Проблема:** В проекте используется 5 разных паттернов управления состоянием:
1. Reactive singleton (authStore)
2. Singleton с `_instance` (useTabs, useTheme)  
3. Module-level ref (networkStatus)
4. Локальные ref в composables (useTags, useReminders, useDatabases)
5. Внешние ref через параметры (useNotes, useFolders)

**Последствия:**
- Дублирование состояния между App.vue и MainView.vue
- Данные не шарятся между компонентами (useTags, useReminders, useDatabases создают новый экземпляр при каждом вызове)
- Множественные API-запросы при каждом монтировании
- Непредсказуемое поведение при одновременном изменении данных

**Решение:** Внедрить Pinia и создать единообразные stores для всех доменов данных.

---

## Приоритеты изменений

| Приоритет | Описание |
|-----------|----------|
| **Critical** | Дублирование состояния, приводящее к рассинхронизации |
| **High** | Composables без shared state |
| **Medium** | Нестандартный API stores |
| **Low** | Косметические улучшения |

---

## Шаги рефакторинга

### Группа 1: Инфраструктура Pinia (Critical)

#### Шаг 1.1: Установить Pinia
**Файл:** `package.json`  
**Изменение:** Добавить зависимость `pinia`
```json
"dependencies": {
  "pinia": "^2.1.0",
  ...
}
```
**Команда:** `npm install pinia`

#### Шаг 1.2: Инициализировать Pinia в приложении
**Файл:** `src/main.ts`  
**Изменение:** Создать и подключить Pinia instance
```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import AppWrapper from './AppWrapper.vue';
import router from './router';

const app = createApp(AppWrapper);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.mount('#app');
```

#### Шаг 1.3: Создать индексный файл stores
**Файл:** `src/stores/index.ts` (создать)  
**Содержимое:**
```typescript
export { useAuthStore } from './authStore';
export { useNotesStore } from './notesStore';
export { useTagsStore } from './tagsStore';
export { useRemindersStore } from './remindersStore';
export { useDatabasesStore } from './databasesStore';
export { useUIStore } from './uiStore';
```

---

### Группа 2: Миграция authStore (High)

#### Шаг 2.1: Конвертировать authStore в Pinia defineStore
**Файл:** `src/stores/authStore.ts`  
**Изменение:** Переписать на Pinia Options API

**До:**
```typescript
const state = reactive<AuthState>({...});
export const authStore = { state: computed(() => state), ... };
```

**После:**
```typescript
import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    isInitialized: false,
    sessionExpired: false
  }),
  
  getters: {
    isAuthenticated: (state) => state.user !== null,
    isDemoUser: (state) => state.user?.email === 'demo@notebox.app'
  },
  
  actions: {
    async checkAuth() { ... },
    async logout() { ... },
    setUser(user: User | null) { ... },
    setSessionExpired(expired: boolean) { ... },
    async updateProfile(request: UpdateUserRequest) { ... }
  }
});
```

#### Шаг 2.2: Обновить composable useAuth
**Файл:** `src/composables/useAuth.ts`  
**Изменение:** Использовать новый Pinia store

**После:**
```typescript
import { storeToRefs } from 'pinia';
import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const store = useAuthStore();
  const { user, isAuthenticated, isLoading, isInitialized, sessionExpired, isDemoUser } = storeToRefs(store);
  
  return {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    sessionExpired,
    isDemoUser,
    checkAuth: store.checkAuth,
    logout: store.logout,
    setSessionExpired: store.setSessionExpired
  };
}
```

---

### Группа 3: Notes Store - устранение дублирования (Critical)

#### Шаг 3.1: Создать notesStore
**Файл:** `src/stores/notesStore.ts` (создать)  
**Содержимое:**
```typescript
import { defineStore } from 'pinia';
import type { Note } from '../types';
import { notesApi } from '../api';
import { offlineStore } from '../services/offline/offlineStore';
import { indexedDbService } from '../services/offline/indexedDb';

function deduplicateNotes(notes: Note[]): Note[] {
  // ... логика дедупликации из useStorage.ts
}

export const useNotesStore = defineStore('notes', {
  state: () => ({
    notes: [] as Note[],
    loading: false,
    error: null as string | null,
    expandedNotes: new Set<string>()
  }),

  getters: {
    rootNotes: (state) => state.notes.filter(n => !n.parentId),
    getNoteById: (state) => (id: string) => state.notes.find(n => n.id === id),
    getChildNotes: (state) => (parentId: string) => state.notes.filter(n => n.parentId === parentId)
  },

  actions: {
    async loadNotes(isOnline: boolean) { ... },
    async createNote(note: Partial<Note>) { ... },
    async updateNote(id: string, updates: Partial<Note>) { ... },
    async deleteNote(id: string) { ... },
    toggleExpand(noteId: string) { ... }
  }
});
```

#### Шаг 3.2: Рефакторинг useStorage.ts
**Файл:** `src/composables/useStorage.ts`  
**Изменение:** Сделать обёрткой над notesStore

```typescript
import { storeToRefs } from 'pinia';
import { useNotesStore } from '../stores/notesStore';
import { useNetworkStatus } from './useNetworkStatus';

export function useStorage() {
  const store = useNotesStore();
  const { notes, loading, error } = storeToRefs(store);
  const { isOnline } = useNetworkStatus();

  const loadNotes = async () => {
    await store.loadNotes(isOnline.value);
  };

  return { notes, loading, error, loadNotes, loadFromStorage: loadNotes };
}
```

#### Шаг 3.3: Рефакторинг useNotes.ts
**Файл:** `src/composables/useNotes.ts`  
**Изменение:** Использовать notesStore вместо внешнего ref

```typescript
import { useNotesStore } from '../stores/notesStore';

export function useNotes() {
  const store = useNotesStore();
  
  return {
    createNote: store.createNote,
    updateNote: store.updateNote,
    deleteNote: store.deleteNote,
    getNoteById: store.getNoteById
  };
}
```

#### Шаг 3.4: Рефакторинг useFolders.ts  
**Файл:** `src/composables/useFolders.ts`  
**Изменение:** Использовать notesStore

```typescript
import { useNotesStore } from '../stores/notesStore';
import { computed } from 'vue';

export function useFolders() {
  const store = useNotesStore();
  
  const folders = computed(() => store.notes.filter(n => n.isFolder));
  
  return {
    folders,
    createFolder: (name: string, parentId?: string) => store.createNote({ 
      title: name, 
      isFolder: true, 
      parentId 
    }),
    // ... остальные методы
  };
}
```

---

### Группа 4: Tags Store (High)

#### Шаг 4.1: Создать tagsStore
**Файл:** `src/stores/tagsStore.ts` (создать)  
**Содержимое:**
```typescript
import { defineStore } from 'pinia';
import type { Tag } from '../types';
import { tagsApi } from '../api';
import { TAG_COLOR_PALETTE } from '../types/database';

export const useTagsStore = defineStore('tags', {
  state: () => ({
    tags: [] as Tag[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    getTagById: (state) => (id: string) => state.tags.find(t => t.id === id),
    getNextColor: (state) => () => TAG_COLOR_PALETTE[state.tags.length % TAG_COLOR_PALETTE.length].name
  },

  actions: {
    async loadTags() { ... },
    async createTag(name: string, color?: string) { ... },
    async updateTag(id: string, name?: string, color?: string) { ... },
    async deleteTag(id: string) { ... },
    async setNoteTags(noteId: string, tagIds: string[]) { ... },
    getTagColors(colorNameOrHex: string, isDark: boolean) { ... }
  }
});
```

#### Шаг 4.2: Рефакторинг useTags.ts
**Файл:** `src/composables/useTags.ts`  
**Изменение:** Сделать обёрткой над tagsStore

```typescript
import { storeToRefs } from 'pinia';
import { useTagsStore } from '../stores/tagsStore';

export function useTags() {
  const store = useTagsStore();
  const { tags, loading, error } = storeToRefs(store);

  return {
    tags,
    loading,
    error,
    loadTags: store.loadTags,
    createTag: store.createTag,
    updateTag: store.updateTag,
    deleteTag: store.deleteTag,
    setNoteTags: store.setNoteTags,
    findOrCreateTag: async (name: string) => {
      const existing = store.getTagById(name);
      return existing || store.createTag(name);
    },
    getTagColors: store.getTagColors
  };
}
```

---

### Группа 5: Reminders Store (High)

#### Шаг 5.1: Создать remindersStore
**Файл:** `src/stores/remindersStore.ts` (создать)  
**Содержимое:**
```typescript
import { defineStore } from 'pinia';
import type { Reminder, CreateReminderRequest, UpdateReminderRequest } from '../types/reminder';
import { remindersApi } from '../api/reminders';
import { getErrorMessage } from '../types/composables';

export const useRemindersStore = defineStore('reminders', {
  state: () => ({
    reminders: [] as Reminder[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    getRemindersByNoteId: (state) => (noteId: string) => 
      state.reminders.filter(r => r.noteId === noteId),
    upcomingReminders: (state) => 
      state.reminders
        .filter(r => new Date(r.remindAt) > new Date())
        .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
  },

  actions: {
    async fetchReminders() { ... },
    async createReminder(request: CreateReminderRequest) { ... },
    async updateReminder(id: string, request: UpdateReminderRequest) { ... },
    async deleteReminder(id: string) { ... }
  }
});
```

#### Шаг 5.2: Рефакторинг useReminders.ts
**Файл:** `src/composables/useReminders.ts`  
**Изменение:** Сделать обёрткой над remindersStore

```typescript
import { storeToRefs } from 'pinia';
import { useRemindersStore } from '../stores/remindersStore';

export function useReminders() {
  const store = useRemindersStore();
  const { reminders, loading, error } = storeToRefs(store);

  return {
    reminders,
    loading,
    error,
    fetchReminders: store.fetchReminders,
    fetchRemindersByNoteId: (noteId: string) => store.getRemindersByNoteId(noteId),
    createReminder: store.createReminder,
    updateReminder: store.updateReminder,
    deleteReminder: store.deleteReminder,
    getUpcomingReminders: () => store.upcomingReminders
  };
}
```

---

### Группа 6: Databases Store (High)

#### Шаг 6.1: Создать databasesStore
**Файл:** `src/stores/databasesStore.ts` (создать)  
**Содержимое:**
```typescript
import { defineStore } from 'pinia';
import type { Database, DatabaseRecord } from '../types/database';
import { databasesApi, recordsApi, columnsApi, viewsApi } from '../api';

export const useDatabasesStore = defineStore('databases', {
  state: () => ({
    databases: [] as Database[],
    records: [] as DatabaseRecord[],
    loading: false,
    error: null as string | null
  }),

  getters: {
    getDatabaseById: (state) => (id: string) => state.databases.find(d => d.id === id),
    getRecordsByDatabaseId: (state) => (dbId: string) => 
      state.records.filter(r => r.databaseId === dbId)
  },

  actions: {
    async loadDatabases() { ... },
    async loadDatabase(id: string) { ... },
    async createDatabase(data: Partial<Database>) { ... },
    async updateDatabase(id: string, data: Partial<Database>) { ... },
    async deleteDatabase(id: string) { ... },
    
    async loadRecords(databaseId: string) { ... },
    async createRecord(databaseId: string, data: Record<string, unknown>) { ... },
    async updateRecord(id: string, data: Record<string, unknown>) { ... },
    async deleteRecord(id: string) { ... },
    
    async addColumn(databaseId: string, column: Partial<Column>) { ... },
    async updateColumn(databaseId: string, columnId: string, data: Partial<Column>) { ... },
    async deleteColumn(databaseId: string, columnId: string) { ... },
    
    async createView(databaseId: string, view: Partial<View>) { ... },
    async updateView(databaseId: string, viewId: string, data: Partial<View>) { ... },
    async deleteView(databaseId: string, viewId: string) { ... }
  }
});
```

#### Шаг 6.2: Рефакторинг useDatabases.ts
**Файл:** `src/composables/useDatabases.ts`  
**Изменение:** Сделать обёрткой над databasesStore

```typescript
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useDatabasesStore } from '../stores/databasesStore';

export function useDatabases() {
  const store = useDatabasesStore();
  const { databases, records, loading, error } = storeToRefs(store);

  return {
    databases,
    records,
    loading,
    error,
    
    loadDatabases: store.loadDatabases,
    loadDatabase: store.loadDatabase,
    createDatabase: store.createDatabase,
    updateDatabase: store.updateDatabase,
    deleteDatabase: store.deleteDatabase,
    getDatabaseById: store.getDatabaseById,
    
    loadRecords: store.loadRecords,
    createRecord: store.createRecord,
    updateRecord: store.updateRecord,
    deleteRecord: store.deleteRecord,
    getRecordsByDatabaseId: store.getRecordsByDatabaseId,
    
    addColumn: store.addColumn,
    updateColumn: store.updateColumn,
    deleteColumn: store.deleteColumn,
    
    createView: store.createView,
    updateView: store.updateView,
    deleteView: store.deleteView,
    
    batchCreateRecords: async (dbId: string, records: unknown[]) => {
      for (const record of records) {
        await store.createRecord(dbId, record as Record<string, unknown>);
      }
    },
    batchDeleteRecords: async (ids: string[]) => {
      for (const id of ids) {
        await store.deleteRecord(id);
      }
    }
  };
}
```

#### Шаг 6.3: Удалить вложенные database composables
**Файлы для удаления:**
- `src/composables/database/useDatabasesCrud.ts`
- `src/composables/database/useRecordsCrud.ts`
- `src/composables/database/useColumnsCrud.ts`
- `src/composables/database/useViewsCrud.ts`
- `src/composables/database/useRecordsBatch.ts`

**Файл:** `src/composables/database/index.ts`  
**Изменение:** Переэкспортировать из основного composable

```typescript
export { useDatabases } from '../useDatabases';
```

---

### Группа 7: UI Store (Medium)

#### Шаг 7.1: Создать uiStore
**Файл:** `src/stores/uiStore.ts` (создать)  
**Содержимое:**
```typescript
import { defineStore } from 'pinia';

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
    activeModal: null as string | null
  }),

  getters: {
    activeTab: (state) => state.tabs.find(t => t.id === state.activeTabId),
    effectiveTheme: (state) => {
      if (state.themeMode === 'system') {
        return state.systemPrefersDark ? 'dark' : 'light';
      }
      return state.themeMode;
    }
  },

  actions: {
    // Tabs
    openTab(noteId: string, title: string, forceNew = false) { ... },
    closeTab(tabId: string) { ... },
    closeOtherTabs(tabId: string) { ... },
    closeAllTabs() { ... },
    setActiveTab(tabId: string) { ... },
    moveTab(fromIndex: number, toIndex: number) { ... },
    updateTabTitle(noteId: string, title: string) { ... },
    removeTabsByNoteId(noteId: string) { ... },
    
    // Theme
    initializeTheme() { ... },
    setTheme(mode: ThemeMode) { ... },
    cycleTheme() { ... },
    
    // Search
    setSearchQuery(query: string) { ... },
    
    // Modals
    openModal(modalId: string) { ... },
    closeModal() { ... }
  }
});
```

#### Шаг 7.2: Рефакторинг useTabs.ts
**Файл:** `src/composables/useTabs.ts`  
**Изменение:** Сделать обёрткой над uiStore

```typescript
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUIStore } from '../stores/uiStore';
import { useNotesStore } from '../stores/notesStore';

export function useTabs() {
  const uiStore = useUIStore();
  const notesStore = useNotesStore();
  const { tabs, activeTabId } = storeToRefs(uiStore);

  const openTab = (noteId: string, forceNew = false) => {
    const note = notesStore.getNoteById(noteId);
    if (note) {
      uiStore.openTab(noteId, note.title, forceNew);
    }
  };

  const getActiveNote = () => {
    const tab = uiStore.activeTab;
    return tab ? notesStore.getNoteById(tab.noteId) : undefined;
  };

  return {
    tabs: computed(() => tabs.value),
    activeTabId: computed(() => activeTabId.value),
    openTab,
    closeTab: uiStore.closeTab,
    closeOtherTabs: uiStore.closeOtherTabs,
    closeAllTabs: uiStore.closeAllTabs,
    setActiveTab: uiStore.setActiveTab,
    moveTab: uiStore.moveTab,
    getActiveNote,
    updateTabTitle: uiStore.updateTabTitle,
    removeTabsByNoteId: uiStore.removeTabsByNoteId,
    removeTabsByFolderIds: (folderIds: string[]) => {
      tabs.value
        .filter(tab => {
          const note = notesStore.getNoteById(tab.noteId);
          return note && note.parentId && folderIds.includes(note.parentId);
        })
        .forEach(tab => uiStore.closeTab(tab.id));
    },
    getTabIndex: (tabId: string) => tabs.value.findIndex(t => t.id === tabId)
  };
}
```

#### Шаг 7.3: Рефакторинг useTheme.ts
**Файл:** `src/composables/useTheme.ts`  
**Изменение:** Сделать обёрткой над uiStore

```typescript
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useUIStore } from '../stores/uiStore';

export function useTheme() {
  const store = useUIStore();
  const { themeMode, effectiveTheme } = storeToRefs(store);

  return {
    themeMode: computed(() => themeMode.value),
    effectiveTheme,
    cycleTheme: store.cycleTheme,
    setTheme: store.setTheme,
    initialize: store.initializeTheme
  };
}
```

---

### Группа 8: Обновление компонентов (Critical)

#### Шаг 8.1: Убрать дублирование в App.vue
**Файл:** `src/App.vue`  
**Изменение:** Убрать локальное состояние notes, использовать store

```typescript
// Убрать:
// const { notes } = useStorage();

// Добавить:
import { useNotesStore } from './stores/notesStore';
import { storeToRefs } from 'pinia';

const notesStore = useNotesStore();
const { notes } = storeToRefs(notesStore);

onMounted(() => {
  notesStore.loadNotes(isOnline.value);
});
```

#### Шаг 8.2: Убрать дублирование в MainView.vue
**Файл:** `src/views/MainView.vue`  
**Изменение:** Использовать stores напрямую, убрать локальное состояние

```typescript
import { useNotesStore } from '../stores/notesStore';
import { useTagsStore } from '../stores/tagsStore';
import { useUIStore } from '../stores/uiStore';
import { storeToRefs } from 'pinia';

const notesStore = useNotesStore();
const tagsStore = useTagsStore();
const uiStore = useUIStore();

const { notes, rootNotes, expandedNotes } = storeToRefs(notesStore);
const { tags } = storeToRefs(tagsStore);
const { searchQuery, tabs, activeTabId } = storeToRefs(uiStore);
```

#### Шаг 8.3: Обновить useSearch.ts
**Файл:** `src/composables/useSearch.ts`  
**Изменение:** Использовать notesStore

```typescript
import { computed } from 'vue';
import { useNotesStore } from '../stores/notesStore';
import { useUIStore } from '../stores/uiStore';
import { storeToRefs } from 'pinia';

export function useSearch() {
  const notesStore = useNotesStore();
  const uiStore = useUIStore();
  const { notes } = storeToRefs(notesStore);
  const { searchQuery } = storeToRefs(uiStore);

  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) return [];
    const query = searchQuery.value.toLowerCase();
    return notes.value.filter(note => 
      note.title.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    );
  });

  return {
    searchQuery,
    searchResults,
    setSearchQuery: uiStore.setSearchQuery
  };
}
```

---

## Файлы для изменения

| Файл | Тип изменения | Приоритет |
|------|---------------|-----------|
| `package.json` | Добавить pinia | Critical |
| `src/main.ts` | Инициализация Pinia | Critical |
| `src/stores/authStore.ts` | Переписать на Pinia | High |
| `src/stores/notesStore.ts` | Создать | Critical |
| `src/stores/tagsStore.ts` | Создать | High |
| `src/stores/remindersStore.ts` | Создать | High |
| `src/stores/databasesStore.ts` | Создать | High |
| `src/stores/uiStore.ts` | Создать | Medium |
| `src/stores/index.ts` | Создать | Critical |
| `src/composables/useAuth.ts` | Обновить | High |
| `src/composables/useStorage.ts` | Обновить | Critical |
| `src/composables/useNotes.ts` | Обновить | Critical |
| `src/composables/useFolders.ts` | Обновить | Critical |
| `src/composables/useTags.ts` | Обновить | High |
| `src/composables/useReminders.ts` | Обновить | High |
| `src/composables/useDatabases.ts` | Обновить | High |
| `src/composables/useTabs.ts` | Обновить | Medium |
| `src/composables/useTheme.ts` | Обновить | Medium |
| `src/composables/useSearch.ts` | Обновить | Medium |
| `src/App.vue` | Обновить | Critical |
| `src/views/MainView.vue` | Обновить | Critical |

---

## Файлы для создания

| Файл | Назначение |
|------|------------|
| `src/stores/notesStore.ts` | Централизованное состояние заметок |
| `src/stores/tagsStore.ts` | Централизованное состояние тегов |
| `src/stores/remindersStore.ts` | Централизованное состояние напоминаний |
| `src/stores/databasesStore.ts` | Централизованное состояние баз данных |
| `src/stores/uiStore.ts` | UI состояние (tabs, theme, search, modals) |
| `src/stores/index.ts` | Индексный файл экспортов |

---

## Файлы для удаления

| Файл | Причина |
|------|---------|
| `src/composables/database/useDatabasesCrud.ts` | Логика перенесена в databasesStore |
| `src/composables/database/useRecordsCrud.ts` | Логика перенесена в databasesStore |
| `src/composables/database/useColumnsCrud.ts` | Логика перенесена в databasesStore |
| `src/composables/database/useViewsCrud.ts` | Логика перенесена в databasesStore |
| `src/composables/database/useRecordsBatch.ts` | Логика перенесена в databasesStore |

---

## Миграционные шаги

1. **Установка Pinia** - не требует миграции данных
2. **Создание stores** - параллельно с существующим кодом
3. **Обновление composables** - сохранить обратную совместимость API
4. **Обновление компонентов** - постепенная миграция

---

## Стратегия тестирования

### 1. Проверка реактивности
- Открыть несколько вкладок браузера
- Изменить данные в одной вкладке
- Убедиться, что изменения видны во всех вкладках

### 2. Проверка singleton-поведения
- Добавить `console.log` в конструктор каждого store
- Убедиться, что каждый store создаётся только один раз

### 3. Проверка API-запросов
- Открыть Network tab в DevTools
- Убедиться, что данные загружаются один раз при старте
- Убедиться, что повторные монтирования компонентов не вызывают повторных запросов

### 4. Регрессионное тестирование
- Создание/редактирование/удаление заметок
- Работа с тегами
- Создание напоминаний
- Работа с базами данных (DatabaseBlock)
- Переключение вкладок
- Смена темы
- Поиск

### 5. Проверка DevTools
- Установить Vue DevTools
- Открыть Pinia tab
- Убедиться, что все stores видны и их состояние корректно

---

## Оценка рисков

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Регрессии в компонентах | Средняя | Высокое | Сохранить API composables, тестировать каждый компонент |
| Проблемы с реактивностью | Низкая | Высокое | Использовать `storeToRefs` для сохранения реактивности |
| Конфликты при merge | Низкая | Среднее | Делать небольшие коммиты, тестировать после каждого шага |
| Увеличение bundle size | Низкая | Низкое | Pinia ~1.5KB gzipped, минимальное влияние |

---

## Порядок выполнения

1. **Шаги 1.1-1.3** - Инфраструктура Pinia
2. **Шаги 3.1-3.4** - Notes Store (устранение критического дублирования)
3. **Шаги 8.1-8.2** - Обновление App.vue и MainView.vue
4. **Шаги 2.1-2.2** - Auth Store
5. **Шаги 4.1-4.2** - Tags Store
6. **Шаги 5.1-5.2** - Reminders Store
7. **Шаги 6.1-6.3** - Databases Store
8. **Шаги 7.1-7.3** - UI Store
9. **Шаг 8.3** - useSearch
10. Финальное тестирование

---

*План создан: 2026-05-20*  
*Ветка: refactoring/frontend-state-management-store-patterns-cb0cf3e4*
