# План рефакторинга NoteBox: Архитектура и Code Quality

**Дата создания:** 20 мая 2026  
**Версия:** 1.0  
**Статус:** Ожидает подтверждения пользователя

---

## 1. Резюме

### Что будет рефакторингом

Данный план охватывает комплексный рефакторинг проекта NoteBox, направленный на устранение **5 критических**, **8 высокоприоритетных** и **10 средних** проблем, выявленных в ходе аудита архитектуры и code quality.

### Почему это необходимо

1. **Безопасность (CRITICAL):** IDOR-уязвимость позволяет любому пользователю видеть данные всех пользователей
2. **Безопасность (CRITICAL):** CORS wildcard разрешает запросы с любых доменов, открывая CSRF атаки
3. **Качество кода:** God-компоненты (BlockEditor 1,318 строк) затрудняют поддержку и тестирование
4. **Тестирование:** 0% покрытие тестами создаёт высокий риск регрессий
5. **Производительность:** N+1 проблемы и отсутствие пагинации ограничивают масштабируемость

### Ожидаемый результат

- Устранение критических уязвимостей безопасности
- Декомпозиция god-компонентов до разумных размеров (< 300 строк)
- Минимальное покрытие тестами критических путей (auth, CRUD)
- Улучшение типизации (устранение `any`)
- Оптимизация производительности БД

---

## 2. Пошаговый план исправлений

### Phase 1: Критические исправления безопасности (Приоритет: НЕМЕДЛЕННО)

#### Шаг 1.1: Исправление IDOR-уязвимости
**Estimated effort:** 2 дня

| # | Действие | Файл |
|---|----------|------|
| 1.1.1 | Создать `SecurityUtils.kt` с методом `getCurrentUserId()` | `server/src/main/kotlin/com/notebox/util/SecurityUtils.kt` |
| 1.1.2 | Добавить `userId` фильтрацию в `NoteController.getAllNotes()` | `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` |
| 1.1.3 | Добавить `userId` фильтрацию в `DatabaseController.getAllDatabases()` | `server/src/main/kotlin/com/notebox/domain/database/DatabaseController.kt` |
| 1.1.4 | Добавить `userId` фильтрацию в `ReminderController.getAllReminders()` | `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt` |
| 1.1.5 | Добавить `userId` фильтрацию в `TagController.getAllTags()` | `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt` |
| 1.1.6 | Обновить все Service методы для принятия `userId` | Все Service классы |
| 1.1.7 | Обновить Repository методы с WHERE clause для userId | Все Repository классы |

#### Шаг 1.2: Исправление CORS-уязвимости
**Estimated effort:** 1 час

| # | Действие | Файл |
|---|----------|------|
| 1.2.1 | Заменить `allowedOriginPatterns = listOf("*")` на whitelist | `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt` |
| 1.2.2 | Добавить environment variable для allowed origins | `server/src/main/resources/application.yml` |

```kotlin
// До:
configuration.allowedOriginPatterns = listOf("*")

// После:
configuration.allowedOriginPatterns = listOf(
    env.getProperty("cors.allowed-origins", "http://localhost:5173")
        .split(",")
)
```

#### Шаг 1.3: Отключение Demo Mode по умолчанию
**Estimated effort:** 30 минут

| # | Действие | Файл |
|---|----------|------|
| 1.3.1 | Изменить `DEMO_MODE_ENABLED=true` на `false` | `.env.example` |
| 1.3.2 | Добавить warning в README о включении demo mode | `README.md` |

#### Шаг 1.4: Базовые тесты auth flow
**Estimated effort:** 3 дня

| # | Действие | Файл |
|---|----------|------|
| 1.4.1 | Создать тестовую конфигурацию | `server/src/test/kotlin/com/notebox/TestConfig.kt` |
| 1.4.2 | Создать unit тесты для SessionService | `server/src/test/kotlin/com/notebox/domain/auth/SessionServiceTest.kt` |
| 1.4.3 | Создать unit тесты для UserService | `server/src/test/kotlin/com/notebox/domain/auth/UserServiceTest.kt` |
| 1.4.4 | Создать integration тесты для AuthController | `server/src/test/kotlin/com/notebox/domain/auth/AuthControllerTest.kt` |

---

### Phase 2: Security Hardening (Приоритет: ВЫСОКИЙ)

#### Шаг 2.1: Cookie Security
**Estimated effort:** 1 час

