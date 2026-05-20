# Анализ рефакторинга: Удаление мёртвого кода и очистка зависимостей

**Дата анализа:** 2026-05-20  
**Ветка:** refactoring/dead-code-removal-dependency-cleanup-b08a5d21  
**Статус:** Анализ завершён

---

## 1. Обзор текущей архитектуры

Проект **Notebox** представляет собой fullstack приложение:
- **Frontend:** Vue 3 + TypeScript + Pinia + TipTap editor
- **Backend:** Kotlin + Spring Boot + Exposed ORM

Кодовая база содержит значительное количество мёртвого кода, возникшего в результате рефакторинга системы папок (Folders → Notes).

---

## 2. Выявленный мёртвый код

### 2.1 Frontend — Неиспользуемые composables

| Файл | Статус | Причина |
|------|--------|---------|
| `src/composables/useFolders.ts` | ❌ МЁРТВЫЙ | Никогда не импортируется (папки реализованы через Notes) |
| `src/composables/utils/useCrud.ts` | ❌ МЁРТВЫЙ | Экспортируется но не импортируется |
| `src/composables/utils/useLocalStorageFallback.ts` | ❌ МЁРТВЫЙ | Экспортируется но не импортируется |
| `src/composables/utils/index.ts` | ❌ МЁРТВЫЙ | Barrel-файл без потребителей |
| `src/composables/database/index.ts` | ❌ МЁРТВЫЙ | Barrel-файл без потребителей |

### 2.2 Frontend — Неиспользуемые утилиты

| Файл | Экспорт | Статус |
|------|---------|--------|
| `src/utils/markdown.ts` | `renderMarkdown()` | ❌ МЁРТВЫЙ — ни одного импорта |
| `src/utils/markdownToBlocks.ts` | `markdownToBlocks()` | ❌ МЁРТВЫЙ — ни одного импорта |

### 2.3 Frontend — Неиспользуемые API функции

| Файл | Функция | Статус |
|------|---------|--------|
| `src/api/folders.ts` | `foldersApi` (целиком) | ❌ МЁРТВЫЙ — экспортируется в index.ts, но никогда не используется |
| `src/api/reminders.ts` | `getByNoteId()` | ❌ МЁРТВЫЙ — store фильтрует клиентски |
| `src/api/notes.ts` | `getRootNotes()` | ❌ МЁРТВЫЙ — нет вызовов |
| `src/api/databases.ts` | `getRelatedNotes()` | ❌ МЁРТВЫЙ — нет вызовов |

### 2.4 Frontend — Неиспользуемые Vue компоненты

| Компонент | Путь | Причина |
|-----------|------|---------|
| `Breadcrumbs.vue` | `src/components/` | Не импортируется, не в роутере |
| `DeleteNoteDialog.vue` | `src/components/` | Не импортируется, не в роутере |
| `MoveNoteDialog.vue` | `src/components/` | Не импортируется, не в роутере |
| `NoteList.vue` | `src/components/` | Не импортируется, не в роутере |
| `ReminderList.vue` | `src/components/reminder/` | Не импортируется, не в роутере |
| `Sidebar.vue` | `src/components/` | Заменён на `UnifiedSidebar.vue` |

### 2.5 Frontend — Неиспользуемые npm зависимости

| Пакет | Статус | Комментарий |
|-------|--------|-------------|
| `@tiptap/extension-bubble-menu` | ⚠️ НЕ ИМПОРТИРУЕТСЯ | `BubbleMenu` импортируется из `@tiptap/vue-3` |
| `@tiptap/extension-floating-menu` | ❌ НЕ ИМПОРТИРУЕТСЯ | Полностью не используется |

### 2.6 Backend — Неиспользуемый domain (Kotlin)

**Весь пакет `domain/folder` является мёртвым кодом:**

| Файл | Класс | Статус |
|------|-------|--------|
| `server/src/main/kotlin/com/notebox/domain/folder/FolderController.kt` | `@RestController` | ❌ МЁРТВЫЙ |
| `server/src/main/kotlin/com/notebox/domain/folder/FolderService.kt` | `@Service` | ❌ МЁРТВЫЙ |
| `server/src/main/kotlin/com/notebox/domain/folder/FolderRepository.kt` | `@Repository` | ❌ МЁРТВЫЙ |
| `server/src/main/kotlin/com/notebox/domain/folder/Folder.kt` | data class | ❌ МЁРТВЫЙ |
| `server/src/main/kotlin/com/notebox/domain/folder/FoldersTable.kt` | Exposed Table | ❌ МЁРТВЫЙ |

