# Анализ рефакторинга: Backend Service Layer — SOLID нарушения и God Services

## Обзор проекта

**Технологический стек:**
- Kotlin 1.9.22 + Spring Boot 3.2.2
- Exposed ORM 0.47.0 для работы с PostgreSQL
- AWS S3 SDK для хранения файлов
- Web Push Notifications (Bouncy Castle)
- Google Calendar API

**Архитектура:** Domain-driven структура с разделением по функциональным модулям:
- `domain/auth` — авторизация, OAuth, сессии, пользователи
- `domain/note` — заметки
- `domain/folder` — папки
- `domain/tag` — теги
- `domain/database` — пользовательские базы данных (Notion-like)
- `domain/reminder` — напоминания
- `domain/notification` — push-уведомления
- `domain/calendar` — интеграция с Google Calendar
- `domain/storage` — хранение файлов
- `domain/demo` — демо-контент

---

## Граф зависимостей сервисного слоя

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CONTROLLERS                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  AuthController ─────► OAuthService, SessionService, UserService,           │
│                        DemoAuthProvider                                      │
│  NoteController ─────► NoteService                                          │
│  DatabaseController ─► DatabaseService                                       │
│  ReminderController ─► ReminderService                                       │
│  TagController ──────► TagService, SessionService                           │
│  FileController ─────► FileStorageService, FileValidationService            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               SERVICES                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │ DemoAuthProvider│─────►│DemoContentService│─────►│   NoteService   │     │
│  │   (auth/)       │      │    (demo/)       │      │                 │     │
│  └────────┬────────┘      └────────┬────────┘      └─────────────────┘     │
│           │                        │                        │               │
│           │                        ├───────────────────────►│               │
│           │                        │      ┌─────────────────┼───────┐       │
│           │                        ▼      │                 │       │       │
│           │               ┌─────────────────┐               ▼       │       │
│           │               │ DatabaseService │      ┌─────────────┐  │       │
│           │               │  (Databases,    │      │NoteRepository│  │       │
│           │               │   Columns,      │      └─────────────┘  │       │
│           │               │   Records)      │                       │       │
│           │               └─────────────────┘                       │       │
│           │                        │                                │       │
│           ▼                        ▼                                ▼       │
│  ┌─────────────────┐      ┌─────────────────┐              ┌─────────────┐  │
│  │  SessionService │      │DatabaseRepository│              │UserRepository│ │
│  └─────────────────┘      └─────────────────┘              └─────────────┘  │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────┐                                                        │
│  │SessionRepository│                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐     │
│  │ ReminderService │─────►│GoogleCalendarSvc│─────►│UserOAuthAccRepo │     │
│  │   (reminder/)   │      │   (calendar/)   │      │    (auth/)      │     │
│  └────────┬────────┘      └─────────────────┘      └─────────────────┘     │
│           │                                                                  │
│           ├─────────────────────────────────────────────────────────────►   │
│           │                                        ┌─────────────────┐      │
│           ▼                                        │  NoteRepository │      │
│  ┌─────────────────┐                               └─────────────────┘      │
│  │ReminderRepository│                                                        │
│  └─────────────────┘                                                        │
│                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐                               │
│  │ReminderScheduler│─────►│PushNotification │                               │
│  │  (Component)    │      │    Service      │                               │
│  └────────┬────────┘      └─────────────────┘                               │
│           │                        │                                         │
│           ▼                        ▼                                         │
│  ┌─────────────────┐      ┌─────────────────┐                               │
│  │ReminderRepository│      │PushSubscription │                               │
│  └─────────────────┘      │   Repository    │                               │
│                           └─────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Выявленные SOLID-нарушения

