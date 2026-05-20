# Анализ рефакторинга: Frontend Composables

**Дата:** 2026-05-20  
**Область:** `src/composables/`  
**Количество файлов:** 20 composables

---

## 1. Обзор текущей архитектуры

### 1.1 Структура composables

| Composable | Размер (строк) | Зависимости | Тип |
|------------|----------------|-------------|-----|
| `useDatabases` | 533 | API, types | CRUD + Views |
| `useTabs` | 221 | types | UI State |
| `useNotes` | 219 | offlineStore, indexedDb, API | CRUD |
| `useQuickCapture` | 193 | useStorage, useNotes, AI API | Feature |
| `useSpeechRecognition` | 188 | Browser API | Feature |
| `useStorage` | 132 | offlineStore, API, useNetworkStatus | Data Loading |
| `usePushNotifications` | 131 | notifications API | Feature |
| `useTags` | 136 | tags API | CRUD |
| `useTheme` | 117 | localStorage | UI State |
| `useReminders` | 112 | reminders API | CRUD |
| `useGraph` | 140 | utils, types | Computed |
| `useFolders` | 82 | folders API | CRUD |
| `useTemplates` | 67 | templates data, AI API | Feature |
| `useAI` | 66 | AI API | Feature |
| `useBacklinks` | 54 | utils, types | Computed |
| `useCalendarSync` | 33 | calendar API | Feature |
| `useSearch` | 19 | types | Computed |
| `useAuth` | 15 | authStore | Facade |
| `useOffline` | 101 | offline services | Sync |
| `useNetworkStatus` | 5 | network service | Facade |

### 1.2 Граф зависимостей

```
App.vue / MainView.vue
    ├── useStorage ──────┬── offlineStore ─── indexedDbService
    │                    └── useNetworkStatus
    ├── useNotes ────────┬── offlineStore
    │                    └── indexedDbService
    ├── useTabs (global state)
    ├── useTheme (global state)
    ├── useSearch
    ├── useAuth ─────────── authStore ─── authService
    ├── useTags
    └── useBacklinks

useQuickCapture
    ├── useStorage (creates new instance!)
    ├── useNotes (creates new instance!)
    └── aiApi

Components:
    BlockEditor ─── useDatabases, useAI
    NoteEditor ──── useReminders
    NoteTags ────── useTags, useTheme
    etc.
```

---

## 2. Выявленные проблемы (Code Smells)

### 2.1 КРИТИЧНО: Неконсистентность паттернов

**Проблема:** Три разных подхода к управлению состоянием:

1. **Facade над store** — `useAuth`, `useNetworkStatus` (5-15 строк)
2. **Собственное состояние с ref** — `useDatabases`, `useNotes`, `useTabs` (100-500+ строк)
3. **Global state вне функции** — `useTabs`, `useTheme`

```typescript
// useAuth.ts — просто facade
export function useAuth() {
  return {
    user: authStore.user,
    // ...прямое проксирование authStore
  };
}

// useDatabases.ts — собственное состояние
export function useDatabases() {
  const databases = ref<CustomDatabase[]>([]);  // локальный state
  const records = ref<Record[]>([]);
  // ...533 строки логики
}

// useTabs.ts — глобальный state вне функции
const tabs = ref<Tab[]>([]);  // ОПАСНО: глобальный singleton
const activeTabId = ref<string | null>(null);
export function useTabs() { /* использует глобальные refs */ }
```

**Риск:** Утечки памяти, проблемы при HMR, непредсказуемое поведение.

### 2.2 ВЫСОКИЙ: Дублирование CRUD-паттерна

**Проблема:** Идентичный boilerplate в 5+ composables:

```typescript
// Повторяется в useDatabases, useReminders, useTags, useNotes, useFolders:
const loading = ref(false);
const error = ref<string | null>(null);

const loadData = async () => {
  try {
    loading.value = true;
    error.value = null;
    data.value = await api.getAll();
  } catch (err) {
    error.value = 'Не удалось загрузить...';
    throw err;
  } finally {
    loading.value = false;
  }
};
```

**Метрика:** ~200 строк дублированного кода.

### 2.3 ВЫСОКИЙ: `useDatabases` — God Object

**Проблема:** 533 строки, 20+ методов, смешение ответственностей:

- CRUD для databases
- CRUD для columns  
- CRUD для records
- CRUD для views
- Batch operations
- localStorage fallback logic

**Нарушение:** Single Responsibility Principle (SRP).

### 2.4 СРЕДНИЙ: Циклические зависимости

```
useQuickCapture 
    → useStorage (создаёт новый instance)
    → useNotes (создаёт новый instance)
    → offlineStore
    → useNetworkStatus

useStorage
    → offlineStore
    → useNetworkStatus

offlineStore (class)
    → useNetworkStatus (вызывается внутри методов!)
```

