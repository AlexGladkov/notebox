# План рефакторинга: Frontend TypeScript strict mode compliance

**Дата создания:** 2026-05-20  
**Ветка:** refactoring/frontend-typescript-strict-mode-compliance-54a7149d  
**Статус:** Готов к выполнению

## Резюме

### Что будет сделано
Исправление ~80 TypeScript ошибок в ~30 файлах frontend для полного соответствия strict mode. TypeScript strict mode уже включён в `tsconfig.json`, но компиляция выявляет ошибки, которые блокируют type checking.

### Зачем это нужно
- Гарантия типобезопасности на этапе компиляции
- Предотвращение runtime ошибок, связанных с null/undefined
- Улучшение автодополнения и рефакторинга в IDE
- Возможность включения `vue-tsc --noEmit` в CI/CD pipeline

### Ожидаемый результат
- `npm run build` и `vue-tsc --noEmit` выполняются без ошибок
- Все типы явно указаны, нет implicit any
- Все потенциальные null/undefined обработаны

---

## Шаги выполнения

### Группа 1: Исправление экспорта authStore (Critical)

**Проблема:** Импортируется несуществующий `authStore` вместо `useAuthStore`

#### Шаг 1.1: src/api/client.ts
- Заменить `import { authStore }` на `import { useAuthStore }`
- Добавить `const authStore = useAuthStore()` внутри функции где используется

#### Шаг 1.2: src/router/guards.ts
- Заменить `import { authStore }` на `import { useAuthStore }`
- Вызывать `useAuthStore()` внутри guard функций

#### Шаг 1.3: src/views/LoginView.vue
- Заменить `import { authStore }` на `import { useAuthStore }`
- Добавить `const authStore = useAuthStore()` в setup

#### Шаг 1.4: src/components/common/SessionExpiredModal.vue
- Заменить `import { authStore }` на `import { useAuthStore }`
- Добавить `const authStore = useAuthStore()` в setup

#### Шаг 1.5: src/components/settings/AppearanceSection.vue
- Заменить `import { authStore }` на `import { useAuthStore }`
- Добавить `const authStore = useAuthStore()` в setup

#### Шаг 1.6: src/components/settings/ProfileSection.vue
- Заменить `import { authStore }` на `import { useAuthStore }`
- Добавить `const authStore = useAuthStore()` в setup

#### Шаг 1.7: src/components/settings/SettingsModal.vue
- Заменить `import { authStore }` на `import { useAuthStore }`
- Добавить `const authStore = useAuthStore()` в setup

---

### Группа 2: Исправление типов и импортов в stores (High)

#### Шаг 2.1: src/stores/databasesStore.ts - исправить импорт ColumnType
- Изменить `import type { DatabaseView, ColumnType } from '../types/database'`
- На `import type { DatabaseView } from '../types/database'` и `import type { ColumnType } from '../types'`

#### Шаг 2.2: src/stores/databasesStore.ts - исправить свойства DatabaseView
- Заменить `filters:` на `filter:` 
- Заменить `sorts:` на `sort:`
- Удалить `groupBy:` (не существует в типе)

#### Шаг 2.3: src/stores/databasesStore.ts - исправить имена свойств Column
- Проверить и исправить несоответствие имён свойств в Column type

---

### Группа 3: Исправление сигнатур функций (High)

#### Шаг 3.1: src/components/BlockEditor/DatabaseBlock.vue - addColumn
Изменить вызов:
```typescript
// Было:
await addColumn(databaseId, name, type, options)
// Стало:
await addColumn(databaseId, { name, type, options })
```

#### Шаг 3.2: src/components/BlockEditor/DatabaseBlock.vue - updateColumn
Изменить вызов:
```typescript
// Было:
await updateColumn(databaseId, columnId, name, type, options)
// Стало:
await updateColumn(databaseId, columnId, { name, type, options })
```

#### Шаг 3.3: src/composables/useDatabases.ts - проверить экспортируемые сигнатуры
- Убедиться что `addColumn` и `updateColumn` соответствуют store API
- При необходимости создать wrapper функции для обратной совместимости

---

### Группа 4: Исправление Note vs Folder типов (High)

#### Шаг 4.1: src/types/composables.ts - обновить UseFoldersReturn
- Изменить `Folder` на `Note` во всех местах интерфейса:
  - `folders: ComputedRef<Note[]>`
  - `createFolder: (name: string, parentId?: string) => Promise<Note>`
  - и другие методы

#### Шаг 4.2: src/composables/useFolders.ts - проверить соответствие
- Проверить что возвращаемые типы соответствуют обновлённому интерфейсу

