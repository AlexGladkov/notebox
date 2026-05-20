# План рефакторинга: Удаление мёртвого кода и очистка зависимостей

**Дата создания:** 2026-05-20  
**Основа:** `reports/REFACTORING_ANALYSIS_dead_code_removal_dependency_cleanup.md`  
**Статус:** Готов к выполнению

---

## Краткое содержание

**Цель:** Удалить ~1560 строк мёртвого кода из 19 файлов, возникшего после рефакторинга системы папок (Folders → Notes).

**Что будет удалено:**
- Backend: весь пакет `domain/folder/` (5 файлов Kotlin)
- Frontend: неиспользуемые composables, API, утилиты, компоненты (14 файлов)
- npm зависимости: 1-2 пакета TipTap

**Ожидаемый результат:**
- Уменьшение размера кодовой базы
- Уменьшение размера бандла
- Улучшение читаемости и поддерживаемости

---

## Шаги выполнения

### Группа A: Backend — Удаление domain/folder (Critical)

**Шаг 1.** Удалить файл `server/src/main/kotlin/com/notebox/domain/folder/FolderController.kt`
- Содержит: `@RestController` для /api/folders endpoints
- Причина: API никогда не вызывается с frontend

**Шаг 2.** Удалить файл `server/src/main/kotlin/com/notebox/domain/folder/FolderService.kt`
- Содержит: `@Service` с бизнес-логикой папок
- Причина: Не вызывается никаким контроллером

**Шаг 3.** Удалить файл `server/src/main/kotlin/com/notebox/domain/folder/FolderRepository.kt`
- Содержит: `@Repository` для работы с БД
- Причина: Не используется сервисами

**Шаг 4.** Удалить файл `server/src/main/kotlin/com/notebox/domain/folder/Folder.kt`
- Содержит: data class Folder
- Причина: Модель не используется

**Шаг 5.** Удалить файл `server/src/main/kotlin/com/notebox/domain/folder/FoldersTable.kt`
- Содержит: Exposed Table definition
- Причина: Таблица не используется

**Шаг 6.** Удалить директорию `server/src/main/kotlin/com/notebox/domain/folder/` (если осталась пустой)

---

### Группа B: Frontend API — Удаление folders API (High)

**Шаг 7.** Удалить файл `src/api/folders.ts`
- Содержит: `foldersApi` с методами для работы с папками
- Причина: Ни один метод не вызывается

**Шаг 8.** Обновить файл `src/api/index.ts`
- Изменение: Удалить строку `export * from './folders'` или `export { foldersApi } from './folders'`
- Причина: Файл удалён, экспорт станет ошибкой

---

### Группа C: Frontend Composables — Удаление неиспользуемых (High)

**Шаг 9.** Удалить файл `src/composables/useFolders.ts`
- Содержит: Composable для работы с папками
- Причина: Комментарий в файле: "Папки теперь реализованы как заметки"

**Шаг 10.** Удалить файл `src/composables/utils/useCrud.ts`
- Содержит: Generic CRUD composable
- Причина: Экспортируется но никогда не импортируется

**Шаг 11.** Удалить файл `src/composables/utils/useLocalStorageFallback.ts`
- Содержит: localStorage fallback логика
- Причина: Экспортируется но никогда не импортируется

**Шаг 12.** Удалить файл `src/composables/utils/index.ts`
- Содержит: Barrel export файл
- Причина: Нет потребителей этих экспортов

**Шаг 13.** Удалить директорию `src/composables/utils/` (если осталась пустой)

**Шаг 14.** Удалить файл `src/composables/database/index.ts`
- Содержит: Barrel export файл (если существует)
- Причина: Нет потребителей
- Примечание: Проверить существование перед удалением

---

### Группа D: Frontend Утилиты — Удаление неиспользуемых (Medium)

**Шаг 15.** Удалить файл `src/utils/markdown.ts`
- Содержит: `renderMarkdown()` функция
- Причина: Ни одного импорта в проекте