| # | Действие | Файл |
|---|----------|------|
| 2.1.1 | Изменить `same-site: lax` на `strict` | `server/src/main/resources/application.yml` |
| 2.1.2 | Изменить `secure: false` на environment-based | `server/src/main/resources/application.yml` |
| 2.1.3 | Создать профиль `application-production.yml` | `server/src/main/resources/application-production.yml` |

#### Шаг 2.2: Rate Limiting
**Estimated effort:** 1 день

| # | Действие | Файл |
|---|----------|------|
| 2.2.1 | Добавить зависимость bucket4j или guava RateLimiter | `server/build.gradle.kts` |
| 2.2.2 | Создать `RateLimitingFilter` | `server/src/main/kotlin/com/notebox/config/RateLimitingFilter.kt` |
| 2.2.3 | Применить rate limiting к `/api/auth/*` endpoints | `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt` |

#### Шаг 2.3: Input Validation
**Estimated effort:** 1 день

| # | Действие | Файл |
|---|----------|------|
| 2.3.1 | Добавить `@Valid` annotations на все DTO параметры контроллеров | Все Controller файлы |
| 2.3.2 | Добавить `@field:NotBlank`, `@field:Size` в DTO классы | `server/src/main/kotlin/com/notebox/dto/*.kt` |
| 2.3.3 | Создать `ValidationExceptionHandler` | `server/src/main/kotlin/com/notebox/exception/ValidationExceptionHandler.kt` |

#### Шаг 2.4: XSS Protection (DOMPurify)
**Estimated effort:** 2 часа

| # | Действие | Файл |
|---|----------|------|
| 2.4.1 | Установить dompurify (`npm install dompurify @types/dompurify`) | `package.json` |
| 2.4.2 | Заменить custom sanitizer на DOMPurify в markdown.ts | `src/utils/markdown.ts` |
| 2.4.3 | Заменить innerHTML использование в pdfExport.ts | `src/utils/pdfExport.ts` |

---

### Phase 3: Frontend рефакторинг (Приоритет: ВЫСОКИЙ)

#### Шаг 3.1: Создание useDropdownMenu composable
**Estimated effort:** 1 день

| # | Действие | Файл |
|---|----------|------|
| 3.1.1 | Создать `useDropdownMenu.ts` composable | `src/composables/useDropdownMenu.ts` |
| 3.1.2 | Рефакторинг DatabaseFilter.vue | `src/components/BlockEditor/database/DatabaseFilter.vue` |
| 3.1.3 | Рефакторинг DatabaseSort.vue | `src/components/BlockEditor/database/DatabaseSort.vue` |
| 3.1.4 | Рефакторинг DatabaseColumnHeader.vue | `src/components/BlockEditor/database/DatabaseColumnHeader.vue` |
| 3.1.5 | Рефакторинг DatabaseAddColumn.vue | `src/components/BlockEditor/database/DatabaseAddColumn.vue` |
| 3.1.6 | Рефакторинг SelectCell.vue | `src/components/BlockEditor/cells/SelectCell.vue` |
| 3.1.7 | Рефакторинг MultiSelectCell.vue | `src/components/BlockEditor/cells/MultiSelectCell.vue` |
| 3.1.8 | Рефакторинг NoteTags.vue | `src/components/NoteTags.vue` |

```typescript
// useDropdownMenu.ts — сигнатура
export function useDropdownMenu(options?: {
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
}) {
  const isVisible: Ref<boolean>;
  const menuElement: Ref<HTMLElement | null>;
  const toggle: () => void;
  const open: () => void;
  const close: () => void;
  return { isVisible, menuElement, toggle, open, close };
}
```

#### Шаг 3.2: Создание useOptionColors composable
**Estimated effort:** 4 часа

| # | Действие | Файл |
|---|----------|------|
| 3.2.1 | Создать `useOptionColors.ts` | `src/composables/useOptionColors.ts` |
| 3.2.2 | Применить в SelectCell.vue | `src/components/BlockEditor/cells/SelectCell.vue` |
| 3.2.3 | Применить в MultiSelectCell.vue | `src/components/BlockEditor/cells/MultiSelectCell.vue` |
| 3.2.4 | Применить в DatabaseFilter.vue | `src/components/BlockEditor/database/DatabaseFilter.vue` |

#### Шаг 3.3: Разделение useDatabases.ts
**Estimated effort:** 2 дня

