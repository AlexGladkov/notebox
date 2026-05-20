# Анализ рефакторинга: Frontend Composables - Error Handling и Typing

**Дата анализа:** 2026-05-20  
**Область:** Vue 3 Composables  
**Цель:** Добавить proper error handling, типизировать все параметры и return types, убрать any, добавить loading/error states

---

## 1. Обзор текущей архитектуры

### 1.1 Структура composables

```
src/composables/
├── database/
│   ├── index.ts                    # Реэкспорт
│   ├── useColumnsCrud.ts           # CRUD для колонок базы данных
│   ├── useDatabasesCrud.ts         # CRUD для баз данных
│   ├── useRecordsBatch.ts          # Пакетные операции с записями
│   ├── useRecordsCrud.ts           # CRUD для записей
│   └── useViewsCrud.ts             # CRUD для view
├── utils/
│   ├── index.ts                    # Реэкспорт
│   ├── useCrud.ts                  # Универсальный CRUD хелпер
│   └── useLocalStorageFallback.ts  # Fallback для localStorage
├── useAI.ts                        # AI функционал (summarize, expand)
├── useAuth.ts                      # Аутентификация
├── useBacklinks.ts                 # Обратные ссылки
├── useCalendarSync.ts              # Синхронизация с Google Calendar
├── useDatabases.ts                 # Композиция database composables
├── useFolders.ts                   # Работа с папками
├── useGraph.ts                     # Граф заметок
├── useNetworkStatus.ts             # Статус сети
├── useNotes.ts                     # Работа с заметками
├── useOffline.ts                   # Оффлайн функционал
├── usePushNotifications.ts         # Push-уведомления
├── useQuickCapture.ts              # Быстрый захват заметок
├── useReminders.ts                 # Напоминания
├── useSearch.ts                    # Поиск
├── useSpeechRecognition.ts         # Распознавание речи
├── useStorage.ts                   # Хранилище заметок
├── useTabs.ts                      # Управление вкладками
├── useTags.ts                      # Работа с тегами
├── useTemplates.ts                 # Шаблоны заметок
└── useTheme.ts                     # Тема приложения
```

**Всего: 26 composable файлов**

### 1.2 Текущие паттерны

#### Хороший паттерн (с loading/error):
```typescript
// useTags.ts, useAI.ts, useReminders.ts, useDatabasesCrud.ts
const loading = ref(false);
const error = ref<string | null>(null);

const someMethod = async () => {
  loading.value = true;
  error.value = null;
  try {
    // ...
  } catch (err) {
    error.value = 'Сообщение об ошибке';
    throw err;
  } finally {
    loading.value = false;
  }
};
```

#### Проблемный паттерн (без состояний):
```typescript
// useNotes.ts, useFolders.ts
const someMethod = async () => {
  try {
    // ...
  } catch (err) {
    console.error('Failed:', err);
    throw err;
  }
};
```

---

## 2. Выявленные проблемы

### 2.1 Использование `any` (14 случаев)

| Файл | Строка | Проблема |
|------|--------|----------|
| `useRecordsCrud.ts` | 32 | `data: { [columnId: string]: any }` |
| `useRecordsCrud.ts` | 47 | `data: { [columnId: string]: any }` |
| `useRecordsBatch.ts` | 10 | `recordsData: Array<{ [columnId: string]: any }>` |
| `useCalendarSync.ts` | 15 | `catch (e: any)` |
| `usePushNotifications.ts` | 27, 43, 90, 110 | `catch (e: any)` |
| `useReminders.ts` | 15, 28, 44, 63, 78, 92 | `catch (e: any)` |

**Причина:** Динамические данные записей базы данных (`Record.data`) не имеют строгой типизации, а catch блоки используют `any` для доступа к `e.message`.

### 2.2 Отсутствие loading/error состояний

| Composable | loading | error | Комментарий |
|------------|---------|-------|-------------|
| `useNotes` | ❌ | ❌ | Критично - основной composable |
| `useFolders` | ❌ | ❌ | Критично - CRUD операции |
| `useAuth` | ✅* | ❌ | Делегирует в authStore |
| `useSearch` | ❌ | ❌ | Синхронный - не требует |
| `useBacklinks` | ❌ | ❌ | Computed - не требует |
| `useGraph` | ✅ | ❌ | Есть isCalculating |
| `useNetworkStatus` | ❌ | ❌ | Делегирует в сервис |
| `useTabs` | ❌ | ❌ | Синхронный - не требует |
| `useTheme` | ❌ | ❌ | Синхронный - не требует |
| `useColumnsCrud` | ❌ | ✅ | Нужен loading |
| `useViewsCrud` | ❌ | ✅ | Нужен loading |
| `useRecordsBatch` | ❌ | ✅ | Нужен loading |