**Шаг 16.** Удалить файл `src/utils/markdownToBlocks.ts`
- Содержит: `markdownToBlocks()` функция
- Причина: Ни одного импорта в проекте

---

### Группа E: Frontend Компоненты — Удаление неиспользуемых (Medium)

**Шаг 17.** Удалить файл `src/components/Sidebar.vue`
- Содержит: Старый компонент боковой панели
- Причина: Заменён на `UnifiedSidebar.vue`

**Шаг 18.** Удалить файл `src/components/Breadcrumbs.vue`
- Содержит: Компонент хлебных крошек
- Причина: Не импортируется, не в роутере

**Шаг 19.** Удалить файл `src/components/DeleteNoteDialog.vue`
- Содержит: Диалог удаления заметки
- Причина: Не импортируется, не используется

**Шаг 20.** Удалить файл `src/components/MoveNoteDialog.vue`
- Содержит: Диалог перемещения заметки
- Причина: Не импортируется, не используется

**Шаг 21.** Удалить файл `src/components/NoteList.vue`
- Содержит: Компонент списка заметок
- Причина: Не импортируется, не используется

**Шаг 22.** Удалить файл `src/components/reminder/ReminderList.vue`
- Содержит: Компонент списка напоминаний
- Причина: Не импортируется, не используется

---

### Группа F: Frontend API методы — Удаление неиспользуемых функций (Medium)

**Шаг 23.** В файле `src/api/notes.ts` удалить функцию `getRootNotes()`
- Причина: Нет вызовов этой функции

**Шаг 24.** В файле `src/api/reminders.ts` удалить функцию `getByNoteId()`
- Причина: Store фильтрует на клиенте, функция не используется

**Шаг 25.** В файле `src/api/databases.ts` удалить функцию `getRelatedNotes()`
- Причина: Нет вызовов этой функции

---

### Группа G: npm зависимости — Очистка (Low)

**Шаг 26.** Удалить `@tiptap/extension-floating-menu` из `package.json`
- Причина: Пакет не импортируется нигде в проекте

**Шаг 27.** Проверить `@tiptap/extension-bubble-menu`
- Действие: Проверить является ли peer dependency для `@tiptap/vue-3`
- Если нет peer dependency → удалить из package.json
- Если peer dependency → оставить

**Шаг 28.** Выполнить `npm install` для обновления `package-lock.json`

---

### Группа H: Проверка и валидация

**Шаг 29.** Запустить проверку TypeScript: `npx tsc --noEmit`
- Ожидание: Компиляция без новых ошибок (существующие strict mode ошибки допустимы)

**Шаг 30.** Запустить сборку фронтенда: `npm run build`
- Ожидание: Успешная сборка

---

## Файлы к изменению

### Файлы для удаления (полностью)

| Файл | Группа |
|------|--------|
| `server/src/main/kotlin/com/notebox/domain/folder/FolderController.kt` | A |
| `server/src/main/kotlin/com/notebox/domain/folder/FolderService.kt` | A |
| `server/src/main/kotlin/com/notebox/domain/folder/FolderRepository.kt` | A |
| `server/src/main/kotlin/com/notebox/domain/folder/Folder.kt` | A |
| `server/src/main/kotlin/com/notebox/domain/folder/FoldersTable.kt` | A |
| `src/api/folders.ts` | B |
| `src/composables/useFolders.ts` | C |
| `src/composables/utils/useCrud.ts` | C |
| `src/composables/utils/useLocalStorageFallback.ts` | C |
| `src/composables/utils/index.ts` | C |
| `src/utils/markdown.ts` | D |
| `src/utils/markdownToBlocks.ts` | D |
| `src/components/Sidebar.vue` | E |
| `src/components/Breadcrumbs.vue` | E |
| `src/components/DeleteNoteDialog.vue` | E |
| `src/components/MoveNoteDialog.vue` | E |
| `src/components/NoteList.vue` | E |
| `src/components/reminder/ReminderList.vue` | E |

