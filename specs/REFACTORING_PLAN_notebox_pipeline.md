# План рефакторинга: Frontend Composables

**Дата:** 2026-05-20  
**Область:** `src/composables/`  
**Анализ:** `reports/REFACTORING_ANALYSIS_notebox_pipeline.md`  

---

## Резюме

Рефакторинг направлен на устранение трёх критических проблем в слое composables:

1. **Неконсистентность паттернов состояния** — три разных подхода (facade, local state, global singleton)
2. **Дублирование CRUD-логики** — ~200 строк повторяющегося кода в 5+ файлах
3. **God Object `useDatabases`** — 533 строки с 4 доменами ответственности

Результат: унифицированная архитектура composables, сокращение кода на ~200 строк, улучшение maintainability.

---

## Шаги рефакторинга

### Группа A: Базовая инфраструктура (Critical)

#### A1. Создать утилиту `useCrud`
**Файл:** `src/composables/utils/useCrud.ts` (новый)

Создать generic composable для унификации CRUD-операций:
```typescript
export interface CrudApi<T> {
  getAll(): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface CrudOptions {
  loadErrorMessage?: string;
  createErrorMessage?: string;
  updateErrorMessage?: string;
  deleteErrorMessage?: string;
}

export function useCrud<T extends { id: string }>(
  api: CrudApi<T>,
  options?: CrudOptions
) {
  const items = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const load = async () => { /* унифицированная логика */ };
  const create = async (data: Partial<T>) => { /* ... */ };
  const update = async (id: string, data: Partial<T>) => { /* ... */ };
  const remove = async (id: string) => { /* ... */ };

  return { items, loading, error, load, create, update, remove };
}
```

**Ожидаемый размер:** ~80 строк

---

#### A2. Создать утилиту `useLocalStorageFallback`
**Файл:** `src/composables/utils/useLocalStorageFallback.ts` (новый)

Извлечь дублированную логику localStorage fallback:
```typescript
export function useLocalStorageFallback<T>(storageKey: string) {
  const load = (): T[] => { /* ... */ };
  const save = (items: T[]) => { /* ... */ };
  const findById = (items: T[], id: string): T | undefined => { /* ... */ };
  const updateById = (items: T[], id: string, update: Partial<T>): T[] => { /* ... */ };
  const removeById = (items: T[], id: string): T[] => { /* ... */ };

  return { load, save, findById, updateById, removeById };
}
```

**Ожидаемый размер:** ~50 строк

---

#### A3. Создать файл-индекс для utils
**Файл:** `src/composables/utils/index.ts` (новый)

```typescript
export { useCrud } from './useCrud';
export type { CrudApi, CrudOptions } from './useCrud';
export { useLocalStorageFallback } from './useLocalStorageFallback';
```

---

### Группа B: Разбиение `useDatabases` (High)

#### B1. Создать `useDatabasesCrud`
**Файл:** `src/composables/database/useDatabasesCrud.ts` (новый)

Извлечь CRUD-операции для databases:
- `loadDatabases`
- `loadDatabase`
- `createDatabase`
- `updateDatabase`
- `deleteDatabase`
- `getDatabaseById`

Использовать `useCrud` как базу.

**Ожидаемый размер:** ~100 строк

---

#### B2. Создать `useColumnsCrud`
**Файл:** `src/composables/database/useColumnsCrud.ts` (новый)

Извлечь CRUD-операции для columns:
- `addColumn`
- `updateColumn`
- `deleteColumn`

**Ожидаемый размер:** ~80 строк

---

#### B3. Создать `useRecordsCrud`
**Файл:** `src/composables/database/useRecordsCrud.ts` (новый)

Извлечь CRUD-операции для records:
- `loadRecords`
- `createRecord`
- `updateRecord`
- `deleteRecord`
- `getRecordsByDatabaseId`

**Ожидаемый размер:** ~90 строк

---

#### B4. Создать `useRecordsBatch`
**Файл:** `src/composables/database/useRecordsBatch.ts` (новый)

Извлечь batch-операции:
- `batchCreateRecords`
- `batchDeleteRecords`

**Ожидаемый размер:** ~80 строк

---

#### B5. Создать `useViewsCrud`
**Файл:** `src/composables/database/useViewsCrud.ts` (новый)

Извлечь CRUD-операции для views с localStorage fallback:
- `createView`
- `updateView`
- `deleteView`

Использовать `useLocalStorageFallback`.

**Ожидаемый размер:** ~90 строк

---