**Composables с правильным паттерном (имеют loading + error):**
- `useTags`
- `useAI`
- `useReminders`
- `useDatabasesCrud`
- `useRecordsCrud`
- `useStorage`
- `useOffline`
- `useCalendarSync`
- `usePushNotifications`
- `useQuickCapture`
- `useSpeechRecognition`
- `useTemplates`

### 2.3 Отсутствие return types

**Проблемные файлы (нет явных return types):**

1. **useNotes.ts** - 15 методов без return types
2. **useFolders.ts** - 6 методов без return types
3. **useTabs.ts** - 12 методов без return types
4. **useRecordsCrud.ts** - 5 методов без return types
5. **useRecordsBatch.ts** - 2 метода без return types
6. **useColumnsCrud.ts** - 3 метода без return types
7. **useViewsCrud.ts** - 3 метода без return types
8. **useDatabasesCrud.ts** - 6 методов без return types

**Файлы с хорошей типизацией:**

1. **useBacklinks.ts** - есть `UseBacklinksReturn` интерфейс
2. **useGraph.ts** - есть `UseGraphReturn` интерфейс
3. **useCrud.ts** - есть `CrudApi<T>` и `CrudOptions` интерфейсы

### 2.4 Несогласованная обработка ошибок

**Паттерн 1: Только console.error + throw:**
```typescript
// useNotes.ts, useFolders.ts
} catch (err) {
  console.error('Failed to create note:', err);
  throw err;
}
```

**Паттерн 2: error.value + console.error + throw:**
```typescript
// useTags.ts, useReminders.ts
} catch (err) {
  console.error('Failed to load tags:', err);
  error.value = 'Не удалось загрузить теги';
  throw err;
}
```

**Паттерн 3: error.value + console.error + return null:**
```typescript
// useAI.ts
} catch (err) {
  error.value = 'Ошибка при суммаризации текста';
  console.error('Summarize error:', err);
  return null;
}
```

### 2.5 Типизация параметров функций

**Проблемы:**

1. **useNotes.ts:33** - `createNote(title: string, parentId?: string | null)` - правильно
2. **useNotes.ts:49** - `updateNote(id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>)` - правильно
3. **useTabs.ts:35** - `useTabs(getNoteById: (id: string) => Note | undefined)` - правильно

**Но отсутствуют return types везде!**

---

## 3. Граф зависимостей

```
App.vue
├── useStorage
│   └── useNetworkStatus
├── useNotes (принимает notes из useStorage)
├── useSearch (принимает notes и searchQuery)
├── useTheme
└── useTabs (принимает getNoteById)

MainView.vue
├── useStorage
├── useNotes
├── useSearch
├── useTheme
├── useTabs
├── useAuth
├── useTags
└── useBacklinks

BlockEditor.vue
├── useDatabases
│   ├── useDatabasesCrud
│   ├── useColumnsCrud
│   ├── useRecordsCrud
│   ├── useRecordsBatch
│   └── useViewsCrud
└── useAI

NoteEditor.vue
└── useReminders

NoteTags.vue, NoteTree.vue, TagFilter.vue
├── useTags
└── useTheme

SyncStatusIndicator.vue
├── useNetworkStatus
└── useOffline

GraphView.vue
└── useGraph
```

---

## 4. Файлы, затрагиваемые рефакторингом

### 4.1 Критические (требуют существенных изменений)

| Файл | Изменения |
|------|-----------|
| `useNotes.ts` | + loading/error, + return types, типизация |
| `useFolders.ts` | + loading/error, + return types |
| `useRecordsCrud.ts` | Убрать `any` в data, + return types |
| `useRecordsBatch.ts` | Убрать `any` в data, + loading, + return types |
| `useColumnsCrud.ts` | + loading, + return types |
| `useViewsCrud.ts` | + loading, + return types |
| `useReminders.ts` | Убрать `catch (e: any)`, + return types |
| `usePushNotifications.ts` | Убрать `catch (e: any)`, + return types |
| `useCalendarSync.ts` | Убрать `catch (e: any)`, + return types |

### 4.2 Средние (требуют типизации)

| Файл | Изменения |
|------|-----------|
| `useTabs.ts` | + return types для всех методов |
| `useDatabasesCrud.ts` | + return types для всех методов |
| `useTags.ts` | + return types для всех методов |
| `useStorage.ts` | + return types |
| `useOffline.ts` | + return types |
| `useQuickCapture.ts` | + return types |
| `useSpeechRecognition.ts` | + return types |
| `useTemplates.ts` | + return types |
| `useAI.ts` | + return types |
| `useTheme.ts` | + return types |

