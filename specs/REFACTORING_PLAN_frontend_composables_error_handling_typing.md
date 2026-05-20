# План рефакторинга: Frontend Composables - Error Handling и Typing

**Дата создания:** 2026-05-20  
**Область:** Vue 3 Composables  
**Цель:** Добавить proper error handling, типизировать все параметры и return types, убрать `any`, добавить loading/error states

---

## Резюме

Рефакторинг направлен на улучшение типобезопасности и обработки ошибок в 26 Vue composables. Основные проблемы:

- **14 случаев использования `any`** — нарушает типобезопасность
- **6 composables без loading/error состояний** — UI не может показать состояние загрузки  
- **50+ методов без return types** — затрудняет понимание API
- **Несогласованные паттерны обработки ошибок** — `catch (e: any)` vs правильная типизация

---

## Шаги рефакторинга

### Группа 1: Создание типов и утилит (Критический приоритет)

#### Шаг 1: Создать файл с общими типами для composables
**Файл:** `src/types/composables.ts` (новый)

Создать новый файл с:
```typescript
import { type Ref, type ComputedRef } from 'vue';
import type { Note, Folder, Record, Reminder, Tag, CustomDatabase, Column } from './index';

// Хелпер для типизации catch блоков
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Неизвестная ошибка';
}

// Базовый интерфейс для async composables
export interface AsyncState {
  loading: Ref<boolean>;
  error: Ref<string | null>;
}
```

#### Шаг 2: Добавить типизированные значения ячеек в types/index.ts
**Файл:** `src/types/index.ts`

После строки 126 (после `FileValue`) добавить:
```typescript
// Типизированные значения ячеек базы данных
export type CellValue = 
  | string 
  | number 
  | boolean 
  | Date 
  | string[]           // для MULTI_SELECT
  | FileCellValue[]    // для FILE
  | null
  | undefined;

// Типизированные данные записи (вместо { [columnId: string]: any })
export type RecordData = { [columnId: string]: CellValue };
```

#### Шаг 3: Обновить интерфейс Record для использования RecordData
**Файл:** `src/types/index.ts`

Изменить строку 101:
```typescript
// Было:
data: { [columnId: string]: any };

// Стало:
data: RecordData;
```

#### Шаг 4: Обновить интерфейс DatabaseFilter для типизации value
**Файл:** `src/types/database.ts`

Изменить строку 25:
```typescript
// Было:
value?: any;

// Стало:
value?: CellValue;
```

Добавить импорт в начало файла:
```typescript
import type { CellValue } from './index';
```

---

### Группа 2: Database Composables (Высокий приоритет)

#### Шаг 5: Типизировать useRecordsCrud.ts
**Файл:** `src/composables/database/useRecordsCrud.ts`

1. Добавить импорт:
```typescript
import type { RecordData } from '../../types';
```

2. Изменить строку 32:
```typescript
// Было:
const createRecord = async (databaseId: string, data: { [columnId: string]: any }) => {

// Стало:
const createRecord = async (databaseId: string, data: RecordData): Promise<Record> => {
```

3. Изменить строки 44-47:
```typescript
// Было:
const updateRecord = async (
  databaseId: string,
  recordId: string,
  data: { [columnId: string]: any }
) => {

// Стало:
const updateRecord = async (
  databaseId: string,
  recordId: string,
  data: RecordData
): Promise<Record> => {
```

4. Добавить return types для всех методов:
- `loadRecords`: `Promise<Record[]>`
- `deleteRecord`: `Promise<void>`
- `getRecordsByDatabaseId`: `Record[]`

#### Шаг 6: Типизировать useRecordsBatch.ts
**Файл:** `src/composables/database/useRecordsBatch.ts`

1. Добавить импорт и loading/error состояния:
```typescript
import type { RecordData } from '../../types';
const loading = ref(false);
const error = ref<string | null>(null);
```

2. Изменить сигнатуру:
```typescript
// Было:
const createRecords = async (databaseId: string, recordsData: Array<{ [columnId: string]: any }>) => {

// Стало:
const createRecords = async (databaseId: string, recordsData: RecordData[]): Promise<Record[]> => {
```

3. Добавить try/catch с loading/error управлением.