| # | Действие | Файл |
|---|----------|------|
| 3.3.1 | Создать `useDatabaseCrud.ts` — CRUD операции с БД | `src/composables/useDatabaseCrud.ts` |
| 3.3.2 | Создать `useDatabaseRecords.ts` — операции с записями | `src/composables/useDatabaseRecords.ts` |
| 3.3.3 | Создать `useDatabaseFilters.ts` — фильтрация и сортировка | `src/composables/useDatabaseFilters.ts` |
| 3.3.4 | Обновить `useDatabases.ts` как facade | `src/composables/useDatabases.ts` |
| 3.3.5 | Обновить все импорты в компонентах | 15+ компонентов |

```
Текущая структура useDatabases.ts (533 строки):
├── CRUD базы данных (createDatabase, updateDatabase, deleteDatabase)
├── CRUD записей (createRecord, updateRecord, deleteRecord, batchUpdateRecords)
├── CRUD колонок (addColumn, updateColumn, deleteColumn)
├── Views (createView, updateView, deleteView)
├── Фильтры и сортировка (setFilter, setSort, clearFilters)
└── Импорт/экспорт (importCsv, exportCsv)

После рефакторинга:
├── useDatabaseCrud.ts (~150 строк) — CRUD для БД и колонок
├── useDatabaseRecords.ts (~200 строк) — CRUD записей, batch operations
├── useDatabaseFilters.ts (~100 строк) — фильтры, сортировка, views
└── useDatabases.ts (~80 строк) — facade, композиция трёх composables
```

#### Шаг 3.4: Декомпозиция BlockEditor.vue
**Estimated effort:** 5 дней

| # | Действие | Файл |
|---|----------|------|
| 3.4.1 | Создать `useBlockEditorConfig.ts` — конфигурация TipTap | `src/composables/useBlockEditorConfig.ts` |
| 3.4.2 | Создать `useSlashCommands.ts` — логика slash menu | `src/composables/useSlashCommands.ts` |
| 3.4.3 | Создать `BlockEditorToolbar.vue` — toolbar компонент | `src/components/BlockEditor/BlockEditorToolbar.vue` |
| 3.4.4 | Создать `BlockEditorBubbleMenu.vue` — bubble menu | `src/components/BlockEditor/BlockEditorBubbleMenu.vue` |
| 3.4.5 | Выделить AI operations в `useAIOperations.ts` | `src/composables/useAIOperations.ts` |
| 3.4.6 | Рефакторинг `BlockEditor.vue` для использования новых composables | `src/components/BlockEditor/BlockEditor.vue` |

```
Текущая структура BlockEditor.vue (1,318 строк):
├── TipTap конфигурация (extensions, plugins) — 200 строк
├── Slash commands логика — 150 строк  
├── Bubble menu — 100 строк
├── Wiki-links — 80 строк
├── Nested notes — 100 строк
├── Templates — 80 строк
├── AI operations — 150 строк
├── Block menu — 100 строк
├── Event handlers — 200 строк
└── Template и styles — 158 строк

После рефакторинга BlockEditor.vue (~400 строк):
├── Импорты composables
├── Основная логика координации
├── Template (использует sub-components)
└── Styles
```

#### Шаг 3.5: Устранение `any` типов в API layer
**Estimated effort:** 2 дня

| # | Действие | Файл |
|---|----------|------|
| 3.5.1 | Создать типы для Record data | `src/types/database.ts` |
| 3.5.2 | Создать discriminated union для Column values | `src/types/columns.ts` |
| 3.5.3 | Типизировать api/client.ts | `src/api/client.ts` |
| 3.5.4 | Типизировать api/databases.ts | `src/api/databases.ts` |
| 3.5.5 | Типизировать api/notes.ts | `src/api/notes.ts` |
| 3.5.6 | Использовать типы из @tiptap/vue-3 | Компоненты с TipTap |

```typescript
// types/columns.ts — пример
export type ColumnValue = 
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | { type: 'select'; value: string; optionId: string }
  | { type: 'multi_select'; value: string[]; optionIds: string[] }
  | { type: 'date'; value: string }
  | { type: 'checkbox'; value: boolean }
  | { type: 'url'; value: string }
  | { type: 'email'; value: string };

export type RecordData = Record<string, ColumnValue>;
```

#### Шаг 3.6: Миграция на Pinia
**Estimated effort:** 3 дня