**Проблема:** `offlineStore` вызывает `useNetworkStatus()` внутри методов класса, нарушая паттерн Vue composables.

### 2.5 СРЕДНИЙ: Side Effects в onMounted

| Composable | Side Effect в onMounted |
|------------|-------------------------|
| `useCalendarSync` | API call |
| `usePushNotifications` | 3 метода: checkSupport, checkPermission, loadVapidKey |
| `useStorage` | loadFromStorage() |

**Риск:** Неконтролируемые сетевые запросы при монтировании компонентов.

### 2.6 СРЕДНИЙ: localStorage Fallback Duplication

В `useDatabases` три метода (`createView`, `updateView`, `deleteView`) содержат идентичную логику localStorage fallback:

```typescript
try {
  const storedData = localStorage.getItem(storageKey);
  const storedViews = storedData ? JSON.parse(storedData) : [];
  // ...операция
  localStorage.setItem(storageKey, JSON.stringify(storedViews));
} catch (e) {
  console.error('Failed to save view to localStorage:', e);
}
```

### 2.7 НИЗКИЙ: Использование `any`

```typescript
// useDatabases.ts:289
const createdRecords: any[] = [];
```

---

## 3. Список затрагиваемых файлов

### Composables (прямые изменения)
- `src/composables/useDatabases.ts` — разбиение на модули
- `src/composables/useNotes.ts` — извлечение базового CRUD
- `src/composables/useTabs.ts` — рефакторинг глобального состояния
- `src/composables/useTheme.ts` — рефакторинг глобального состояния
- `src/composables/useStorage.ts` — унификация паттерна
- `src/composables/useQuickCapture.ts` — устранение дублирования instance

### Services (возможные изменения)
- `src/services/offline/offlineStore.ts` — удаление вызова useNetworkStatus()

### Components (импорты)
- `src/App.vue`
- `src/views/MainView.vue`
- `src/components/BlockEditor.vue`
- `src/components/BlockEditor/DatabaseBlock.vue`
- `src/components/NoteEditor.vue`
- `src/components/NoteTags.vue`
- `src/components/SyncStatusIndicator.vue`
- (и ещё ~25 компонентов)

---

## 4. Оценка рисков

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Поломка offline-режима | Высокая | Критичное | E2E тесты offline сценариев |
| Нарушение синхронизации tabs | Средняя | Высокое | Unit тесты для useTabs |
| Регрессии в databases | Средняя | Высокое | Integration тесты CRUD |
| Несовместимость темы | Низкая | Среднее | Manual QA |

---

## 5. Рекомендуемый подход

### 5.1 Этап 1: Базовый CRUD хелпер

Создать `src/composables/utils/useCrud.ts`:

```typescript
export function useCrud<T>(api: CrudApi<T>, options?: CrudOptions) {
  const items = ref<T[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Унифицированные load, create, update, delete
  return { items, loading, error, load, create, update, remove };
}
```

**Ожидаемое сокращение:** ~150-200 строк дублированного кода.

### 5.2 Этап 2: Разбиение useDatabases

```
useDatabases.ts (533 строк)
    ↓
├── useDatabaseCrud.ts (~100 строк)
├── useColumnCrud.ts (~80 строк)
├── useRecordCrud.ts (~120 строк)
├── useViewCrud.ts (~100 строк)
└── useDatabaseBatch.ts (~80 строк)
```

### 5.3 Этап 3: Рефакторинг глобального состояния

Для `useTabs` и `useTheme`:

```typescript
// Вместо глобального ref вне функции:
const tabs = ref<Tab[]>([]);

// Использовать provide/inject или Pinia store:
export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([]);
  // ...
});
```

### 5.4 Этап 4: Исправление offlineStore

Вынести `useNetworkStatus()` в параметр или использовать dependency injection.

---

## 6. Метрики успеха

| Метрика | До | Цель |
|---------|-----|------|
| Строк в useDatabases | 533 | <150 (main file) |
| Дублированный CRUD код | ~200 строк | <30 строк |
| Composables с global state | 2 | 0 |
| Покрытие тестами composables | ~0% | >60% |

---

## 7. Приоритет действий

1. **P0:** Создать базовый CRUD хелпер
2. **P1:** Разбить `useDatabases` на модули
3. **P1:** Рефакторинг глобального состояния (`useTabs`, `useTheme`)
4. **P2:** Исправить `offlineStore` dependency injection
5. **P2:** Унифицировать side effects (lazy loading)
6. **P3:** Добавить unit тесты для composables

---

*Документ создан автоматически в рамках анализа рефакторинга.*