### 4.3 Минимальные (уже хорошо типизированы)

| Файл | Изменения |
|------|-----------|
| `useBacklinks.ts` | Уже имеет `UseBacklinksReturn` |
| `useGraph.ts` | Уже имеет `UseGraphReturn` |
| `useCrud.ts` | Уже имеет типы |
| `useLocalStorageFallback.ts` | + return type |
| `useAuth.ts` | + return type |
| `useNetworkStatus.ts` | + return type |
| `useSearch.ts` | + return type |

---

## 5. Новые типы для создания

### 5.1 Общие типы для composables

```typescript
// src/types/composables.ts

// Базовый тип для состояния асинхронных операций
export interface AsyncState {
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

// Типизированная ошибка для catch блоков
export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
}

// Хелпер для типизации catch
export function isAppError(error: unknown): error is AppError {
  return typeof error === 'object' && error !== null && 'message' in error;
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Неизвестная ошибка';
}
```

### 5.2 Типизация данных записей

```typescript
// src/types/database.ts

// Типизированные значения ячеек
export type CellValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | string[] // для MULTI_SELECT
  | FileCellValue[] // для FILE
  | null;

// Типизированные данные записи
export type RecordData = Record<string, CellValue>;

// Вместо { [columnId: string]: any }
export interface TypedRecord {
  id: string;
  databaseId: string;
  data: RecordData;
  createdAt: number;
  updatedAt: number;
}
```

### 5.3 Return types для каждого composable

```typescript
// Примеры return types

export interface UseNotesReturn {
  createNote: (title: string, parentId?: string | null) => Promise<Note>;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => Promise<void>;
  deleteNote: (id: string, cascadeDelete?: boolean) => Promise<void>;
  getNoteById: (id: string) => Note | undefined;
  getRootNotes: () => ComputedRef<Note[]>;
  getChildren: (parentId: string) => ComputedRef<Note[]>;
  getAllDescendants: (noteId: string) => Note[];
  getChildrenCount: (noteId: string) => number;
  getNotePath: (noteId: string) => Promise<Note[]>;
  moveNote: (noteId: string, targetParentId: string | null) => Promise<void>;
  expandedNotes: Ref<Set<string>>;
  toggleNoteExpanded: (noteId: string) => void;
  expandNote: (noteId: string) => void;
  collapseNote: (noteId: string) => void;
  expandAllAncestors: (noteId: string) => void;
  // NEW: loading/error states
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

export interface UseFoldersReturn {
  createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<string[]>;
  getFolderById: (id: string) => Folder | undefined;
  getChildFolders: (parentId: string | null) => ComputedRef<Folder[]>;
  getRootFolders: ComputedRef<Folder[]>;
  // NEW: loading/error states
  loading: Ref<boolean>;
  error: Ref<string | null>;
}
```

---

## 6. Оценка рисков

### 6.1 Высокий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Добавление loading/error в useNotes | Может сломать UI, если компоненты не обрабатывают эти состояния | Проверить все компоненты, использующие useNotes |
| Изменение типов RecordData | Breaking change для всех компонентов, работающих с базами данных | Постепенная миграция, оставить совместимость |

### 6.2 Средний риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Добавление return types | Может выявить несоответствия типов | TypeScript покажет ошибки - исправить |
| Убрать catch (e: any) | Потеря доступа к e.message | Использовать helper `getErrorMessage()` |

### 6.3 Низкий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Типизация существующих параметров | Минимальный | TypeScript проверит |
| Добавление интерфейсов | Нет риска | Только добавление типов |

---

## 7. Рекомендуемый план рефакторинга

### Этап 1: Создание типов (1-2 часа)
1. Создать `src/types/composables.ts` с общими типами
2. Расширить `src/types/database.ts` с `CellValue` и `RecordData`
3. Добавить helper функции для обработки ошибок

### Этап 2: Utils composables (1 час)
1. `useCrud.ts` - добавить return type
2. `useLocalStorageFallback.ts` - добавить return type

### Этап 3: Database composables (2-3 часа)
1. `useRecordsCrud.ts` - заменить `any` на `RecordData`, добавить return types
2. `useRecordsBatch.ts` - заменить `any` на `RecordData`, добавить loading, return types
3. `useColumnsCrud.ts` - добавить loading, return types
4. `useViewsCrud.ts` - добавить loading, return types
5. `useDatabasesCrud.ts` - добавить return types
6. `useDatabases.ts` - обновить типы

### Этап 4: Core composables (2-3 часа)
1. `useNotes.ts` - добавить loading/error, return types
2. `useFolders.ts` - добавить loading/error, return types
3. `useStorage.ts` - добавить return types
4. `useTags.ts` - добавить return types

