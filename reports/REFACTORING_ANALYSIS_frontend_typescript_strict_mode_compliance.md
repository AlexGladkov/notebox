# Анализ рефакторинга: Frontend TypeScript strict mode compliance

**Дата анализа:** 2026-05-20  
**Ветка:** refactoring/frontend-typescript-strict-mode-compliance-54a7149d

## Обзор текущего состояния

### Конфигурация TypeScript

В проекте уже включён strict mode в `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

Однако при компиляции обнаружено **~80 TypeScript ошибок** в **~30 файлах**.

### Общая статистика ошибок

| Категория | Количество | Описание |
|-----------|------------|----------|
| TS6133/TS6196 | ~25 | Неиспользуемые переменные и импорты |
| TS7006 | ~20 | Implicit any (параметры без типов) |
| TS2322/TS2345 | ~15 | Type mismatch (несоответствие типов) |
| TS18047 | ~11 | Possibly null/undefined |
| TS2724 | ~6 | Некорректный экспорт (authStore vs useAuthStore) |
| TS2339/TS2551 | ~5 | Несуществующие свойства |
| TS2554 | ~3 | Неверное количество аргументов |

## Затронутые файлы и компоненты

### Критичные файлы (6+ ошибок)

| Файл | Ошибок | Основные проблемы |
|------|--------|-------------------|
| `src/components/BlockEditor/KanbanCard.vue` | 14 | `field` is possibly null, type predicate |
| `src/views/MainView.vue` | 7 | Неиспользуемые переменные |
| `src/stores/databasesStore.ts` | 6 | Неверные имена свойств, импорт ColumnType |
| `src/components/NoteEditor.vue` | 6 | ComputedRef вместо array, null vs undefined |
| `src/components/BlockEditor/DatabaseBlock.vue` | 6 | Несоответствие сигнатур функций |
| `src/composables/useFolders.ts` | 5 | Note vs Folder типы |

### Файлы со средним количеством ошибок (2-5)

- `src/components/BlockEditor.vue` (3)
- `src/components/BlockEditor/cells/SelectCell.vue` (3)
- `src/components/BlockEditor/cells/MultiSelectCell.vue` (3)
- `src/components/TabBar.vue` (2)
- `src/components/settings/AvatarUpload.vue` (2)
- `src/components/MoveNoteDialog.vue` (2)
- `src/components/graph/GraphCanvas.vue` (2)
- `src/components/BlockEditor/CsvImportDialog.vue` (2)

### Файлы с единичными ошибками

- `src/api/client.ts`
- `src/router/guards.ts`
- `src/views/LoginView.vue`
- `src/views/GraphView.vue`
- `src/composables/useTheme.ts`
- `src/composables/useQuickCapture.ts`
- `src/extensions/DatabaseExtension.ts`
- `src/components/common/SessionExpiredModal.vue`
- `src/components/settings/AppearanceSection.vue`
- `src/components/settings/ProfileSection.vue`
- `src/components/settings/SettingsModal.vue`

## Граф зависимостей затронутых модулей

```
┌──────────────────────────────────────────────────────────────────┐
│                         STORES                                    │
├──────────────────────────────────────────────────────────────────┤
│  authStore.ts ←── client.ts, guards.ts, LoginView.vue,           │
│                   SessionExpiredModal.vue, SettingsModal.vue,     │
│                   AppearanceSection.vue, ProfileSection.vue       │
│                                                                   │
│  databasesStore.ts ←── useDatabases.ts ←── DatabaseBlock.vue     │
│                                                                   │
│  remindersStore.ts ←── useReminders.ts ←── NoteEditor.vue        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         TYPES                                     │
├──────────────────────────────────────────────────────────────────┤
│  types/index.ts ──→ Note, Folder, ColumnType, Record, CellValue  │
│        │                                                          │
│        ├──→ types/database.ts ──→ DatabaseView, DatabaseFilter   │
│        │                                                          │
│        └──→ types/composables.ts ──→ UseFoldersReturn            │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      COMPOSABLES                                  │
├──────────────────────────────────────────────────────────────────┤
│  useFolders.ts ──→ Возвращает Note вместо Folder                 │
│  useReminders.ts ──→ Возвращает ComputedRef вместо Promise       │
│  useDatabases.ts ──→ Несоответствие сигнатур addColumn/updateColumn │
└──────────────────────────────────────────────────────────────────┘
```

## Детальный анализ проблем

### 1. Ошибка экспорта authStore (6 мест)

**Проблема:** Импортируется `authStore` вместо `useAuthStore`

**Файлы:**
- `src/api/client.ts:2`
- `src/router/guards.ts:2`
- `src/views/LoginView.vue:29`
- `src/components/common/SessionExpiredModal.vue:25`
- `src/components/settings/AppearanceSection.vue:74`
- `src/components/settings/ProfileSection.vue:72`
- `src/components/settings/SettingsModal.vue:35`

**Решение:** Заменить `import { authStore }` на `import { useAuthStore }` и вызывать `useAuthStore()` для получения store.

### 2. Неиспользуемые переменные (~25 мест)

**Типичные случаи:**
- Деструктуризация возвращает неиспользуемые значения
- Импортированные типы/функции не используются
- Устаревший код после рефакторинга

**Примеры:**
```typescript
// MainView.vue
const { loadNotes, deleteNote, getAllDescendants, getChildrenCount, ... } = useNotes();
// loadNotes, deleteNote и др. не используются