| # | Действие | Файл |
|---|----------|------|
| 3.6.1 | Установить Pinia | `package.json` |
| 3.6.2 | Создать `stores/auth.ts` (миграция authStore) | `src/stores/auth.ts` |
| 3.6.3 | Создать `stores/notes.ts` | `src/stores/notes.ts` |
| 3.6.4 | Создать `stores/databases.ts` | `src/stores/databases.ts` |
| 3.6.5 | Создать `stores/ui.ts` (tabs, sidebar state) | `src/stores/ui.ts` |
| 3.6.6 | Обновить composables для использования Pinia stores | Все composables |
| 3.6.7 | Удалить старый authStore.ts | `src/stores/authStore.ts` |

---

### Phase 4: Backend рефакторинг (Приоритет: ВЫСОКИЙ)

#### Шаг 4.1: Создание SecurityUtils
**Estimated effort:** 2 часа

| # | Действие | Файл |
|---|----------|------|
| 4.1.1 | Создать `SecurityUtils.kt` | `server/src/main/kotlin/com/notebox/util/SecurityUtils.kt` |
| 4.1.2 | Удалить дублированный код из ReminderController | `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt` |
| 4.1.3 | Удалить дублированный код из NotificationController | `server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt` |
| 4.1.4 | Удалить дублированный код из CalendarController | `server/src/main/kotlin/com/notebox/domain/calendar/CalendarController.kt` |

```kotlin
// SecurityUtils.kt
object SecurityUtils {
    fun getCurrentUserId(): String {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
            ?: throw NotAuthenticatedException("User not authenticated")
    }
    
    fun getCurrentUserIdOrNull(): String? {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
    }
}
```

#### Шаг 4.2: Разделение AuthController
**Estimated effort:** 1 день

| # | Действие | Файл |
|---|----------|------|
| 4.2.1 | Создать `OAuthController.kt` — OAuth endpoints | `server/src/main/kotlin/com/notebox/domain/auth/OAuthController.kt` |
| 4.2.2 | Создать `UserProfileController.kt` — /me endpoints | `server/src/main/kotlin/com/notebox/domain/auth/UserProfileController.kt` |
| 4.2.3 | Оставить в AuthController только logout и demo login | `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt` |

```
Текущая структура AuthController (282 строки):
├── GET /api/auth/login/{provider} — OAuth initiation
├── GET/POST /api/auth/callback/{provider} — OAuth callback
├── POST /api/auth/demo — Demo login
├── GET /api/auth/me — Get current user
├── PATCH /api/auth/me — Update user profile
└── POST /api/auth/logout — Logout

После рефакторинга:
├── OAuthController.kt (~100 строк)
│   ├── GET /api/auth/login/{provider}
│   └── GET/POST /api/auth/callback/{provider}
├── UserProfileController.kt (~80 строк)
│   ├── GET /api/auth/me
│   └── PATCH /api/auth/me
└── AuthController.kt (~50 строк)
    ├── POST /api/auth/demo
    └── POST /api/auth/logout
```

#### Шаг 4.3: Оптимизация getDepth() с WITH RECURSIVE
**Estimated effort:** 4 часа

| # | Действие | Файл |
|---|----------|------|
| 4.3.1 | Создать raw SQL метод с WITH RECURSIVE | `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` |
| 4.3.2 | Заменить while-loop на SQL метод | `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` |
| 4.3.3 | Добавить тест для проверки корректности | `server/src/test/kotlin/com/notebox/domain/note/NoteRepositoryTest.kt` |

```kotlin
// До (N+1):
fun getDepth(noteId: String): Int = transaction {
    var depth = 0
    var currentId: String? = noteId
    while (currentId != null) {
        val note = findById(currentId) ?: break
        currentId = note.parentId
        if (currentId != null) depth++
    }
    depth
}

// После (1 SQL запрос):
fun getDepth(noteId: String): Int = transaction {
    exec("""
        WITH RECURSIVE note_hierarchy AS (
            SELECT id, parent_id, 0 as depth
            FROM notes
            WHERE id = ?
            UNION ALL
            SELECT n.id, n.parent_id, nh.depth + 1
            FROM notes n
            JOIN note_hierarchy nh ON n.id = nh.parent_id
        )
        SELECT MAX(depth) FROM note_hierarchy
    """.trimIndent(), listOf(noteId)) { rs ->
        if (rs.next()) rs.getInt(1) else 0
    } ?: 0
}
```

#### Шаг 4.4: Добавление пагинации в API
**Estimated effort:** 2 дня