### 1. DemoContentService — God Service (КРИТИЧНО)

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoContentService.kt`  
**Строк:** 218  
**Зависимости:** 5 (NoteService, NoteRepository, DatabaseService, DatabaseRepository, UserRepository)

**Нарушенные принципы:**
- **SRP (Single Responsibility Principle):** Сервис выполняет 4+ различных функции:
  1. Проверка безопасности (только демо-пользователь)
  2. Очистка всех данных
  3. Создание заметок с контентом
  4. Создание баз данных с колонками и записями
  5. Связывание контента через ID

- **OCP (Open-Closed Principle):** Для добавления нового типа демо-контента требуется изменение класса

**Проблемный код:**
```kotlin
@Service
class DemoContentService(
    private val noteService: NoteService,
    private val noteRepository: NoteRepository,     // Прямой доступ к репозиторию
    private val databaseService: DatabaseService,
    private val databaseRepository: DatabaseRepository, // Прямой доступ к репозиторию
    private val userRepository: UserRepository      // Доступ к чужому домену
) {
    fun clearDemoData() { ... }      // Ответственность 1
    fun createDemoContent() { ... }  // Ответственность 2, 3, 4
}
```

**Риск:** Высокий. Изменения в одной части влияют на всё.

---

### 2. DatabaseService — смешение ответственностей (СРЕДНЕ)

**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseService.kt`  
**Строк:** 117

**Нарушенные принципы:**
- **SRP:** Управляет тремя разными сущностями:
  1. CustomDatabase (базы данных)
  2. Column (колонки)
  3. Record (записи)

**Проблемный код:**
```kotlin
@Service
class DatabaseService(private val databaseRepository: DatabaseRepository) {
    // CustomDatabase operations (14 строк)
    fun getAllDatabases(): List<CustomDatabase> { ... }
    fun createDatabase(...) { ... }
    
    // Column operations (23 строки)
    fun addColumn(...) { ... }
    fun updateColumn(...) { ... }
    
    // Record operations (45 строк)
    fun getRecordsByDatabaseId(...) { ... }
    fun createRecord(...) { ... }
}
```

**Риск:** Средний. При росте функциональности станет неуправляемым.

---

### 3. ReminderService — нарушение SRP (СРЕДНЕ)

**Файл:** `server/src/main/kotlin/com/notebox/domain/reminder/ReminderService.kt`  
**Строк:** 113

**Нарушенные принципы:**
- **SRP:** Смешивает CRUD операции с интеграцией Google Calendar
- **DIP (Dependency Inversion):** Прямая зависимость от GoogleCalendarService

**Проблемный код:**
```kotlin
@Service
class ReminderService(
    private val reminderRepository: ReminderRepository,
    private val noteRepository: NoteRepository,        // Зависимость от чужого домена
    private val googleCalendarService: GoogleCalendarService  // Интеграция в CRUD
) {
    fun createReminder(..., syncToGoogleCalendar: Boolean = false): Reminder {
        // CRUD логика
        var reminder = reminderRepository.create(...)
        
        // Интеграция с внешним API встроена в CRUD
        if (syncToGoogleCalendar) {
            try {
                val googleEventId = googleCalendarService.createEvent(userId, reminder)
                // ...
            } catch (e: Exception) {
                logger.error("Failed to sync reminder to Google Calendar", e)
            }
        }
        return reminder
    }
}
```

**Риск:** Средний. Добавление новых интеграций (Apple Calendar, Outlook) потребует изменения сервиса.

---

### 4. NoteService — дублирование и размытие ответственности (НИЗКО-СРЕДНЕ)

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt`  
**Строк:** 204

**Проблемы:**
1. **Дублирование логики маппинга DTO:**
```kotlin
fun getAllNotesWithTags(): List<NoteDto> {
    val notes = noteRepository.findAll()
    val noteIds = notes.map { it.id }
    val tagsMap = noteRepository.findTagsForNotes(noteIds)  // Логика тегов
    return notes.map { note ->
        val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
        note.toDto(tags)
    }
}