// useTheme.ts
import { computed, watch } from 'vue'; // computed не используется
```

**Решение:** Удалить неиспользуемые импорты и переменные, или использовать `_` префикс для намеренно игнорируемых.

### 3. Implicit any (TS7006) (~20 мест)

**Типичные случаи в массивах и callbacks:**
```typescript
// useFolders.ts
.filter(n => n.parentId === parentId)  // n: any
.sort((a, b) => a.title.localeCompare(b.title))  // a, b: any

// reminder/ReminderList.vue
.filter(r => r.remindAt > now)  // r: any
```

**Решение:** Добавить явную типизацию параметров.

### 4. Note vs Folder типы (useFolders.ts)

**Проблема:** Composable `useFolders` объявляет возврат `UseFoldersReturn`, который требует `Folder`, но реализация возвращает `Note`.

**Контекст:** Комментарий в `types/index.ts`:
```typescript
// УСТАРЕЛО: Интерфейс Folder больше не используется
// Папки теперь реализованы как страницы (Note с пустым content)
```

**Решение:** Обновить `UseFoldersReturn` интерфейс для использования `Note` вместо `Folder`.

### 5. Несоответствие сигнатур функций (DatabaseBlock.vue)

**Проблема:** Компонент вызывает `addColumn` и `updateColumn` с неправильными сигнатурами:
```typescript
// DatabaseBlock.vue вызывает:
await addColumn(databaseId, name, type, options);  // 4 аргумента
await updateColumn(databaseId, columnId, name, type, options);  // 5 аргументов

// Но store определяет:
addColumn(databaseId, columnData: { name, type, position, options })  // 2 аргумента
updateColumn(databaseId, columnId, updates: Partial<Column>)  // 3 аргумента
```

**Решение:** Привести вызовы к правильным сигнатурам или изменить API composable.

### 6. ComputedRef vs Promise (useReminders.ts → NoteEditor.vue)

**Проблема:**
```typescript
// useReminders.ts возвращает:
fetchRemindersByNoteId: (noteId: string) => computed(() => store.getRemindersByNoteId(noteId))