4. Добавить loading, error в return объект.

#### Шаг 7: Типизировать useColumnsCrud.ts
**Файл:** `src/composables/database/useColumnsCrud.ts`

1. Добавить loading состояние:
```typescript
const loading = ref(false);
```

2. Добавить return types для всех методов:
- `loadColumns`: `Promise<Column[]>`
- `createColumn`: `Promise<Column>`
- `updateColumn`: `Promise<Column>`
- `deleteColumn`: `Promise<void>`

3. Добавить loading в return объект.

#### Шаг 8: Типизировать useViewsCrud.ts
**Файл:** `src/composables/database/useViewsCrud.ts`

1. Добавить loading состояние:
```typescript
const loading = ref(false);
```

2. Добавить return types для всех методов.

3. Добавить loading в return объект.

#### Шаг 9: Типизировать useDatabasesCrud.ts
**Файл:** `src/composables/database/useDatabasesCrud.ts`

Добавить return types для всех методов:
- `loadDatabases`: `Promise<CustomDatabase[]>`
- `createDatabase`: `Promise<CustomDatabase>`
- `updateDatabase`: `Promise<CustomDatabase>`
- `deleteDatabase`: `Promise<void>`
- `getDatabaseById`: `CustomDatabase | undefined`
- `getDatabasesByFolderId`: `CustomDatabase[]`

---

### Группа 3: Core Composables (Высокий приоритет)

#### Шаг 10: Добавить loading/error в useNotes.ts
**Файл:** `src/composables/useNotes.ts`

1. Добавить импорт:
```typescript
import { getErrorMessage } from '../types/composables';
```

2. Добавить состояния после строки 8:
```typescript
const loading = ref(false);
const error = ref<string | null>(null);
```

3. Обернуть асинхронные методы (createNote, updateNote, deleteNote, getNotePath, moveNote) в паттерн:
```typescript
loading.value = true;
error.value = null;
try {
  // existing code
} catch (err) {
  error.value = `Сообщение: ${getErrorMessage(err)}`;
  console.error('...', err);
  throw err;
} finally {
  loading.value = false;
}
```

4. Добавить return types для всех методов.

5. Добавить loading, error в return объект.

#### Шаг 11: Создать интерфейс UseNotesReturn
**Файл:** `src/types/composables.ts`

Добавить:
```typescript
export interface UseNotesReturn extends AsyncState {
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
}
```

#### Шаг 12: Добавить loading/error в useFolders.ts
**Файл:** `src/composables/useFolders.ts`

1. Добавить импорт:
```typescript
import { ref } from 'vue';
import { getErrorMessage } from '../types/composables';
```

2. Добавить состояния:
```typescript
const loading = ref(false);
const error = ref<string | null>(null);
```

3. Обернуть асинхронные методы (createFolder, updateFolder, deleteFolder) в паттерн loading/error.

4. Добавить return types для всех методов.

5. Добавить loading, error в return объект.

#### Шаг 13: Создать интерфейс UseFoldersReturn
**Файл:** `src/types/composables.ts`

Добавить:
```typescript
export interface UseFoldersReturn extends AsyncState {
  createFolder: (name: string, parentId?: string | null) => Promise<Folder>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<string[]>;
  getFolderById: (id: string) => Folder | undefined;
  getChildFolders: (parentId: string | null) => ComputedRef<Folder[]>;
  getRootFolders: ComputedRef<Folder[]>;
}
```

---

### Группа 4: Исправление catch (e: any) (Высокий приоритет)

#### Шаг 14: Исправить useReminders.ts
**Файл:** `src/composables/useReminders.ts`

1. Добавить импорт:
```typescript
import { getErrorMessage } from '../types/composables';
```

2. Заменить все `catch (e: any)` на `catch (err: unknown)`:
- Строка 15: `catch (err: unknown)`
- Строка 28: `catch (err: unknown)`
- Строка 44: `catch (err: unknown)`
- Строка 63: `catch (err: unknown)`
- Строка 78: `catch (err: unknown)`
- Строка 92: `catch (err: unknown)`

3. Заменить все `e.message` на `getErrorMessage(err)`.