| # | Действие | Файл |
|---|----------|------|
| 4.4.1 | Создать `PageRequest` и `PageResponse` DTO | `server/src/main/kotlin/com/notebox/dto/Pagination.kt` |
| 4.4.2 | Добавить пагинацию в DatabaseController.getRecords() | `server/src/main/kotlin/com/notebox/domain/database/DatabaseController.kt` |
| 4.4.3 | Добавить пагинацию в NoteController.getAllNotes() | `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` |
| 4.4.4 | Обновить frontend API layer | `src/api/databases.ts`, `src/api/notes.ts` |
| 4.4.5 | Добавить бесконечный скролл или load more в компоненты | UI компоненты |

```kotlin
// Pagination.kt
data class PageRequest(
    val page: Int = 0,
    val size: Int = 50,
    val sort: String? = null
)

data class PageResponse<T>(
    val content: List<T>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
    val hasNext: Boolean
)
```

#### Шаг 4.5: Разделение DemoContentService
**Estimated effort:** 1 день

| # | Действие | Файл |
|---|----------|------|
| 4.5.1 | Создать `DemoNoteCreator.kt` | `server/src/main/kotlin/com/notebox/domain/demo/DemoNoteCreator.kt` |
| 4.5.2 | Создать `DemoDatabaseCreator.kt` | `server/src/main/kotlin/com/notebox/domain/demo/DemoDatabaseCreator.kt` |
| 4.5.3 | Рефакторинг DemoContentService | `server/src/main/kotlin/com/notebox/domain/demo/DemoContentService.kt` |

---

### Phase 5: Тестирование (Ongoing)

#### Шаг 5.1: Настройка Vitest для frontend
**Estimated effort:** 1 день

| # | Действие | Файл |
|---|----------|------|
| 5.1.1 | Установить Vitest и @vue/test-utils | `package.json` |
| 5.1.2 | Создать `vitest.config.ts` | `vitest.config.ts` |
| 5.1.3 | Добавить test скрипты в package.json | `package.json` |
| 5.1.4 | Создать setup файл для тестов | `src/__tests__/setup.ts` |

#### Шаг 5.2: Unit тесты для composables
**Estimated effort:** 3 дня

| # | Действие | Файл |
|---|----------|------|
| 5.2.1 | Тесты для useAuth | `src/composables/__tests__/useAuth.test.ts` |
| 5.2.2 | Тесты для useNotes | `src/composables/__tests__/useNotes.test.ts` |
| 5.2.3 | Тесты для useDatabaseCrud | `src/composables/__tests__/useDatabaseCrud.test.ts` |
| 5.2.4 | Тесты для useDatabaseRecords | `src/composables/__tests__/useDatabaseRecords.test.ts` |
| 5.2.5 | Тесты для useDropdownMenu | `src/composables/__tests__/useDropdownMenu.test.ts` |

#### Шаг 5.3: Integration тесты для Kotlin services
**Estimated effort:** 3 дня

| # | Действие | Файл |
|---|----------|------|
| 5.3.1 | Тесты для NoteService | `server/src/test/kotlin/com/notebox/domain/note/NoteServiceTest.kt` |
| 5.3.2 | Тесты для DatabaseService | `server/src/test/kotlin/com/notebox/domain/database/DatabaseServiceTest.kt` |
| 5.3.3 | Тесты для ReminderService | `server/src/test/kotlin/com/notebox/domain/reminder/ReminderServiceTest.kt` |

#### Шаг 5.4: E2E тесты для critical paths
**Estimated effort:** 5 дней

| # | Действие | Файл |
|---|----------|------|
| 5.4.1 | Установить Playwright | `package.json` |
| 5.4.2 | Тест: OAuth login flow | `e2e/auth.spec.ts` |
| 5.4.3 | Тест: Create/Edit/Delete note | `e2e/notes.spec.ts` |
| 5.4.4 | Тест: Database CRUD | `e2e/databases.spec.ts` |
| 5.4.5 | Тест: BlockEditor slash commands | `e2e/block-editor.spec.ts` |

---

## 3. Список файлов для модификации

### Backend (Kotlin)