fun getRootNotesWithTags(): List<NoteDto> {
    val notes = noteRepository.findRootNotes()
    val noteIds = notes.map { it.id }
    val tagsMap = noteRepository.findTagsForNotes(noteIds)  // Дублирование
    return notes.map { note ->
        val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
        note.toDto(tags)
    }
}
```

2. **Смешение бизнес-логики иерархии и CRUD:**
```kotlin
private fun calculateMaxDescendantDepth(noteId: String): Int { ... }
fun moveNote(noteId: String, newParentId: String?): Note? {
    // Валидация циклов, глубины - всё в одном методе
}
```

**Риск:** Низко-средний. Код работает, но сложен в поддержке.

---

### 5. NoteRepository — бизнес-логика в репозитории (НИЗКО)

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 199-232

**Нарушенные принципы:**
- **SRP:** Репозиторий заметок знает о тегах

**Проблемный код:**
```kotlin
@Repository
class NoteRepository {
    // ... CRUD для Note
    
    // Эти методы не должны быть здесь!
    fun findTagsByNoteId(noteId: String): List<Tag> = transaction {
        (TagsTable innerJoin NoteTagsTable)
            .select { NoteTagsTable.noteId eq noteId }
            .map { row -> Tag(...) }
    }
    
    fun findTagsForNotes(noteIds: List<String>): Map<String, List<Tag>> = transaction {
        // ...
    }
}
```

**Риск:** Низкий. Нарушает чистоту архитектуры, но работает стабильно.

---

### 6. TagController — бизнес-логика в контроллере (НИЗКО)

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt`  
**Строки:** 44-55, 88-95, 117-125, 142-150

**Проблемный код:**
```kotlin
@GetMapping("/{id}")
fun getTagById(@PathVariable id: String, request: HttpServletRequest): ResponseEntity<...> {
    val userId = getUserIdFromRequest(request) ?: return ...
    val tag = tagService.getTagById(id) ?: return ...
    
    // Бизнес-логика авторизации в контроллере!
    if (tag.userId != userId) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(errorResponse("FORBIDDEN", "Access denied"))
    }
    // ...
}
```

**Риск:** Низкий. Дублирование проверки в 4+ методах.

---

### 7. FileController — бизнес-логика в контроллере (НИЗКО)

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt`  
**Строки:** 40-44, 83-93

**Проблемный код:**
```kotlin
@PostMapping("/upload")
fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<...> {
    // Генерация ключа файла — бизнес-логика
    val fileId = UUID.randomUUID().toString()
    val key = "$fileId.$extension"
    // ...
}