### Этап 5: Feature composables (2-3 часа)
1. `useReminders.ts` - исправить catch (e: any), добавить return types
2. `usePushNotifications.ts` - исправить catch (e: any), добавить return types
3. `useCalendarSync.ts` - исправить catch (e: any), добавить return types
4. `useQuickCapture.ts` - добавить return types
5. `useOffline.ts` - добавить return types

### Этап 6: UI composables (1-2 часа)
1. `useTabs.ts` - добавить return types
2. `useTheme.ts` - добавить return types
3. `useSearch.ts` - добавить return types
4. `useAuth.ts` - добавить return types
5. `useNetworkStatus.ts` - добавить return types

### Этап 7: Специализированные composables (1 час)
1. `useAI.ts` - добавить return types
2. `useTemplates.ts` - добавить return types
3. `useSpeechRecognition.ts` - добавить return types

### Этап 8: Тестирование (1-2 часа)
1. Запустить `tsc --noEmit` для проверки типов
2. Проверить UI на наличие regression
3. Проверить обработку ошибок в dev tools

---

## 8. Примеры рефакторинга

### 8.1 До: useNotes.ts (фрагмент)
```typescript
export function useNotes(notes: Ref<Note[]>) {
  const createNote = async (title: string, parentId?: string | null) => {
    try {
      const newNote = await offlineStore.createNote({
        title,
        content: '',
        parentId,
      });
      notes.value.push(newNote);
      return newNote;
    } catch (err) {
      console.error('Failed to create note:', err);
      throw err;
    }
  };
  // ...
}
```

### 8.2 После: useNotes.ts (фрагмент)
```typescript
import { getErrorMessage } from '../types/composables';
import type { UseNotesReturn } from '../types/composables';

export function useNotes(notes: Ref<Note[]>): UseNotesReturn {
  const loading = ref(false);
  const error = ref<string | null>(null);

  const createNote = async (title: string, parentId?: string | null): Promise<Note> => {
    loading.value = true;
    error.value = null;
    try {
      const newNote = await offlineStore.createNote({
        title,
        content: '',
        parentId,
      });
      notes.value.push(newNote);
      return newNote;
    } catch (err) {
      const message = getErrorMessage(err);
      error.value = `Не удалось создать заметку: ${message}`;
      console.error('Failed to create note:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    createNote,
    // ... other methods
    loading,
    error,
  };
}
```

### 8.3 До: useReminders.ts (фрагмент)
```typescript
const fetchReminders = async () => {
  loading.value = true;
  error.value = null;
  try {
    reminders.value = await remindersApi.getAll();
  } catch (e: any) {
    error.value = e.message;
    console.error('Failed to fetch reminders:', e);
  } finally {
    loading.value = false;
  }
};
```

### 8.4 После: useReminders.ts (фрагмент)
```typescript
import { getErrorMessage } from '../types/composables';

const fetchReminders = async (): Promise<void> => {
  loading.value = true;
  error.value = null;
  try {
    reminders.value = await remindersApi.getAll();
  } catch (err: unknown) {
    error.value = getErrorMessage(err);
    console.error('Failed to fetch reminders:', err);
  } finally {
    loading.value = false;
  }
};
```

---

## 9. Чеклист для выполнения

- [ ] Создать `src/types/composables.ts`
- [ ] Расширить `src/types/database.ts`
- [ ] Добавить helper `getErrorMessage()`
- [ ] Рефакторинг database composables (5 файлов)
- [ ] Рефакторинг core composables (4 файла)
- [ ] Рефакторинг feature composables (5 файлов)
- [ ] Рефакторинг UI composables (5 файлов)
- [ ] Рефакторинг specialized composables (3 файла)
- [ ] Проверить TypeScript (`tsc --noEmit`)
- [ ] Ручное тестирование UI
- [ ] Обновить компоненты для поддержки loading/error states

---

## 10. Заключение

Рефакторинг composables является важным шагом для улучшения качества кода и DX (Developer Experience). Основные проблемы:

1. **14 случаев использования `any`** - нарушает типобезопасность
2. **10+ composables без loading/error** - UI не может показать состояние загрузки
3. **50+ методов без return types** - затрудняет понимание API
4. **Несогласованные паттерны обработки ошибок** - сложно поддерживать

**Оценка трудозатрат:** 10-15 часов  
**Сложность:** Средняя  
**Риск:** Средний (возможны breaking changes в UI)

Рекомендуется выполнять рефакторинг поэтапно, начиная с создания типов, затем переходя к менее используемым composables и заканчивая критическими (useNotes, useFolders).