---

### Группа 5: Исправление useReminders API (High)

#### Шаг 5.1: src/composables/useReminders.ts - fetchRemindersByNoteId
- Изменить функцию чтобы возвращала `Reminder[]` вместо `ComputedRef`:
```typescript
// Было:
fetchRemindersByNoteId: (noteId: string) => computed(() => store.getRemindersByNoteId(noteId))
// Стало:
fetchRemindersByNoteId: (noteId: string) => store.getRemindersByNoteId(noteId)
```

#### Шаг 5.2: src/components/NoteEditor.vue - обновить использование
- Убрать `await` если функция синхронная, или оставить если добавлен async
- Исправить обработку результата согласно новому типу

---

### Группа 6: Исправление null checks (High)

#### Шаг 6.1: src/components/BlockEditor/KanbanCard.vue - displayFields
- Добавить type guard после filter для исключения null:
```typescript
.filter((field): field is NonNullable<typeof field> => field !== null)
```

#### Шаг 6.2: src/components/BlockEditor/KanbanCard.vue - все field доступы
- Добавить optional chaining `field?.value` где необходимо
- Или добавить early return/guard перед использованием

---

### Группа 7: Добавление типов для callback параметров (Medium)

#### Шаг 7.1: src/composables/useFolders.ts
- Добавить типы в filter/sort callbacks:
```typescript
.filter((n: Note) => n.parentId === parentId)
.sort((a: Note, b: Note) => a.title.localeCompare(b.title))
```

#### Шаг 7.2: src/components/BlockEditor/KanbanCard.vue
- Типизировать все callback параметры в map/filter/reduce

#### Шаг 7.3: src/components/reminder/ReminderList.vue
- Добавить тип для reminder в callbacks:
```typescript
.filter((r: Reminder) => r.remindAt > now)
```

#### Шаг 7.4: src/views/MainView.vue
- Типизировать все callback параметры

#### Шаг 7.5: Другие файлы с implicit any
- Пройтись по всем файлам из анализа с TS7006 ошибками
- Добавить явные типы для callback параметров

---

### Группа 8: CSSProperties типизация (Medium)

#### Шаг 8.1: src/components/BlockEditor/cells/SelectCell.vue
- Добавить `as const` для position в style объекте:
```typescript
style: { position: 'fixed' as const, top: '100px', ... }
```

#### Шаг 8.2: src/components/BlockEditor/cells/MultiSelectCell.vue
- Аналогичное исправление для position

#### Шаг 8.3: src/components/WikiLinkSuggestion.vue (если есть)
- Проверить и исправить CSSProperties

---

### Группа 9: Удаление неиспользуемых переменных и импортов (Medium)

#### Шаг 9.1: src/views/MainView.vue
- Удалить неиспользуемые деструктуризированные переменные из useNotes
- Оставить только используемые функции

#### Шаг 9.2: src/composables/useTheme.ts
- Удалить `computed` из импорта если не используется

#### Шаг 9.3: Все файлы с TS6133/TS6196
Пройтись по списку:
- `src/components/BlockEditor.vue`
- `src/components/TabBar.vue`
- `src/components/MoveNoteDialog.vue`
- `src/components/graph/GraphCanvas.vue`
- `src/components/BlockEditor/CsvImportDialog.vue`
- `src/views/GraphView.vue`
- `src/composables/useQuickCapture.ts`
- `src/extensions/DatabaseExtension.ts`
- Другие файлы из анализа

Для каждого:
- Удалить неиспользуемый импорт/переменную
- ИЛИ добавить `_` префикс если переменная намеренно игнорируется

---

### Группа 10: Финальные проверки (Low)

#### Шаг 10.1: src/components/settings/AvatarUpload.vue
- Исправить type mismatch ошибки

#### Шаг 10.2: src/components/BlockEditor/CsvImportDialog.vue
- Исправить оставшиеся type ошибки

#### Шаг 10.3: Запуск финальной проверки
```bash
npx vue-tsc --noEmit
```
- Исправить любые оставшиеся ошибки

---

## Файлы для модификации