### Файлы для модификации

| Файл | Изменение |
|------|-----------|
| `src/api/index.ts` | Удалить экспорт `foldersApi` |
| `src/api/notes.ts` | Удалить функцию `getRootNotes()` |
| `src/api/reminders.ts` | Удалить функцию `getByNoteId()` |
| `src/api/databases.ts` | Удалить функцию `getRelatedNotes()` |
| `package.json` | Удалить `@tiptap/extension-floating-menu` |

---

## Файлы для создания

Нет новых файлов.

---

## Файлы для удаления

См. таблицу выше (18 файлов).

---

## Миграция данных

**Миграция не требуется.**

Таблица `folders` в базе данных:
- Если существует — оставить для совместимости, данные могут быть нужны
- Удаление таблицы — отдельная задача (требует database migration)

---

## Стратегия тестирования

### Автоматическое тестирование
1. TypeScript компиляция: `npx tsc --noEmit`
2. Vite сборка: `npm run build`
3. Backend компиляция: `./gradlew compileKotlin` (если доступно)

### Ручная верификация
1. Запустить dev server: `npm run dev`
2. Проверить основные сценарии:
   - Создание заметки
   - Редактирование заметки
   - Открытие UnifiedSidebar
   - Работа с напоминаниями (если есть UI)
3. Проверить консоль браузера на отсутствие ошибок импорта

### Что НЕ должно сломаться
- Все существующие страницы должны открываться
- UnifiedSidebar должен работать (заменил старый Sidebar)
- CRUD операции с заметками
- TipTap редактор

---

## Оценка рисков

### Низкий риск
| Элемент | Митигация |
|---------|-----------|
| Backend folder domain | Полностью изолирован, нет зависимостей |
| Frontend folders API | Нет вызовов, только экспорт |
| Неиспользуемые composables | Нет импортов |
| Неиспользуемые компоненты | Нет импортов, нет в роутере |

### Средний риск
| Элемент | Митигация |
|---------|-----------|
| `@tiptap/extension-bubble-menu` | Проверить peer dependencies перед удалением |
| API методы (getRootNotes и т.д.) | Grep по кодовой базе подтвердил отсутствие вызовов |

### Потенциальные проблемы

1. **Barrel export в api/index.ts**
   - При удалении folders.ts нужно обновить index.ts
   - Иначе — ошибка компиляции

2. **Типы Folder**
   - Проверить `src/types/` на наличие типа Folder
   - Если есть и не используется — удалить

3. **Комментарии с TODO**
   - Некоторые удаляемые файлы могут содержать TODO
   - Проверить и перенести если актуальны

---

## Порядок выполнения

```
1. Backend (Группа A) — изолирован, можно удалять первым
      ↓
2. Frontend API (Группа B) — зависит от удаления foldersApi
      ↓
3. Frontend Composables (Группа C) — могут зависеть от folders API
      ↓
4. Frontend Utils (Группа D) — изолированы
      ↓
5. Frontend Components (Группа E) — изолированы
      ↓
6. API методы (Группа F) — частичное редактирование файлов
      ↓
7. npm зависимости (Группа G) — последними, после проверки
      ↓
8. Валидация (Группа H) — финальная проверка
```

---

## Контрольные точки

- [ ] После Группы A: Backend компилируется
- [ ] После Группы B-C: TypeScript компилируется
- [ ] После Группы D-E: TypeScript компилируется
- [ ] После Группы F: TypeScript компилируется
- [ ] После Группы G: `npm install` успешен
- [ ] После Группы H: `npm run build` успешен

---

## Время выполнения

**Оценка:** 15-25 минут

- Удаление файлов: ~5 минут
- Редактирование файлов: ~5 минут
- Проверка зависимостей: ~5 минут
- Валидация: ~5-10 минут