| Файл | Изменения |
|------|-----------|
| `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt` | Исправить CORS wildcard, добавить rate limiting filter |
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | Добавить userId фильтрацию, пагинацию |
| `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` | Обновить методы для принятия userId |
| `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` | Оптимизировать getDepth(), добавить userId WHERE clause |
| `server/src/main/kotlin/com/notebox/domain/database/DatabaseController.kt` | Добавить userId фильтрацию, пагинацию |
| `server/src/main/kotlin/com/notebox/domain/database/DatabaseService.kt` | Обновить методы для принятия userId |
| `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt` | Использовать SecurityUtils, удалить дублирование |
| `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt` | Добавить userId фильтрацию |
| `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt` | Разделить на 3 контроллера |
| `server/src/main/kotlin/com/notebox/domain/demo/DemoContentService.kt` | Разделить на отдельные creator классы |
| `server/src/main/resources/application.yml` | Cookie security, CORS config |
| `server/build.gradle.kts` | Добавить bucket4j для rate limiting |
| `server/src/main/kotlin/com/notebox/dto/*.kt` | Добавить @Valid annotations |

### Frontend (Vue/TypeScript)

| Файл | Изменения |
|------|-----------|
| `src/components/BlockEditor/BlockEditor.vue` | Декомпозиция, использование новых composables |
| `src/components/BlockEditor/database/DatabaseBlock.vue` | Рефакторинг, использование useDropdownMenu |
| `src/components/BlockEditor/database/DatabaseFilter.vue` | Использование useDropdownMenu |
| `src/components/BlockEditor/database/DatabaseSort.vue` | Использование useDropdownMenu |
| `src/components/BlockEditor/database/DatabaseColumnHeader.vue` | Использование useDropdownMenu |
| `src/components/BlockEditor/database/DatabaseAddColumn.vue` | Использование useDropdownMenu |
| `src/components/BlockEditor/cells/SelectCell.vue` | Использование useDropdownMenu, useOptionColors |
| `src/components/BlockEditor/cells/MultiSelectCell.vue` | Использование useDropdownMenu, useOptionColors |
| `src/components/NoteTags.vue` | Использование useDropdownMenu |
| `src/components/MainView.vue` | Использование Pinia stores |
| `src/composables/useDatabases.ts` | Разделение на 3 composable |
| `src/stores/authStore.ts` | Миграция на Pinia |
| `src/api/client.ts` | Устранение any типов |
| `src/api/databases.ts` | Типизация, пагинация |
| `src/api/notes.ts` | Типизация, пагинация |
| `src/utils/markdown.ts` | Заменить sanitizer на DOMPurify |
| `src/utils/pdfExport.ts` | Заменить innerHTML на DOMPurify |
| `package.json` | Добавить Pinia, Vitest, DOMPurify, Playwright |

### Конфигурация

| Файл | Изменения |
|------|-----------|
| `.env.example` | Изменить DEMO_MODE_ENABLED на false |
| `README.md` | Добавить warning о demo mode |
| `vitest.config.ts` | Создать конфигурацию Vitest |
| `playwright.config.ts` | Создать конфигурацию Playwright |

---

## 4. Новые файлы для создания

### Backend

| Файл | Назначение |
|------|------------|
| `server/src/main/kotlin/com/notebox/util/SecurityUtils.kt` | Утилиты для получения текущего пользователя |
| `server/src/main/kotlin/com/notebox/config/RateLimitingFilter.kt` | Rate limiting для auth endpoints |
| `server/src/main/kotlin/com/notebox/dto/Pagination.kt` | PageRequest, PageResponse DTO |
| `server/src/main/kotlin/com/notebox/domain/auth/OAuthController.kt` | OAuth endpoints |
| `server/src/main/kotlin/com/notebox/domain/auth/UserProfileController.kt` | User profile endpoints |
| `server/src/main/kotlin/com/notebox/domain/demo/DemoNoteCreator.kt` | Создание demo заметок |
| `server/src/main/kotlin/com/notebox/domain/demo/DemoDatabaseCreator.kt` | Создание demo БД |
| `server/src/main/kotlin/com/notebox/exception/ValidationExceptionHandler.kt` | Обработка ошибок валидации |
| `server/src/main/resources/application-production.yml` | Production конфигурация |
| `server/src/test/kotlin/com/notebox/TestConfig.kt` | Тестовая конфигурация |
| `server/src/test/kotlin/com/notebox/domain/auth/SessionServiceTest.kt` | Тесты SessionService |
| `server/src/test/kotlin/com/notebox/domain/auth/UserServiceTest.kt` | Тесты UserService |
| `server/src/test/kotlin/com/notebox/domain/auth/AuthControllerTest.kt` | Integration тесты auth |
| `server/src/test/kotlin/com/notebox/domain/note/NoteServiceTest.kt` | Тесты NoteService |
| `server/src/test/kotlin/com/notebox/domain/note/NoteRepositoryTest.kt` | Тесты NoteRepository |
| `server/src/test/kotlin/com/notebox/domain/database/DatabaseServiceTest.kt` | Тесты DatabaseService |
| `server/src/test/kotlin/com/notebox/domain/reminder/ReminderServiceTest.kt` | Тесты ReminderService |