| Файл | Изменения |
|------|-----------|
| `src/api/client.ts` | authStore → useAuthStore |
| `src/router/guards.ts` | authStore → useAuthStore |
| `src/views/LoginView.vue` | authStore → useAuthStore |
| `src/views/MainView.vue` | Удаление неиспользуемых переменных, типизация |
| `src/views/GraphView.vue` | Удаление неиспользуемых переменных |
| `src/stores/databasesStore.ts` | Импорты, свойства DatabaseView |
| `src/components/common/SessionExpiredModal.vue` | authStore → useAuthStore |
| `src/components/settings/AppearanceSection.vue` | authStore → useAuthStore |
| `src/components/settings/ProfileSection.vue` | authStore → useAuthStore |
| `src/components/settings/SettingsModal.vue` | authStore → useAuthStore |
| `src/components/settings/AvatarUpload.vue` | Type mismatch |
| `src/components/BlockEditor.vue` | Неиспользуемые переменные |
| `src/components/BlockEditor/KanbanCard.vue` | Null checks, типизация callbacks |
| `src/components/BlockEditor/DatabaseBlock.vue` | Сигнатуры функций |
| `src/components/BlockEditor/cells/SelectCell.vue` | CSSProperties |
| `src/components/BlockEditor/cells/MultiSelectCell.vue` | CSSProperties |
| `src/components/BlockEditor/CsvImportDialog.vue` | Type fixes |
| `src/components/NoteEditor.vue` | useReminders API |
| `src/components/TabBar.vue` | Неиспользуемые переменные |
| `src/components/MoveNoteDialog.vue` | Неиспользуемые переменные |
| `src/components/graph/GraphCanvas.vue` | Неиспользуемые переменные |
| `src/composables/useFolders.ts` | Note типы, callback типизация |
| `src/composables/useReminders.ts` | API изменения |
| `src/composables/useDatabases.ts` | Сигнатуры функций |
| `src/composables/useTheme.ts` | Неиспользуемые импорты |
| `src/composables/useQuickCapture.ts` | Неиспользуемые переменные |
| `src/types/composables.ts` | Note вместо Folder |
| `src/extensions/DatabaseExtension.ts` | Неиспользуемые переменные |

## Файлы для создания

Нет новых файлов.

## Файлы для удаления

Нет файлов для удаления.

## Миграция данных

Не требуется — изменения только на уровне типов.

## Стратегия тестирования

### Автоматическая проверка

1. **TypeScript компиляция:**
   ```bash
   npx vue-tsc --noEmit
   ```
   Должна пройти без ошибок.

2. **Сборка проекта:**
   ```bash
   npm run build
   ```
   Должна завершиться успешно.

3. **Запуск существующих тестов:**
   ```bash
   npm test
   ```
   Все тесты должны пройти.

### Ручная проверка

1. **Основные пользовательские сценарии:**
   - Логин/логаут
   - Создание/редактирование заметок
   - Работа с папками
   - Работа с базами данных (Kanban, таблицы)
   - Работа с напоминаниями
   - Настройки профиля и appearance

2. **Критичные компоненты:**
   - `NoteEditor` — редактирование работает
   - `DatabaseBlock` — добавление/изменение колонок работает
   - `KanbanCard` — карточки отображаются корректно
   - `LoginView` — авторизация работает

## Оценка рисков

### Высокий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| useReminders API | Может сломать работу напоминаний | Тщательно проверить все места использования |
| addColumn/updateColumn сигнатуры | Может сломать создание колонок | Протестировать через UI |

### Средний риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Note vs Folder типы | Может вызвать новые type ошибки | Проверить все импорты UseFoldersReturn |
| Null checks в KanbanCard | Может изменить поведение отображения | Визуальная проверка kanban view |

### Низкий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| authStore → useAuthStore | Минимальный | Простое переименование |
| Удаление неиспользуемых переменных | Минимальный | Не влияет на runtime |
| CSSProperties as const | Минимальный | Только типизация |

## Порядок выполнения

```
[Critical] Группа 1: authStore экспорт (7 файлов)
     ↓
[High] Группа 2: databasesStore типы (1 файл)
     ↓
[High] Группа 3: Сигнатуры функций (2-3 файла)
     ↓
[High] Группа 4: Note vs Folder (2 файла)
     ↓
[High] Группа 5: useReminders API (2 файла)
     ↓
[High] Группа 6: Null checks (1 файл)
     ↓
[Medium] Группа 7: Implicit any (5-10 файлов)
     ↓
[Medium] Группа 8: CSSProperties (2-3 файла)
     ↓
[Medium] Группа 9: Неиспользуемые переменные (10-15 файлов)
     ↓
[Low] Группа 10: Финальные проверки
```

## Критерии завершения

- [ ] `npx vue-tsc --noEmit` выполняется без ошибок
- [ ] `npm run build` успешно завершается
- [ ] `npm test` проходит все тесты
- [ ] Основные пользовательские сценарии работают
- [ ] Код-ревью подтверждает корректность изменений