4. Добавить return types для всех методов:
- `fetchReminders`: `Promise<void>`
- `fetchRemindersByNoteId`: `Promise<Reminder[]>`
- `createReminder`: `Promise<Reminder>`
- `updateReminder`: `Promise<Reminder>`
- `deleteReminder`: `Promise<void>`
- `getUpcomingReminders`: `Promise<Reminder[]>`

#### Шаг 15: Исправить usePushNotifications.ts
**Файл:** `src/composables/usePushNotifications.ts`

1. Добавить импорт `getErrorMessage`.

2. Заменить все `catch (e: any)` на `catch (err: unknown)`.

3. Заменить все `e.message` на `getErrorMessage(err)`.

4. Добавить return types для всех методов.

#### Шаг 16: Исправить useCalendarSync.ts
**Файл:** `src/composables/useCalendarSync.ts`

1. Добавить импорт `getErrorMessage`.

2. Заменить `catch (e: any)` на `catch (err: unknown)`.

3. Заменить `e.message` на `getErrorMessage(err)`.

4. Добавить return types для всех методов.

---

### Группа 5: UI Composables (Средний приоритет)

#### Шаг 17: Типизировать useTabs.ts
**Файл:** `src/composables/useTabs.ts`

Добавить return types для всех методов:
- `openNoteInTab`: `void`
- `closeTab`: `void`
- `setActiveTab`: `void`
- `reorderTabs`: `void`
- `getTabNote`: `Note | undefined`
- и т.д.

#### Шаг 18: Типизировать useTheme.ts
**Файл:** `src/composables/useTheme.ts`

Добавить return type для функции и всех методов.

#### Шаг 19: Типизировать useSearch.ts
**Файл:** `src/composables/useSearch.ts`

Добавить return type для функции и всех методов.

#### Шаг 20: Типизировать useAuth.ts
**Файл:** `src/composables/useAuth.ts`

Добавить return type для функции и всех методов.

#### Шаг 21: Типизировать useNetworkStatus.ts
**Файл:** `src/composables/useNetworkStatus.ts`

Добавить return type для функции.

---

### Группа 6: Feature Composables (Средний приоритет)

#### Шаг 22: Типизировать useStorage.ts
**Файл:** `src/composables/useStorage.ts`

Добавить return types для всех методов.

#### Шаг 23: Типизировать useOffline.ts
**Файл:** `src/composables/useOffline.ts`

Добавить return types для всех методов.

#### Шаг 24: Типизировать useQuickCapture.ts
**Файл:** `src/composables/useQuickCapture.ts`

Добавить return types для всех методов.

#### Шаг 25: Типизировать useTags.ts
**Файл:** `src/composables/useTags.ts`

Добавить return types для всех методов.

---

### Группа 7: Специализированные Composables (Низкий приоритет)

#### Шаг 26: Типизировать useAI.ts
**Файл:** `src/composables/useAI.ts`

Добавить return types для всех методов:
- `summarize`: `Promise<string | null>`
- `expand`: `Promise<string | null>`

#### Шаг 27: Типизировать useTemplates.ts
**Файл:** `src/composables/useTemplates.ts`

Добавить return types для всех методов.

#### Шаг 28: Типизировать useSpeechRecognition.ts
**Файл:** `src/composables/useSpeechRecognition.ts`

Добавить return types для всех методов.

---

### Группа 8: Utils Composables (Низкий приоритет)

#### Шаг 29: Типизировать useCrud.ts
**Файл:** `src/composables/utils/useCrud.ts`

Убедиться что все типы `CrudApi<T>` и `CrudOptions` корректны.

#### Шаг 30: Типизировать useLocalStorageFallback.ts
**Файл:** `src/composables/utils/useLocalStorageFallback.ts`

Добавить return type для функции.

---

## Файлы для модификации