// Валидация ключа — бизнес-логика
private fun isValidKey(key: String): Boolean {
    if (key.contains("..") || key.contains("/") || key.contains("\\")) {
        return false
    }
    val pattern = Regex("^[0-9a-f]{8}-...")
    return pattern.matches(key)
}
```

**Риск:** Низкий. Затрудняет тестирование.

---

### 8. DemoAuthProvider — смешение ответственностей (НИЗКО)

**Файл:** `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt`  
**Строки:** 23-42

**Нарушенные принципы:**
- **SRP:** Смешивает аутентификацию и инициализацию данных

**Проблемный код:**
```kotlin
fun createDemoSession(): Pair<User, Session> {
    val demoUser = userService.findByEmail(DEMO_EMAIL)
        ?: userService.createUser(DEMO_EMAIL, DEMO_NAME, null)
    
    // Инициализация данных — не ответственность AuthProvider!
    demoContentService.clearDemoData()
    demoContentService.createDemoContent()
    
    val session = sessionService.createSession(demoUser.id)
    return Pair(demoUser, session)
}
```

**Риск:** Низкий. Увеличивает время входа в демо-режим.

---

## Список затронутых файлов

| Файл | Строк | Приоритет | Тип изменения |
|------|-------|-----------|---------------|
| `domain/demo/DemoContentService.kt` | 218 | КРИТИЧНО | Декомпозиция на 3+ класса |
| `domain/database/DatabaseService.kt` | 117 | СРЕДНЕ | Разделение на 3 сервиса |
| `domain/reminder/ReminderService.kt` | 113 | СРЕДНЕ | Выделение CalendarSyncService |
| `domain/note/NoteService.kt` | 204 | НИЗКО-СРЕДНЕ | Выделение NoteHierarchyService, NoteDtoMapper |
| `domain/note/NoteRepository.kt` | 247 | НИЗКО | Перенос методов тегов в TagRepository |
| `domain/tag/TagController.kt` | 169 | НИЗКО | Перенос проверки владения в TagService |
| `domain/storage/FileController.kt` | 94 | НИЗКО | Создание FileService |
| `domain/auth/DemoAuthProvider.kt` | 43 | НИЗКО | Разделение на AuthProvider + DataInitializer |

---

## Оценка рисков

### При рефакторинге:

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Нарушение демо-режима | Высокая | Среднее | Интеграционные тесты для демо-сценария |
| Регрессия в напоминаниях | Средняя | Высокое | Unit-тесты для ReminderService + CalendarSync |
| Проблемы с иерархией заметок | Низкая | Высокое | Тесты на глубину вложенности, циклы |
| Нарушение авторизации тегов | Низкая | Высокое | Тесты безопасности (доступ чужих тегов) |

### Что может сломаться:

1. **Демо-режим:** Если неправильно разделить DemoContentService, может нарушиться порядок создания контента (сначала заметки, потом базы данных, потом связывание)

2. **Google Calendar синхронизация:** При выделении CalendarSyncService важно сохранить транзакционность (создание напоминания + событие в календаре)

3. **Теги заметок:** При переносе методов из NoteRepository нужно сохранить оптимизацию batch-загрузки (findTagsForNotes)

---

## Рекомендуемый подход к рефакторингу

### Фаза 1: Критические изменения (DemoContentService)

```
demo/
├── DemoContentService.kt          → DemoContentOrchestrator.kt
├── DemoNoteBuilder.kt             (NEW)
├── DemoDatabaseBuilder.kt         (NEW)
└── DemoDataCleaner.kt             (NEW)
```

**DemoContentOrchestrator** — координирует создание демо-контента  
**DemoNoteBuilder** — создаёт заметки с контентом  
**DemoDatabaseBuilder** — создаёт базы данных, колонки, записи  
**DemoDataCleaner** — очищает данные с проверкой безопасности

### Фаза 2: Средние изменения

#### DatabaseService → три сервиса:
```
database/
├── DatabaseService.kt             (только CustomDatabase)
├── ColumnService.kt               (NEW)
└── RecordService.kt               (NEW)
```

#### ReminderService → с выделением интеграции:
```
reminder/
├── ReminderService.kt             (только CRUD)
└── ReminderCalendarSyncService.kt (NEW, интеграции)
```

### Фаза 3: Косметические изменения

1. **Перенос бизнес-логики из контроллеров в сервисы**
2. **Выделение NoteHierarchyService** для логики иерархии
3. **Создание NoteDtoMapper** для устранения дублирования
4. **Перенос методов тегов** из NoteRepository в TagRepository/TagService

---

## Итоговые выводы

### Текущее состояние: 6/10
- Базовая архитектура правильная (domain-driven)
- Есть чёткое разделение на слои (Controller → Service → Repository)
- Присутствует интерфейсная абстракция (FileStorageService)

### Основные проблемы:
1. **God Service** — DemoContentService берёт на себя слишком много
2. **Смешение ответственностей** — сервисы управляют несколькими сущностями
3. **Tight coupling** — ReminderService жёстко связан с Google Calendar
4. **Leaky abstractions** — бизнес-логика просачивается в контроллеры

### После рефакторинга ожидается: 8/10
- Чёткие границы ответственности каждого сервиса
- Легкость добавления новых интеграций (календари, уведомления)
- Упрощение тестирования через изоляцию компонентов
- Соответствие SOLID принципам