**Причина:** Папки были переделаны как специальные заметки (Notes с пустым content). Комментарий в `useFolders.ts`: *"Папки теперь реализованы как заметки (Note)"*

### 2.7 Дублированный код

| Функция | Местоположение | Дублирование |
|---------|---------------|--------------|
| `getColorNameFromHex()` | `tagsStore.ts` | Дублируется в 5+ компонентах: DatabaseFilter.vue, KanbanCard.vue, KanbanColumn.vue, MultiSelectCell.vue, SelectCell.vue |

---

## 3. Граф зависимостей мёртвого кода

```
┌─────────────────────────────────────────────────────────────┐
│                    МЁРТВЫЙ КОД FRONTEND                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  src/api/folders.ts ──────┬───► ЭКСПОРТ в index.ts          │
│                           │     (но никто не импортирует)   │
│                           │                                 │
│  src/composables/         │                                 │
│    useFolders.ts ─────────┴───► ИЗОЛИРОВАН                  │
│    utils/useCrud.ts ──────────► ИЗОЛИРОВАН                  │
│    utils/useLocalStorage..────► ИЗОЛИРОВАН                  │
│                                                             │
│  src/utils/                                                 │
│    markdown.ts ───────────────► ИЗОЛИРОВАН                  │
│    markdownToBlocks.ts ───────► ИЗОЛИРОВАН                  │
│                                                             │
│  src/components/                                            │
│    Sidebar.vue ───────────────► ЗАМЕНЁН UnifiedSidebar.vue  │
│    Breadcrumbs.vue ───────────► ИЗОЛИРОВАН                  │
│    DeleteNoteDialog.vue ──────► ИЗОЛИРОВАН                  │
│    MoveNoteDialog.vue ────────► ИЗОЛИРОВАН                  │
│    NoteList.vue ──────────────► ИЗОЛИРОВАН                  │
│    reminder/ReminderList.vue ─► ИЗОЛИРОВАН                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    МЁРТВЫЙ КОД BACKEND                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  domain/folder/                                             │
│    FolderController.kt ───┐                                 │
│    FolderService.kt ──────┼───► ВСЕ ИЗОЛИРОВАНЫ             │
│    FolderRepository.kt ───┤     (Spring создаёт бины,       │
│    Folder.kt ─────────────┤      но они не вызываются)      │
│    FoldersTable.kt ───────┘                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Оценка рисков

### 4.1 Низкий риск (можно удалять безопасно)

| Элемент | Риск | Обоснование |
|---------|------|-------------|
| Весь `domain/folder/` (backend) | 🟢 Низкий | Полностью изолирован, никаких зависимостей |
| `src/api/folders.ts` | 🟢 Низкий | Нет вызовов |
| `src/composables/useFolders.ts` | 🟢 Низкий | Нет импортов |
| `src/utils/markdown.ts` | 🟢 Низкий | Нет импортов |
| `src/utils/markdownToBlocks.ts` | 🟢 Низкий | Нет импортов |
| Неиспользуемые компоненты | 🟢 Низкий | Нет импортов, нет в роутере |
| `@tiptap/extension-floating-menu` | 🟢 Низкий | Нет импортов |

### 4.2 Средний риск (требует проверки)

| Элемент | Риск | Обоснование |
|---------|------|-------------|
| `@tiptap/extension-bubble-menu` | 🟡 Средний | Может быть peer dependency для @tiptap/vue-3 |
| Методы API (`getRootNotes`, `getByNoteId`, `getRelatedNotes`) | 🟡 Средний | Могут использоваться в будущей функциональности |

### 4.3 Что может сломаться

1. **TypeScript компиляция** — в проекте уже есть ошибки компиляции (strict mode), удаление кода не ухудшит ситуацию
2. **Barrel exports** — при удалении `foldersApi` нужно обновить `src/api/index.ts`
3. **Типы** — `Folder` тип в `src/types/` может использоваться, требует проверки

---

## 5. Статистика мёртвого кода

| Категория | Количество | Строк кода (примерно) |
|-----------|------------|----------------------|
| Backend файлов (Kotlin) | 5 | ~400 |
| Frontend composables | 5 | ~200 |
| Frontend utils | 2 | ~100 |
| Frontend API | 1 файл + 3 функции | ~60 |
| Frontend компоненты | 6 | ~800 |
| npm зависимости | 2 | — |
| **ИТОГО** | ~19 файлов | ~1560 строк |

---

## 6. Рекомендуемый план действий

### Фаза 1: Удаление backend мёртвого кода
1. Удалить директорию `server/src/main/kotlin/com/notebox/domain/folder/`
2. Убедиться что Spring Boot приложение запускается
3. Проверить что миграция БД не создаёт таблицу `folders`

### Фаза 2: Удаление frontend мёртвого кода
1. Удалить `src/api/folders.ts`
2. Обновить `src/api/index.ts` (убрать экспорт foldersApi)
3. Удалить `src/composables/useFolders.ts`
4. Удалить `src/composables/utils/` директорию целиком
5. Удалить `src/composables/database/index.ts` (если есть)
6. Удалить `src/utils/markdown.ts`
7. Удалить `src/utils/markdownToBlocks.ts`

### Фаза 3: Удаление неиспользуемых компонентов
1. Удалить `src/components/Sidebar.vue`
2. Удалить `src/components/Breadcrumbs.vue`
3. Удалить `src/components/DeleteNoteDialog.vue`
4. Удалить `src/components/MoveNoteDialog.vue`
5. Удалить `src/components/NoteList.vue`
6. Удалить `src/components/reminder/ReminderList.vue`

### Фаза 4: Удаление неиспользуемых API методов
1. Удалить `getRootNotes()` из `src/api/notes.ts`
2. Удалить `getByNoteId()` из `src/api/reminders.ts`
3. Удалить `getRelatedNotes()` из `src/api/databases.ts`

### Фаза 5: Очистка зависимостей
1. Удалить `@tiptap/extension-floating-menu` из package.json
2. Проверить peer dependencies для `@tiptap/extension-bubble-menu`
3. Выполнить `npm install` для обновления package-lock.json

### Фаза 6: Проверка типов
1. Проверить использование типа `Folder` в `src/types/`
2. Удалить неиспользуемые типы
3. Запустить `npm run build` для проверки

---

## 7. Дополнительные улучшения (опционально)

### Устранение дублирования кода
Функция `getColorNameFromHex()` дублируется в 5+ компонентах. Рекомендуется:
1. Использовать версию из `tagsStore`
2. Или вынести в отдельную утилиту `src/utils/colors.ts`

### Удаление неиспользуемых store actions
- `databasesStore.loadDatabases()` — вызывается но не используется результат
- `remindersStore.getUpcomingReminders()` action — есть getter с тем же именем

---

## 8. Контрольный список перед удалением

- [ ] Создать резервную ветку
- [ ] Запустить все существующие тесты
- [ ] Проверить TypeScript компиляцию (`npx tsc --noEmit`)
- [ ] Проверить Vite build (`npm run build`)
- [ ] Запустить backend (`./gradlew bootRun`)
- [ ] Проверить работу приложения в браузере
- [ ] Commit каждого этапа отдельно для удобства отката

---

## 9. Заключение

Проект содержит **~1560 строк мёртвого кода** в 19 файлах. Основная причина — незавершённый рефакторинг системы папок (Folders → Notes), при котором старый код не был удалён.

**Приоритет удаления:**
1. 🔴 **Критический:** `domain/folder/` (backend) — полностью неиспользуемый domain
2. 🟠 **Высокий:** `foldersApi`, `useFolders` — связанный frontend код
3. 🟡 **Средний:** Неиспользуемые компоненты и утилиты
4. 🟢 **Низкий:** npm зависимости (требует дополнительной проверки)

Удаление мёртвого кода улучшит:
- Читаемость кодовой базы
- Время сборки
- Размер бандла
- Поддерживаемость проекта