#### B6. Создать файл-индекс для database
**Файл:** `src/composables/database/index.ts` (новый)

```typescript
export { useDatabasesCrud } from './useDatabasesCrud';
export { useColumnsCrud } from './useColumnsCrud';
export { useRecordsCrud } from './useRecordsCrud';
export { useRecordsBatch } from './useRecordsBatch';
export { useViewsCrud } from './useViewsCrud';
```

---

#### B7. Рефакторинг `useDatabases` — facade
**Файл:** `src/composables/useDatabases.ts` (модификация)

Превратить в facade, который композирует модули:
```typescript
export function useDatabases() {
  const databasesCrud = useDatabasesCrud();
  const columnsCrud = useColumnsCrud(databasesCrud.databases);
  const recordsCrud = useRecordsCrud();
  const recordsBatch = useRecordsBatch(recordsCrud);
  const viewsCrud = useViewsCrud(databasesCrud.databases);

  return {
    // Проксирование всех методов для обратной совместимости
    ...databasesCrud,
    ...columnsCrud,
    ...recordsCrud,
    ...recordsBatch,
    ...viewsCrud,
  };
}
```

**Ожидаемый размер:** ~50 строк (вместо 533)

---

### Группа C: Рефакторинг глобального состояния (High)

#### C1. Рефакторинг `useTabs` — убрать global state
**Файл:** `src/composables/useTabs.ts` (модификация)

**Проблема:** Строки 13-15 — глобальные `ref` вне функции.

**Решение:** Использовать паттерн singleton с ленивой инициализацией:
```typescript
// До:
const tabs = ref<Tab[]>([]);
const activeTabId = ref<string | null>(null);
let tabCounter = 0;

// После:
let _instance: ReturnType<typeof createTabsStore> | null = null;

function createTabsStore() {
  const tabs = ref<Tab[]>([]);
  const activeTabId = ref<string | null>(null);
  let tabCounter = 0;
  // ... методы
  return { tabs, activeTabId, /* методы */ };
}

export function useTabs(getNoteById: (id: string) => Note | undefined) {
  if (!_instance) {
    _instance = createTabsStore();
  }
  // ... методы, использующие getNoteById
}
```

**Изменения:**
- Обернуть глобальные переменные в lazy singleton
- Сохранить API без изменений

---

#### C2. Рефакторинг `useTheme` — убрать global state
**Файл:** `src/composables/useTheme.ts` (модификация)

**Проблема:** Строки 7-9 — глобальные `ref` вне функции.

**Решение:** Аналогично `useTabs`:
```typescript
// До:
const themeMode = ref<ThemeMode>('system');
const systemPrefersDark = ref(false);
let isInitialized = false;

// После:
let _instance: ReturnType<typeof createThemeStore> | null = null;

function createThemeStore() {
  const themeMode = ref<ThemeMode>('system');
  const systemPrefersDark = ref(false);
  let isInitialized = false;
  // ... методы
  return { themeMode, systemPrefersDark, /* методы */ };
}

export function useTheme() {
  if (!_instance) {
    _instance = createThemeStore();
  }
  return _instance;
}
```

---

### Группа D: Исправление циклических зависимостей (Medium)

#### D1. Рефакторинг `offlineStore` — dependency injection
**Файл:** `src/services/offline/offlineStore.ts` (модификация)

**Проблема:** Вызов `useNetworkStatus()` внутри методов класса (строки 31, 47, 87, 130, 152).

**Решение:** Принимать `isOnline` как параметр или использовать callback:
```typescript
// До (в каждом методе):
const { isOnline } = useNetworkStatus();
if (!isOnline.value) { /* ... */ }

// После:
class OfflineStore {
  private getIsOnline: () => boolean = () => true;

  setNetworkStatusGetter(getter: () => boolean) {
    this.getIsOnline = getter;
  }

  async syncWithServer(): Promise<void> {
    if (!this.getIsOnline()) {
      console.log('Cannot sync: offline');
      return;
    }
    // ...
  }
}
```

**Изменения:**
- Убрать импорт `useNetworkStatus` из класса
- Добавить метод `setNetworkStatusGetter`
- Заменить все `useNetworkStatus().isOnline.value` на `this.getIsOnline()`

---

#### D2. Инициализация `offlineStore` в точке входа
**Файл:** `src/App.vue` (модификация)