### Frontend

| Файл | Назначение |
|------|------------|
| `src/composables/useDropdownMenu.ts` | Переиспользуемая логика dropdown |
| `src/composables/useOptionColors.ts` | Логика цветов для select options |
| `src/composables/useDatabaseCrud.ts` | CRUD операции для БД |
| `src/composables/useDatabaseRecords.ts` | Операции с записями БД |
| `src/composables/useDatabaseFilters.ts` | Фильтры и сортировка БД |
| `src/composables/useBlockEditorConfig.ts` | Конфигурация TipTap |
| `src/composables/useSlashCommands.ts` | Логика slash commands |
| `src/composables/useAIOperations.ts` | AI операции редактора |
| `src/components/BlockEditor/BlockEditorToolbar.vue` | Toolbar компонент |
| `src/components/BlockEditor/BlockEditorBubbleMenu.vue` | Bubble menu компонент |
| `src/stores/auth.ts` | Pinia store для auth |
| `src/stores/notes.ts` | Pinia store для заметок |
| `src/stores/databases.ts` | Pinia store для БД |
| `src/stores/ui.ts` | Pinia store для UI state |
| `src/types/columns.ts` | Типы для колонок БД |
| `vitest.config.ts` | Конфигурация Vitest |
| `playwright.config.ts` | Конфигурация Playwright |
| `src/__tests__/setup.ts` | Setup файл для тестов |
| `src/composables/__tests__/useAuth.test.ts` | Тесты useAuth |
| `src/composables/__tests__/useNotes.test.ts` | Тесты useNotes |
| `src/composables/__tests__/useDatabaseCrud.test.ts` | Тесты useDatabaseCrud |
| `src/composables/__tests__/useDatabaseRecords.test.ts` | Тесты useDatabaseRecords |
| `src/composables/__tests__/useDropdownMenu.test.ts` | Тесты useDropdownMenu |
| `e2e/auth.spec.ts` | E2E тесты auth |
| `e2e/notes.spec.ts` | E2E тесты notes |
| `e2e/databases.spec.ts` | E2E тесты databases |
| `e2e/block-editor.spec.ts` | E2E тесты редактора |

---

## 5. Файлы для удаления

| Файл | Причина |
|------|---------|
| `src/stores/authStore.ts` | После миграции на Pinia (Phase 3.6) |

---

## 6. Шаги миграции

### 6.1 API Breaking Changes

**Пагинация в API endpoints (Phase 4.4)**

```
До:
GET /api/databases/{id}/records → List<RecordDto>

После:
GET /api/databases/{id}/records?page=0&size=50 → PageResponse<RecordDto>
```

**Стратегия миграции:**
1. Добавить поддержку query parameters `page` и `size`
2. Если параметры не указаны — использовать defaults (page=0, size=1000)
3. Добавить deprecation header для запросов без пагинации
4. Через 2 недели — уменьшить default size до 50

### 6.2 Frontend State Migration

**Миграция authStore → Pinia (Phase 3.6)**

```typescript
// Текущий код:
import { authStore } from '@/stores/authStore';
const { user, isAuthenticated } = authStore;

// После миграции:
import { useAuthStore } from '@/stores/auth';
const authStore = useAuthStore();
const { user, isAuthenticated } = storeToRefs(authStore);
```

**Порядок миграции:**
1. Создать Pinia stores параллельно со старыми
2. Мигрировать компоненты по одному
3. Удалить старый authStore после завершения

---

## 7. Стратегия тестирования

### 7.1 Перед началом рефакторинга

| Область | Действие |
|---------|----------|
| Auth flow | Ручное тестирование OAuth Google/Apple, demo login |
| CRUD Notes | Ручное тестирование create/read/update/delete |
| CRUD Database | Ручное тестирование таблиц, записей, колонок |
| BlockEditor | Ручное тестирование slash commands, formatting |

### 7.2 После каждой Phase

| Phase | Критерии приёмки |
|-------|------------------|
| Phase 1 | Auth flow работает, IDOR исправлен (проверить через разные аккаунты) |
| Phase 2 | Rate limiting срабатывает, cookies secure, DOMPurify работает |
| Phase 3 | Все компоненты работают как раньше, типы компилируются |
| Phase 4 | Backend API работает, пагинация функционирует |
| Phase 5 | Тесты проходят, coverage > 30% для критических путей |

