# Рефакторинг-аудит NoteBox: Архитектура и Code Quality

**Дата:** 20 мая 2026  
**Версия:** 1.0  
**Проект:** NoteBox — приложение для заметок с Vue 3 фронтендом и Kotlin бэкендом

---

## Содержание

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Обнаруженные проблемы по severity](#2-обнаруженные-проблемы-по-severity)
3. [Frontend: Vue 3](#3-frontend-vue-3)
4. [Backend: Kotlin/Spring](#4-backend-kotlinspring)
5. [Безопасность](#5-безопасность)
6. [Тестирование](#6-тестирование)
7. [Граф зависимостей](#7-граф-зависимостей)
8. [Риски рефакторинга](#8-риски-рефакторинга)
9. [Рекомендованный план исправлений](#9-рекомендованный-план-исправлений)

---

## 1. Обзор архитектуры

### 1.1 Технологический стек

| Слой | Технологии |
|------|------------|
| **Frontend** | Vue 3, TypeScript, Vite, Tailwind CSS, TipTap Editor |
| **Backend** | Kotlin, Spring Boot, Exposed ORM, PostgreSQL |
| **Storage** | S3 (MinIO), File Upload |
| **Auth** | OAuth 2.0 (Google, Apple), Cookie-based Sessions |
| **Инфраструктура** | Docker, Nginx |

### 1.2 Структура проекта

```
notebox/
├── src/                          # Frontend (Vue 3)
│   ├── components/               # ~90+ компонентов
│   │   ├── BlockEditor/          # 50+ компонентов редактора
│   │   │   └── cells/            # Ячейки для database table
│   │   ├── auth/                 # Аутентификация
│   │   ├── QuickCapture/         # Быстрый захват заметок
│   │   └── ...
│   ├── composables/              # 18 composables (useNotes, useDatabases, etc.)
│   ├── api/                      # 8 API модулей
│   ├── stores/                   # 1 store (authStore)
│   ├── services/                 # Сервисы (offline, auth)
│   └── types/                    # TypeScript типы
│
└── server/                       # Backend (Kotlin)
    └── src/main/kotlin/com/notebox/
        ├── config/               # Конфигурация (Security, CORS, DB)
        ├── domain/
        │   ├── auth/             # OAuth, Sessions, Users
        │   ├── note/             # Заметки (иерархическая структура)
        │   ├── database/         # Пользовательские БД (Notion-style)
        │   ├── reminder/         # Напоминания
        │   ├── tag/              # Теги
        │   └── ...
        ├── dto/                  # Data Transfer Objects
        └── exception/            # Пользовательские исключения
```

### 1.3 Метрики кодовой базы

| Метрика | Frontend | Backend |
|---------|----------|---------|
| **Файлов** | 163 | 82 |
| **Строк кода** | ~30,400 | ~6,500 |
| **Компонентов/Классов** | 90+ | 82 |
| **Файлов >300 строк** | 9 | 2 |
| **Покрытие тестами** | 0% | 0% |

---

## 2. Обнаруженные проблемы по severity

### 🔴 CRITICAL (5 проблем)

| # | Проблема | Область | Файл/Локация |
|---|----------|---------|--------------|
| C1 | **IDOR — все данные видны всем пользователям** | Security | `NoteController.kt`, `DatabaseController.kt` |
| C2 | **CORS wildcard разрешает все origins** | Security | `SecurityConfig.kt:49` |
| C3 | **Отсутствие тестов (0% coverage)** | Quality | Весь проект |
| C4 | **God-компонент BlockEditor (1,318 строк)** | Frontend | `BlockEditor.vue` |
| C5 | **Demo mode включен по умолчанию** | Security | `.env.example`, `application.yml` |

### 🟠 HIGH (8 проблем)

| # | Проблема | Область | Файл/Локация |
|---|----------|---------|--------------|
| H1 | **AuthController слишком большой (282 строки)** | Backend | `AuthController.kt` |
| H2 | **Дублирование getCurrentUserId() в 5 контроллерах** | Backend | Multiple controllers |
| H3 | **N+1 проблема в NoteRepository.getDepth()** | Backend | `NoteRepository.kt` |
| H4 | **Отсутствие пагинации в API** | Backend | `DatabaseController.kt` |
| H5 | **33 файла с `any` типом** | Frontend | Components, API |
| H6 | **Массивное дублирование dropdown логики** | Frontend | 7+ компонентов |
| H7 | **useDatabases.ts (533 строки) — нарушает SRP** | Frontend | `composables/useDatabases.ts` |
| H8 | **Prop drilling App → NoteEditor → BlockEditor** | Frontend | `App.vue`, `NoteEditor.vue` |

### 🟡 MEDIUM (10 проблем)

| # | Проблема | Область | Файл/Локация |
|---|----------|---------|--------------|
| M1 | **SameSite=Lax вместо Strict** | Security | `application.yml` |
| M2 | **Отсутствие rate limiting на auth endpoints** | Security | `SecurityConfig.kt` |
| M3 | **DemoContentData.kt (682 строки) — литеральный контент** | Backend | `DemoContentData.kt` |
| M4 | **Отсутствие @Valid annotations на DTOs** | Backend | `dto/*.kt` |
| M5 | **Слабые credentials в .env.example** | Security | `.env.example` |
| M6 | **DatabaseBlock.vue (763 строки)** | Frontend | `DatabaseBlock.vue` |
| M7 | **MainView.vue (626 строк)** | Frontend | `MainView.vue` |
| M8 | **Отсутствие Pinia для state management** | Frontend | Весь frontend |
| M9 | **innerHTML использование без DOMPurify** | Security | `markdown.ts`, `pdfExport.ts` |
| M10 | **Несогласованность authStore vs composables** | Frontend | `stores/authStore.ts` |

### 🟢 LOW (5 проблем)

| # | Проблема | Область | Файл/Локация |
|---|----------|---------|--------------|
| L1 | **Отсутствие JSDoc в большинстве функций** | Quality | Весь проект |
| L2 | **Жесткие URL-пути в API слое** | Frontend | `api/*.ts` |
| L3 | **runBlocking в OAuthService** | Backend | `OAuthService.kt` |
| L4 | **Логирование минимально в GlobalExceptionHandler** | Backend | `GlobalExceptionHandler.kt` |
| L5 | **DOCX/XLSX файлы всегда проходят валидацию** | Security | `FileController.kt` |

---

## 3. Frontend: Vue 3

### 3.1 God-компоненты (требуют немедленной декомпозиции)

| Компонент | Строк | Ответственности |
|-----------|-------|-----------------|
| **BlockEditor.vue** | 1,318 | TipTap editor, slash-commands, wiki-links, nested notes, templates, AI operations, block menu |
| **DatabaseBlock.vue** | 763 | Views, filters, sorting, import, export, Kanban, table rendering |
| **MainView.vue** | 626 | Sidebar, editor, tabs, profile, graph, search, tags |
| **DatabaseFilter.vue** | 610 | Filtering logic, custom dropdowns, SELECT field handling |
| **CsvImportDialog.vue** | 550 | CSV parsing, validation, column mapping, record creation |
| **useDatabases.ts** | 533 | 20+ методов: CRUD БД, записей, фильтров |

### 3.2 Дублирование кода

**Dropdown/Menu паттерн повторяется в 7 компонентах:**
- `DatabaseFilter.vue`
- `DatabaseSort.vue`
- `DatabaseColumnHeader.vue`
- `DatabaseAddColumn.vue`
- `SelectCell.vue`
- `MultiSelectCell.vue`
- `NoteTags.vue`

```typescript
// Повторяющийся код:
const menuVisible = ref(false);
const menuElement = ref<HTMLElement | null>(null);
const toggleMenu = () => menuVisible.value = !menuVisible.value;
const closeMenu = () => menuVisible.value = false;
onClickOutside(menuElement, () => closeMenu());
```

**Рекомендация:** Создать `useDropdownMenu.ts` composable.

### 3.3 Типизация TypeScript

**Проблемы:**
- 33 файла используют `any` тип
- API client: `post<T>(path: string, body?: any)`
- Record data: `{ [columnId: string]: any }`
- Editor callbacks: `({ state, from, to, view }: any)`

**Рекомендация:** 
- Заменить `any` на `Record<string, unknown>` или конкретные типы
- Создать discriminated union для Column values
- Использовать типы из `@tiptap/vue-3`

### 3.4 State Management

**Текущее состояние:**
- Используются только composables (useNotes, useDatabases, useStorage)
- 1 store (authStore) с ручным reactive паттерном
- Нет Pinia/Vuex

**Проблемы:**
- `useDatabases()` содержит 20+ методов — слишком большой
- Глобальное состояние управляется inconsistently
- Сложно отследить flow данных

---

## 4. Backend: Kotlin/Spring

### 4.1 Архитектура слоёв

```
┌─────────────────────────────────────────────────────────┐
│                    Controllers (10)                      │
│  AuthController, NoteController, DatabaseController...   │
├─────────────────────────────────────────────────────────┤
│                     Services (9)                         │
│  UserService, NoteService, DatabaseService, ReminderService... │
├─────────────────────────────────────────────────────────┤
│                    Repositories (8)                      │
│  UserRepository, NoteRepository, SessionRepository...    │
├─────────────────────────────────────────────────────────┤
│                   Exposed ORM + PostgreSQL               │
└─────────────────────────────────────────────────────────┘
```

**Оценка:** Классическая трёхслойная архитектура реализована хорошо.

### 4.2 Нарушения SOLID

**Single Responsibility Principle:**

1. **AuthController (282 строки)** — слишком много ответственностей:
   - OAuth login/callback (GET и POST)
   - Demo login
   - User profile (GET/PATCH /me)
   - Logout

2. **DemoContentService (218 строк)** — "God Service":
   - Создание заметок
   - Создание БД
   - Очистка данных
   - Проверки безопасности

3. **NoteRepository (247 строк)** — слишком много методов:
   - CRUD операции
   - Иерархические операции (findAllDescendants, getDepth)
   - Операции с тегами
   - Операции удаления

### 4.3 Performance проблемы

**N+1 в NoteRepository.getDepth():**
```kotlin
fun getDepth(noteId: String): Int = transaction {
    var depth = 0
    var currentId: String? = noteId
    while (currentId != null) {
        val note = findById(currentId) ?: break  // SQL запрос на каждую итерацию!
        currentId = note.parentId
        if (currentId != null) depth++
    }
    depth
}
```

**Рекомендация:** Использовать `WITH RECURSIVE` SQL запрос.

**Отсутствие пагинации:**
```kotlin
// DatabaseController — может вернуть 1M записей!
fun getRecords(@PathVariable id: String): ResponseEntity<ApiResponse<List<RecordDto>>>
```

### 4.4 Дублирование кода

**getCurrentUserId() дублируется в 5 контроллерах:**
- ReminderController
- NotificationController
- CalendarController
- NoteController (implicitly)
- DatabaseController (implicitly)

```kotlin
private fun getCurrentUserId(): String {
    val authentication = SecurityContextHolder.getContext().authentication
    return authentication?.principal as? String
        ?: throw IllegalStateException("User not authenticated")
}
```

**Рекомендация:** Создать `SecurityUtils.getCurrentUserId()`.

---

## 5. Безопасность

### 5.1 CRITICAL: IDOR (Insecure Direct Object Reference)

**Проблема:** API endpoints возвращают данные ВСЕХ пользователей без фильтрации по userId.

```kotlin
// NoteController.kt
@GetMapping
fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
    val notes = noteService.getAllNotesWithTags()  // ВСЕ заметки ВСЕХ пользователей!
    return ResponseEntity.ok(successResponse(notes))
}
```

**Затронутые endpoints:**
- `GET /api/notes` — все заметки
- `GET /api/databases` — все БД
- `GET /api/reminders` — все напоминания
- `GET /api/tags` — все теги

**Рекомендация:**
```kotlin
@GetMapping
fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
    val userId = SecurityUtils.getCurrentUserId()
    val notes = noteService.getNotesByUserId(userId)
    return ResponseEntity.ok(successResponse(notes))
}
```

### 5.2 CRITICAL: CORS Wildcard

**Файл:** `SecurityConfig.kt:49`

```kotlin
configuration.allowedOriginPatterns = listOf("*")
```

**Проблема:** Разрешает запросы с любых доменов + `allowCredentials = true` = возможна CSRF атака.

**Рекомендация:**
```kotlin
configuration.allowedOriginPatterns = listOf(
    "http://localhost:5173",
    "https://notebox.app"
)
```

### 5.3 HIGH: Demo Mode по умолчанию включен

**Файл:** `.env.example`

```
DEMO_MODE_ENABLED=true
```

**Проблема:** `/api/auth/demo` позволяет создавать сессии без аутентификации.

### 5.4 MEDIUM: Cookie Security

```yaml
# application.yml
cookie:
  same-site: lax    # Должно быть strict
  secure: false     # Должно быть true в production
```

### 5.5 Матрица безопасности

| Аспект | Статус | Рекомендация |
|--------|--------|--------------|
| CORS | ❌ Wildcard | Ограничить origins |
| IDOR | ❌ Нет защиты | Добавить userId filtering |
| CSRF | ⚠️ Частично | SameSite=Strict |
| XSS | ⚠️ Custom sanitizer | Использовать DOMPurify |
| Rate Limiting | ❌ Отсутствует | Добавить на auth endpoints |
| Input Validation | ⚠️ Частично | @Valid annotations |
| Session Security | ✅ HttpOnly | — |
| SQL Injection | ✅ ORM защищает | — |

---

## 6. Тестирование

### 6.1 Текущее состояние

| Метрика | Значение |
|---------|----------|
| Unit тесты | 0 |
| Integration тесты | 0 |
| E2E тесты | 0 |
| **Общее покрытие** | **0%** |

### 6.2 Отсутствующая инфраструктура

**Frontend:**
- Нет Vitest/Jest
- Нет `__tests__` директории
- Нет тестовых скриптов в `package.json`

**Backend:**
- JUnit5 объявлен в `build.gradle.kts`, но тестов нет
- Нет `src/test/kotlin` с тестами

### 6.3 Приоритеты тестирования

1. **Critical:** Auth flow (OAuth, sessions)
2. **High:** CRUD operations для Notes, Databases
3. **High:** Иерархические операции (parent-child notes)
4. **Medium:** Reminder scheduler
5. **Medium:** File upload/validation

---

## 7. Граф зависимостей

### 7.1 Frontend: Ключевые зависимости

```
App.vue
├── MainView.vue (626 lines)
│   ├── UnifiedSidebar.vue
│   ├── TabBar.vue
│   └── NoteEditor.vue
│       └── BlockEditor.vue (1,318 lines) ⚠️
│           ├── SlashCommandMenu.vue
│           ├── BubbleMenu.vue
│           ├── DatabaseBlock.vue (763 lines) ⚠️
│           │   ├── DatabaseTable.vue
│           │   ├── DatabaseFilter.vue (610 lines)
│           │   ├── KanbanBoard.vue
│           │   └── cells/*Cell.vue (16 компонентов)
│           └── extensions/* (TipTap extensions)
│
Composables:
├── useNotes.ts → useStorage.ts → offlineStore
├── useDatabases.ts (533 lines) ⚠️ → api/databases.ts
├── useAuth.ts → authStore
└── useTabs.ts
```

### 7.2 Backend: Ключевые зависимости

```
Application.kt
├── config/
│   ├── SecurityConfig.kt → SessionAuthenticationFilter
│   ├── CorsConfig.kt (overridden by SecurityConfig!)
│   └── DatabaseConfig.kt
│
├── domain/auth/
│   ├── AuthController.kt (282 lines) ⚠️
│   │   ├── OAuthService → GoogleOAuthProvider, AppleOAuthProvider
│   │   ├── SessionService → SessionRepository
│   │   └── UserService → UserRepository
│   └── DemoAuthProvider
│
├── domain/note/
│   ├── NoteController
│   ├── NoteService → NoteRepository, TagService
│   └── NoteRepository (247 lines) — иерархия заметок
│
└── domain/database/
    ├── DatabaseController
    ├── DatabaseService → DatabaseRepository
    └── Columns, Records tables
```

---

## 8. Риски рефакторинга

### 8.1 Высокий риск

| Область | Риск | Митигация |
|---------|------|-----------|
| **BlockEditor.vue** | Регрессии в редакторе | Покрыть E2E тестами перед рефакторингом |
| **Security fixes** | Сломать auth flow | Тесты для OAuth, sessions |
| **useDatabases.ts** | Сломать CRUD БД | Unit тесты для каждого метода |

### 8.2 Средний риск

| Область | Риск | Митигация |
|---------|------|-----------|
| **Пагинация в API** | Сломать клиентский код | Версионирование API или feature flag |
| **Типизация** | TypeScript ошибки компиляции | Постепенная миграция с `any` |
| **State management** | Потеря реактивности | Тесты для state transitions |

### 8.3 Низкий риск

| Область | Риск | Митигация |
|---------|------|-----------|
| **useDropdownMenu.ts** | Минимальный | Локальный рефакторинг |
| **SecurityUtils** | Минимальный | Простая экстракция |
| **Документация** | Нет | — |

---

## 9. Рекомендованный план исправлений

### Phase 1: Критические исправления (1-2 недели)

| # | Задача | Приоритет | Effort |
|---|--------|-----------|--------|
| 1.1 | **Исправить IDOR** — добавить userId filtering на все endpoints | 🔴 Critical | 2 дня |
| 1.2 | **Исправить CORS** — ограничить origins | 🔴 Critical | 1 час |
| 1.3 | **Отключить Demo Mode по умолчанию** | 🔴 Critical | 30 мин |
| 1.4 | **Добавить базовые тесты для auth flow** | 🔴 Critical | 3 дня |

### Phase 2: Security hardening (2-3 недели)

| # | Задача | Приоритет | Effort |
|---|--------|-----------|--------|
| 2.1 | SameSite=Strict, Secure=true | 🟠 High | 1 час |
| 2.2 | Rate limiting на auth endpoints | 🟠 High | 1 день |
| 2.3 | @Valid annotations на DTOs | 🟠 High | 1 день |
| 2.4 | Заменить custom sanitizer на DOMPurify | 🟡 Medium | 2 часа |

### Phase 3: Frontend рефакторинг (3-4 недели)

| # | Задача | Приоритет | Effort |
|---|--------|-----------|--------|
| 3.1 | Создать `useDropdownMenu.ts` composable | 🟠 High | 1 день |
| 3.2 | Создать `useOptionColors.ts` composable | 🟠 High | 4 часа |
| 3.3 | Разделить `useDatabases.ts` на 3 части | 🟠 High | 2 дня |
| 3.4 | Декомпозиция `BlockEditor.vue` | 🟠 High | 5 дней |
| 3.5 | Удалить `any` из API layer | 🟠 High | 2 дня |
| 3.6 | Внедрить Pinia | 🟡 Medium | 3 дня |

### Phase 4: Backend рефакторинг (2-3 недели)

| # | Задача | Приоритет | Effort |
|---|--------|-----------|--------|
| 4.1 | Создать `SecurityUtils.getCurrentUserId()` | 🟠 High | 2 часа |
| 4.2 | Разделить AuthController на 3 контроллера | 🟠 High | 1 день |
| 4.3 | Оптимизировать `getDepth()` с WITH RECURSIVE | 🟠 High | 4 часа |
| 4.4 | Добавить пагинацию в API | 🟠 High | 2 дня |
| 4.5 | Разделить DemoContentService | 🟡 Medium | 1 день |

### Phase 5: Тестирование (ongoing)

| # | Задача | Приоритет | Effort |
|---|--------|-----------|--------|
| 5.1 | Настроить Vitest для frontend | 🟠 High | 1 день |
| 5.2 | Unit тесты для composables | 🟠 High | 3 дня |
| 5.3 | Integration тесты для Kotlin services | 🟠 High | 3 дня |
| 5.4 | E2E тесты для critical paths | 🟡 Medium | 5 дней |

---

## Выводы

### Сильные стороны
- ✅ Хорошая domain-driven структура backend
- ✅ Трёхслойная архитектура правильно реализована
- ✅ API layer на frontend хорошо организован
- ✅ OAuth integration абстрагирован через интерфейс
- ✅ SQL Injection защита через ORM

### Критические проблемы требующие немедленного решения
- ❌ **IDOR уязвимость** — все данные видны всем пользователям
- ❌ **CORS wildcard** — возможна CSRF атака
- ❌ **0% test coverage** — высокий риск регрессий
- ❌ **God-компоненты** — BlockEditor 1,318 строк

### Общая оценка

| Категория | Оценка | Комментарий |
|-----------|--------|-------------|
| Архитектура | ⭐⭐⭐☆☆ | Хорошая структура, но god-компоненты |
| Безопасность | ⭐⭐☆☆☆ | IDOR и CORS требуют немедленного исправления |
| Code Quality | ⭐⭐⭐☆☆ | Дублирование, слабая типизация |
| Тестирование | ⭐☆☆☆☆ | 0% coverage |
| Масштабируемость | ⭐⭐☆☆☆ | N+1 проблемы, отсутствие пагинации |

**Рекомендация:** Начать с Phase 1 (критические исправления безопасности) до любых других изменений.

---

*Отчёт сгенерирован автоматически. Требуется подтверждение плана пользователем перед началом исправлений.*