Добавить инициализацию network status getter:
```typescript
import { offlineStore } from './services/offline/offlineStore';
import { useNetworkStatus } from './services/offline/networkStatus';

// В setup():
const { isOnline } = useNetworkStatus();
offlineStore.setNetworkStatusGetter(() => isOnline.value);
```

---

### Группа E: Типизация и cleanup (Low)

#### E1. Исправить использование `any` в `useRecordsBatch`
**Файл:** `src/composables/database/useRecordsBatch.ts`

При создании файла использовать правильную типизацию:
```typescript
// Вместо:
const createdRecords: any[] = [];

// Использовать:
const createdRecords: Record[] = [];
```

---

#### E2. Обновить импорты в компонентах (при необходимости)
**Файлы:** Компоненты, использующие `useDatabases`

Импорты не изменятся благодаря facade-паттерну в B7. Проверить работоспособность.

---

## Файлы к созданию

| Файл | Назначение | Размер (строк) |
|------|------------|----------------|
| `src/composables/utils/useCrud.ts` | Generic CRUD composable | ~80 |
| `src/composables/utils/useLocalStorageFallback.ts` | localStorage helper | ~50 |
| `src/composables/utils/index.ts` | Индекс utils | ~5 |
| `src/composables/database/useDatabasesCrud.ts` | CRUD databases | ~100 |
| `src/composables/database/useColumnsCrud.ts` | CRUD columns | ~80 |
| `src/composables/database/useRecordsCrud.ts` | CRUD records | ~90 |
| `src/composables/database/useRecordsBatch.ts` | Batch operations | ~80 |
| `src/composables/database/useViewsCrud.ts` | CRUD views | ~90 |
| `src/composables/database/index.ts` | Индекс database | ~10 |

**Всего новых файлов:** 9  
**Всего новых строк:** ~585

---

## Файлы к модификации

| Файл | Изменения | Сложность |
|------|-----------|-----------|
| `src/composables/useDatabases.ts` | Превратить в facade (533 → ~50 строк) | Высокая |
| `src/composables/useTabs.ts` | Lazy singleton pattern | Средняя |
| `src/composables/useTheme.ts` | Lazy singleton pattern | Средняя |
| `src/services/offline/offlineStore.ts` | Dependency injection | Средняя |
| `src/App.vue` | Инициализация offlineStore | Низкая |

**Всего модифицируемых файлов:** 5

---

## Файлы к удалению

Нет файлов к удалению.

---

## Миграция

Миграция данных или API не требуется — все изменения внутренние.

**Обратная совместимость:** 100% — публичный API `useDatabases` сохраняется через facade.

---

## Стратегия тестирования

### Автоматическое тестирование

1. **TypeScript compilation** — убедиться, что нет ошибок типизации
2. **Существующие тесты** — запустить `npm run test` для проверки регрессий
3. **Build** — убедиться, что production build проходит

### Ручное тестирование

1. **Databases CRUD:**
   - Создать новую базу данных
   - Добавить колонки разных типов
   - Создать/редактировать/удалить записи
   - Проверить batch import

2. **Views:**
   - Создать view в database
   - Редактировать view
   - Удалить view
   - Проверить localStorage fallback (отключить backend)

3. **Tabs:**
   - Открыть несколько вкладок
   - Закрыть вкладки
   - Перезагрузить страницу — tabs должны быть пусты (не persisted)

4. **Theme:**
   - Переключить тему (light → dark → system)
   - Перезагрузить страницу — тема должна сохраниться

5. **Offline mode:**
   - Создать заметку offline
   - Вернуться online — заметка должна синхронизироваться

---

## Оценка рисков

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Поломка CRUD databases | Средняя | Высокое | Facade сохраняет API; тесты |
| Поломка views (localStorage) | Средняя | Среднее | Отдельный модуль упрощает отладку |
| Проблемы с HMR после рефакторинга | Низкая | Низкое | Перезагрузка dev server |
| Регрессии в offline sync | Средняя | Высокое | Manual QA offline сценариев |
| Несовместимость импортов | Низкая | Низкое | Facade обеспечивает совместимость |

---

## Порядок выполнения

1. **A1, A2, A3** — создать utils (параллельно)
2. **B1-B6** — создать модули database (последовательно)
3. **B7** — рефакторинг useDatabases facade
4. **C1, C2** — рефакторинг global state (параллельно)
5. **D1, D2** — исправление offlineStore
6. **E1, E2** — cleanup и проверка

**Estimated time:** 2-3 часа для AI-агента

---

*План создан на основе анализа `reports/REFACTORING_ANALYSIS_notebox_pipeline.md`*