### 7.3 Автоматическое тестирование

```bash
# Frontend unit тесты
npm run test

# Frontend E2E тесты
npm run test:e2e

# Backend тесты
./gradlew test

# Lint проверка
npm run lint
./gradlew ktlintCheck
```

### 7.4 Regression Testing Checklist

- [ ] OAuth login (Google)
- [ ] OAuth login (Apple)
- [ ] Demo mode login
- [ ] Create note
- [ ] Edit note content
- [ ] Delete note
- [ ] Create database
- [ ] Add columns to database
- [ ] Create/edit/delete records
- [ ] Filter records
- [ ] Sort records
- [ ] Slash commands (/database, /heading, etc.)
- [ ] Wiki-links [[note]]
- [ ] Tags
- [ ] Dark mode toggle
- [ ] Offline mode
- [ ] File upload

---

## 8. План отката

### 8.1 Общая стратегия

Все изменения вносятся через Pull Requests с обязательным code review. В случае проблем — revert PR.

### 8.2 По фазам

| Phase | Стратегия отката |
|-------|------------------|
| Phase 1 (Security) | `git revert <commit>` + redeploy. Backup БД перед deploy. |
| Phase 2 (Hardening) | `git revert`. Rate limiting можно отключить через config. |
| Phase 3 (Frontend) | Feature branch. Можно не merge в main если проблемы. |
| Phase 4 (Backend) | `git revert`. Пагинация — через feature flag изначально. |
| Phase 5 (Testing) | Тесты не влияют на production. Нет необходимости в откате. |

### 8.3 Критические точки

**IDOR fix (Step 1.1):**
- Риск: неправильная фильтрация может скрыть данные от владельца
- Митигация: тщательное тестирование каждого endpoint
- Откат: немедленный revert если пользователи теряют доступ к своим данным

**Пагинация (Step 4.4):**
- Риск: сломать клиентский код
- Митигация: backwards-compatible defaults
- Откат: feature flag для отключения пагинации

---

## 9. Оценка рисков

### 9.1 Высокий риск

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Регрессии в BlockEditor после декомпозиции | Высокая | Высокое | E2E тесты, ручное тестирование |
| Сломать auth flow при разделении AuthController | Средняя | Критическое | Integration тесты, staging deploy |
| IDOR fix скрывает данные владельца | Низкая | Критическое | Тщательное тестирование |

### 9.2 Средний риск

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Пагинация ломает UI компоненты | Средняя | Среднее | Feature flag, поэтапная миграция |
| TypeScript ошибки блокируют сборку | Высокая | Низкое | `// @ts-expect-error` временно |
| Pinia миграция ломает реактивность | Средняя | Среднее | Поэтапная миграция, тесты |

### 9.3 Низкий риск

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| useDropdownMenu не покрывает все edge cases | Низкая | Низкое | Итеративное улучшение |
| Rate limiting слишком агрессивный | Низкая | Низкое | Configurable limits |

---

## 10. Timeline

| Phase | Длительность | Зависимости |
|-------|--------------|-------------|
| Phase 1: Critical Security | 1-2 недели | Нет |
| Phase 2: Security Hardening | 2-3 дня | Phase 1 |
| Phase 3: Frontend Refactoring | 3-4 недели | Можно параллельно с Phase 2 |
| Phase 4: Backend Refactoring | 2-3 недели | Phase 1 |
| Phase 5: Testing | Ongoing | Интегрируется в каждую Phase |

**Общая оценка:** 8-10 недель при 1 разработчике

---

## 11. Ресурсы

- 1 Backend разработчик (Kotlin/Spring)
- 1 Frontend разработчик (Vue/TypeScript)
- QA для regression testing
- DevOps для staging environment

---

## 12. Подтверждение

**Перед началом работы требуется подтверждение пользователя по следующим пунктам:**

1. [ ] Согласие с приоритетами (Phase 1 Security — первый)
2. [ ] Согласие с breaking changes (пагинация API)
3. [ ] Согласие с новыми зависимостями (Pinia, DOMPurify, Vitest, Playwright)
4. [ ] Согласие с timeline (~8-10 недель)
5. [ ] Наличие staging environment для тестирования

---

*План создан на основе аудита архитектуры и code quality от 20 мая 2026.*  
*Статус: ожидает подтверждения пользователя.*