| Файл | Тип изменений |
|------|---------------|
| `src/types/composables.ts` | **НОВЫЙ** — типы и хелперы |
| `src/types/index.ts` | Добавить CellValue, RecordData; изменить Record.data |
| `src/types/database.ts` | Типизировать DatabaseFilter.value |
| `src/composables/useNotes.ts` | +loading/error, +return types |
| `src/composables/useFolders.ts` | +loading/error, +return types |
| `src/composables/useReminders.ts` | Убрать any, +return types |
| `src/composables/usePushNotifications.ts` | Убрать any, +return types |
| `src/composables/useCalendarSync.ts` | Убрать any, +return types |
| `src/composables/database/useRecordsCrud.ts` | Типизировать data, +return types |
| `src/composables/database/useRecordsBatch.ts` | Типизировать data, +loading, +return types |
| `src/composables/database/useColumnsCrud.ts` | +loading, +return types |
| `src/composables/database/useViewsCrud.ts` | +loading, +return types |
| `src/composables/database/useDatabasesCrud.ts` | +return types |
| `src/composables/useTabs.ts` | +return types |
| `src/composables/useTheme.ts` | +return types |
| `src/composables/useSearch.ts` | +return types |
| `src/composables/useAuth.ts` | +return types |
| `src/composables/useNetworkStatus.ts` | +return types |
| `src/composables/useStorage.ts` | +return types |
| `src/composables/useOffline.ts` | +return types |
| `src/composables/useQuickCapture.ts` | +return types |
| `src/composables/useTags.ts` | +return types |
| `src/composables/useAI.ts` | +return types |
| `src/composables/useTemplates.ts` | +return types |
| `src/composables/useSpeechRecognition.ts` | +return types |
| `src/composables/utils/useCrud.ts` | Проверить типы |
| `src/composables/utils/useLocalStorageFallback.ts` | +return types |

---

## Файлы для создания

| Файл | Назначение |
|------|------------|
| `src/types/composables.ts` | Общие типы, хелперы, интерфейсы return types |

---

## Файлы для удаления

Нет файлов для удаления.

---

## Миграция

Миграция данных не требуется. Все изменения касаются только типизации на уровне TypeScript.

**Возможные breaking changes:**
- Компоненты, использующие `useNotes` и `useFolders`, получат новые свойства `loading` и `error` — они опциональны для использования
- Типизация `RecordData` может выявить некорректное использование в компонентах

---

## Стратегия тестирования

### Автоматическое тестирование

1. **TypeScript проверка:**
   ```bash
   cd src && npx tsc --noEmit
   ```

2. **Lint проверка:**
   ```bash
   npm run lint
   ```

3. **Unit тесты (если есть):**
   ```bash
   npm run test
   ```

### Ручное тестирование

1. **Заметки:**
   - Создать заметку
   - Редактировать заметку
   - Удалить заметку
   - Переместить заметку
   - Проверить отображение loading индикатора

2. **Базы данных:**
   - Создать запись
   - Редактировать запись с разными типами колонок
   - Удалить запись

3. **Напоминания:**
   - Создать напоминание
   - Проверить отображение ошибок при сбое

4. **Общее:**
   - Проверить консоль на отсутствие новых ошибок
   - Проверить Network tab на корректность запросов

---

## Оценка рисков

### Высокий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Добавление loading/error в useNotes | Компоненты могут не обрабатывать новые состояния | Состояния опциональны; компоненты продолжат работать |
| Изменение типа Record.data | Breaking change для компонентов с явной типизацией any | TypeScript покажет ошибки компиляции |

### Средний риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Замена catch (e: any) | Потеря доступа к специфичным свойствам ошибок | Хелпер getErrorMessage обрабатывает все случаи |

### Низкий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Добавление return types | Минимальный | TypeScript проверит корректность |
| Добавление интерфейсов | Нет риска | Только добавление типов |

---

## Порядок выполнения

1. **Шаги 1-4** — создание типов (фундамент)
2. **Шаги 5-9** — database composables (изолированная область)
3. **Шаги 10-13** — core composables (useNotes, useFolders)
4. **Шаги 14-16** — исправление catch (e: any)
5. **Шаги 17-21** — UI composables
6. **Шаги 22-25** — feature composables
7. **Шаги 26-30** — остальные composables
8. **Тестирование** — после каждой группы запускать `tsc --noEmit`

---

## Ожидаемый результат

После выполнения рефакторинга:

- ✅ 0 использований `any` в composables
- ✅ Все async composables имеют loading/error состояния
- ✅ Все методы имеют явные return types
- ✅ Единообразная обработка ошибок через `getErrorMessage()`
- ✅ TypeScript компиляция без ошибок
