# Анализ рефакторинга: Frontend State Management - Store Patterns

## Обзор текущей архитектуры

### Важное открытие: Pinia не используется

В проекте **отсутствует Pinia** как зависимость (см. `package.json`). Вместо этого используется несколько различных паттернов управления состоянием:

### 1. Ручной Singleton Store (authStore)
**Файл:** `src/stores/authStore.ts`

```typescript
const state = reactive<AuthState>({...});
export const authStore = {
  state: computed(() => state),
  get user() { return computed(() => state.user); },
  // ...actions
};
```

- Использует `reactive()` для глобального состояния
- Геттеры возвращают `computed()` для реактивности
- Экспортирует singleton-объект

### 2. Singleton через `_instance` (useTabs, useTheme)
**Файлы:** `src/composables/useTabs.ts`, `src/composables/useTheme.ts`

```typescript
let _instance: StoreInstance | null = null;

function getInstance(): StoreInstance {
  if (!_instance) _instance = createStore();
  return _instance;
}

export function useTabs() {
  const { tabs, activeTabId } = getInstance();
  // ...
}
```

- Создаёт singleton при первом вызове
- Все компоненты работают с одним экземпляром состояния

### 3. Глобальные ref на уровне модуля (networkStatus)
**Файл:** `src/services/offline/networkStatus.ts`

```typescript
const isOnline = ref(navigator.onLine);
export function useNetworkStatus() {
  return { isOnline: readonly(isOnline) };
}
```

- Состояние объявлено на уровне модуля
- Шарится между всеми потребителями

### 4. Composables с локальным состоянием
**Файлы:** `src/composables/useTags.ts`, `useReminders.ts`, `useDatabases.ts`

```typescript
export function useTags() {
  const tags = ref<Tag[]>([]);  // Локальный ref!
  const loadTags = async () => {...};
  return { tags, loadTags };
}
```

- Каждый вызов создаёт **новый** экземпляр состояния
- Данные не шарятся между компонентами
- Требует загрузки при каждом использовании

### 5. Composables с внешним состоянием
**Файлы:** `src/composables/useNotes.ts`, `useFolders.ts`, `useSearch.ts`

```typescript
export function useNotes(notes: Ref<Note[]>) {
  // Работает с переданным ref
  const createNote = async () => {
    notes.value.push(newNote);
  };
  return { createNote, ... };
}
```

- Принимает состояние через параметр
- Зависит от того, кто передаёт состояние

---

## Список затронутых файлов

### Stores и Services
| Файл | Текущий паттерн | Проблемы |
|------|-----------------|----------|
| `src/stores/authStore.ts` | reactive singleton | Хороший паттерн, но не Pinia |
| `src/services/offline/offlineStore.ts` | Class singleton | Смешивает данные и логику sync |
| `src/services/offline/networkStatus.ts` | Module-level ref | Нет типизированных actions |

### Composables с состоянием
| Файл | Текущий паттерн | Проблемы |
|------|-----------------|----------|
| `src/composables/useStorage.ts` | Локальный ref + onMounted | Создаёт новый экземпляр каждый раз |
| `src/composables/useTabs.ts` | Singleton (_instance) | Нестандартный API |
| `src/composables/useTheme.ts` | Singleton (_instance) | Нестандартный API |
| `src/composables/useTags.ts` | Локальный ref | Данные не шарятся! |
| `src/composables/useReminders.ts` | Локальный ref | Данные не шарятся! |
| `src/composables/useNotes.ts` | Внешний ref | Зависит от вызывающего |
| `src/composables/useFolders.ts` | Внешний ref | Зависит от вызывающего |
| `src/composables/useDatabases.ts` | Композиция локальных | Каждый блок = свой экземпляр |
| `src/composables/useAuth.ts` | Обёртка authStore | Лишний слой абстракции |