// NoteEditor.vue ожидает Promise:
const reminders = await fetchRemindersByNoteId(newNote.id);
noteReminder.value = reminders.length > 0 ? reminders[0] : null;
```

**Решение:** Изменить `fetchRemindersByNoteId` чтобы возвращал массив напрямую, или изменить использование в NoteEditor.

### 7. Possibly null в KanbanCard.vue (~11 мест)

**Проблема:** Переменная `field` может быть `null` после `.filter()`:
```typescript
const displayFields = computed(() => {
  return props.cardFields
    .map(columnId => {
      const column = props.database.columns.find(...);
      if (!column) return null;  // возможен null
      ...
    })
    .filter(field => field !== null && ...);  // field все ещё может быть null по мнению TS
});
```

**Решение:** Использовать type guard или улучшить типизацию filter.

### 8. CSSProperties несовместимость (SelectCell, MultiSelectCell, WikiLinkSuggestion)

**Проблема:** `position: string` не совместим с `Position | undefined`:
```typescript
style: { position: 'fixed', top: '100px', ... }  // position: string
```

**Решение:** Использовать `as const` или явно типизировать:
```typescript
style: { position: 'fixed' as const, ... }
```

### 9. Импорт ColumnType из неправильного модуля

**Проблема в databasesStore.ts:**
```typescript
import type { DatabaseView, ColumnType } from '../types/database';
// ColumnType экспортируется из '../types/index.ts', не из database.ts
```

**Решение:** Изменить импорт на правильный модуль.

### 10. DatabaseView свойства

**Проблема:** В store создаётся view с `filters`/`sorts`, но тип DatabaseView определяет `filter`/`sort`:
```typescript
// databasesStore.ts:254
filters: view.filters || [],  // должно быть filter
sorts: view.sorts || [],      // должно быть sort
groupBy: view.groupBy,        // не существует в типе
```

## Оценка рисков

### Низкий риск (простые исправления)

| Категория | Файлов | Сложность |
|-----------|--------|-----------|
| Неиспользуемые переменные | ~15 | Простое удаление |
| authStore → useAuthStore | 7 | Поиск/замена |
| Некорректные импорты | 2 | Перенос импорта |
| CSSProperties | 3 | Добавление `as const` |

### Средний риск (требует понимания логики)

| Категория | Файлов | Сложность |
|-----------|--------|-----------|
| Implicit any в callbacks | ~10 | Определение типов |
| Possibly null checks | 3 | Добавление guards |
| Свойства DatabaseView | 1 | Синхронизация с типами |

### Высокий риск (архитектурные изменения)

| Категория | Файлов | Сложность |
|-----------|--------|-----------|
| Note vs Folder | 2 | Изменение интерфейсов |
| Сигнатуры addColumn/updateColumn | 3 | Рефакторинг API |
| ComputedRef vs Promise | 2 | Изменение архитектуры |

## Рекомендуемый подход к исправлению

### Фаза 1: Быстрые исправления (низкий риск)

1. **Удаление неиспользуемых переменных и импортов**
   - ~25 изменений в ~15 файлах
   - Время: ~1 час

2. **Исправление authStore экспорта**
   - 7 файлов
   - Шаблон: `import { authStore }` → `const authStore = useAuthStore()`
   - Время: ~30 минут

3. **Исправление CSSProperties**
   - 3 файла
   - Добавление `as const` для position
   - Время: ~15 минут

### Фаза 2: Типизация (средний риск)

4. **Добавление типов для callback параметров**
   - ~10 файлов с implicit any
   - Использовать типы из `types/index.ts`
   - Время: ~1.5 часа

5. **Исправление null checks**
   - KanbanCard.vue: добавить type guards
   - BubbleMenu.vue: проверка null перед использованием
   - Время: ~45 минут

6. **Синхронизация DatabaseView свойств**
   - Исправить `filters` → `filter`, `sorts` → `sort`
   - Удалить несуществующее `groupBy`
   - Время: ~30 минут

### Фаза 3: Архитектурные изменения (высокий риск)

7. **Исправление useFolders типов**
   - Обновить `UseFoldersReturn` для использования `Note`
   - Или создать `NoteAsFolder` type alias
   - Время: ~1 час

8. **Исправление сигнатур addColumn/updateColumn**
   - Вариант A: Изменить вызовы в DatabaseBlock.vue
   - Вариант B: Добавить adapter функции в useDatabases
   - Время: ~1.5 часа

9. **Исправление useReminders API**
   - Изменить `fetchRemindersByNoteId` для возврата Promise
   - Обновить все места использования
   - Время: ~1 час

## Общая оценка времени

| Фаза | Время | Файлов |
|------|-------|--------|
| Фаза 1 | ~2 часа | ~20 |
| Фаза 2 | ~2.5 часа | ~15 |
| Фаза 3 | ~3.5 часа | ~7 |
| **Итого** | **~8 часов** | **~30** |

## Дополнительные рекомендации

### После исправления всех ошибок

1. Добавить проверку TypeScript в CI/CD:
   ```json
   "scripts": {
     "typecheck": "vue-tsc --noEmit",
     "build": "vue-tsc --noEmit && vite build"
   }
   ```

2. Рассмотреть включение дополнительных проверок:
   ```json
   "compilerOptions": {
     "noImplicitReturns": true,
     "noUncheckedIndexedAccess": true
   }
   ```

### Предотвращение регрессий

1. Настроить pre-commit hook с `vue-tsc --noEmit`
2. Использовать ESLint с `@typescript-eslint` правилами
3. Документировать типы для всех public API composables