### Database CRUD composables
| Файл | Текущий паттерн | Проблемы |
|------|-----------------|----------|
| `src/composables/database/useDatabasesCrud.ts` | Локальный ref | Не singleton |
| `src/composables/database/useRecordsCrud.ts` | Локальный ref | Не singleton |
| `src/composables/database/useColumnsCrud.ts` | Принимает databases ref | Зависимость |
| `src/composables/database/useViewsCrud.ts` | Принимает databases ref | Зависимость |
| `src/composables/database/useRecordsBatch.ts` | Принимает records ref | Зависимость |

### Компоненты (основные потребители)
| Файл | Используемые composables | Проблемы |
|------|--------------------------|----------|
| `src/App.vue` | useStorage, useNotes, useTabs, useSearch | Дублирует MainView |
| `src/views/MainView.vue` | useStorage, useNotes, useTabs, useTags, useAuth | Дублирует App.vue |
| `src/components/BlockEditor/DatabaseBlock.vue` | useDatabases | Каждый блок = свой store |
| `src/components/reminder/ReminderList.vue` | useReminders | Локальный экземпляр |

---

## Граф зависимостей

```
                      ┌─────────────────┐
                      │   authStore     │
                      │  (singleton)    │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │    useAuth      │
                      │   (wrapper)     │
                      └────────┬────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
        ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
        │   App.vue   │ │ MainView.vue│ │ Components  │
        └──────┬──────┘ └──────┬──────┘ └─────────────┘
               │               │
               │  useStorage() │  useStorage()   <-- Дублирование!
               │       │       │       │
               ▼       ▼       ▼       ▼
        ┌──────────────────────────────────────┐
        │         notes (ref<Note[]>)          │
        │    Каждый вызов = новый экземпляр    │
        └──────────────────────────────────────┘

        ┌─────────────────┐     ┌─────────────────┐
        │    useTags()    │     │  useReminders() │
        │  (локальный)    │     │   (локальный)   │
        └────────┬────────┘     └────────┬────────┘
                 │                       │
        Каждый вызов = новые tags   Каждый вызов = новые reminders

        ┌─────────────────────────────────────────┐
        │           useDatabases()                │
        │  ┌───────────┐  ┌───────────┐          │
        │  │ databases │  │  records  │  <-- Локальные ref
        │  └───────────┘  └───────────┘          │
        └─────────────────────────────────────────┘
```

---

## Выявленные проблемы (Code Smells)

### 1. Дублирование состояния между компонентами
**Критичность: Высокая**

`App.vue` и `MainView.vue` оба вызывают `useStorage()`, создавая независимые экземпляры `notes`:

```typescript
// App.vue:125
const { notes } = useStorage();

// MainView.vue:272  
const { notes } = useStorage();
```

Результат: потенциальная рассинхронизация данных.

### 2. Composables без shared state
**Критичность: Высокая**

`useTags()`, `useReminders()`, `useDatabases()` создают локальное состояние при каждом вызове:

```typescript
// ReminderList.vue создаёт свой экземпляр
const { reminders } = useReminders();

// ReminderModal.vue создаёт ДРУГОЙ экземпляр
const { reminders } = useReminders();  
```

Результат: данные загружаются многократно, изменения не синхронизируются.

### 3. Inconsistent API паттерн
**Критичность: Средняя**

- `authStore` - объект с getters
- `useTabs()` - singleton с computed returns
- `useTags()` - локальный composable с ref returns
- `useNotes(notes)` - composable с внешним ref

Нет единого контракта для потребителей.

### 4. Отсутствие чёткого разделения state/actions/getters
**Критичность: Средняя**

```typescript
// В authStore есть структура, но в composables всё смешано
export function useTags() {
  const tags = ref([]);        // state
  const loading = ref(false);   // state
  const loadTags = async () => {...};  // action
  const getTagColors = () => {...};    // getter? utility?
}
```

### 5. Проблема с реактивностью в useNotes
**Критичность: Средняя**

`useNotes` принимает `Ref<Note[]>` и мутирует его напрямую:

```typescript
const createNote = async () => {
  notes.value.push(newNote);  // Мутация внешнего ref
};
```

Это работает, но создаёт неявную связь между компонентами.

### 6. Смешение бизнес-логики и хранения
**Критичность: Низкая**

`offlineStore` содержит и данные, и логику синхронизации, и сетевую логику.

---

## Оценка рисков

### Высокий риск
1. **Потеря данных при рассинхронизации** - разные экземпляры `notes` могут иметь разные данные
2. **Множественные API-запросы** - `useTags()` загружает теги при каждом монтировании компонента
3. **Race conditions** - несколько компонентов могут одновременно модифицировать данные

### Средний риск
1. **Сложность отладки** - непонятно, какой экземпляр состояния используется
2. **Регрессии при рефакторинге** - тесная связь через props и refs

### Низкий риск
1. **Увеличение bundle size** - добавление Pinia (~1.5KB gzipped)
2. **Обучение команды** - новый API для управления состоянием

---

## Рекомендуемый подход

### Вариант A: Внедрение Pinia (Рекомендуется)

**Плюсы:**
- Стандартное решение для Vue 3
- DevTools поддержка
- TypeScript из коробки
- Чёткое разделение state/getters/actions
- Поддержка модулей

**План миграции:**
1. Установить Pinia
2. Создать stores для каждого домена:
   - `useNotesStore` - заметки (из useStorage + useNotes)
   - `useAuthStore` - аутентификация (миграция authStore)
   - `useTagsStore` - теги (singleton)
   - `useRemindersStore` - напоминания (singleton)
   - `useDatabasesStore` - базы данных (singleton)
   - `useUIStore` - tabs, theme, UI state

3. Постепенная замена composables на store-обёртки
4. Удаление дублирования в App.vue/MainView.vue

### Вариант B: Унификация на базе reactive singleton

**Плюсы:**
- Не требует новых зависимостей
- Работает уже сейчас (authStore)

**План:**
1. Создать единый паттерн `createStore<T>(initialState)`
2. Мигрировать все composables на этот паттерн
3. Обеспечить singleton-поведение

---

## Структура после рефакторинга (Вариант A)

```
src/
├── stores/
│   ├── index.ts              # Pinia instance + все stores
│   ├── notesStore.ts         # Notes + folders
│   ├── authStore.ts          # Auth (миграция)
│   ├── tagsStore.ts          # Tags
│   ├── remindersStore.ts     # Reminders  
│   ├── databasesStore.ts     # Databases + records
│   └── uiStore.ts            # Tabs, theme, modals
│
├── composables/              # Только утилиты, не состояние
│   ├── useSearch.ts          # Computed на основе store
│   ├── useBacklinks.ts       # Computed на основе store
│   └── database/             # Утилиты для баз данных
│
└── components/               # Потребляют stores напрямую
```

---

## Критические файлы для изменения

1. **src/main.ts** - добавить Pinia
2. **src/stores/** - создать все stores
3. **src/App.vue** - убрать локальное состояние
4. **src/views/MainView.vue** - убрать дублирование, использовать stores
5. **src/composables/useStorage.ts** - мигрировать в notesStore
6. **src/composables/useTags.ts** - мигрировать в tagsStore
7. **src/composables/useDatabases.ts** - мигрировать в databasesStore
8. **src/composables/useReminders.ts** - мигрировать в remindersStore
9. **src/stores/authStore.ts** - мигрировать в Pinia формат

---

## Метрики успеха рефакторинга

1. **Единый паттерн** - все stores используют Pinia defineStore
2. **Нет дублирования состояния** - один источник правды для каждого домена
3. **Сокращение API-запросов** - данные загружаются один раз
4. **Чёткое разделение** - state/getters/actions в каждом store
5. **Улучшенная типизация** - TypeScript inference из stores

---

*Анализ выполнен: 2026-05-20*
*Ветка: refactoring/frontend-state-management-store-patterns-cb0cf3e4*
