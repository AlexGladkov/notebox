# Анализ безопасности бэкенда: CORS, Auth и IDOR Hardening

**Дата анализа:** 2026-05-20  
**Ветка:** refactoring/backend-security-cors-auth-i-idor-hardening  
**Статус:** Анализ завершён

---

## 1. Обзор текущей архитектуры

### 1.1 Структура безопасности

```
server/src/main/kotlin/com/notebox/
├── config/
│   ├── SecurityConfig.kt      # Spring Security, SessionAuthenticationFilter
│   ├── CorsConfig.kt          # WebMvcConfigurer CORS (не используется)
│   └── GlobalExceptionHandler.kt
├── domain/auth/
│   ├── AuthController.kt      # OAuth endpoints
│   ├── SessionService.kt      # Управление сессиями
│   └── SessionRepository.kt
└── exception/
    └── Exceptions.kt          # Доменные исключения
```

### 1.2 Текущий поток аутентификации

1. Пользователь логинится через OAuth (Google/Apple) или Demo mode
2. Создаётся сессия в БД (SessionsTable)
3. SESSION_ID записывается в HttpOnly cookie
4. `SessionAuthenticationFilter` проверяет cookie на каждый запрос
5. UserId извлекается из сессии и помещается в `SecurityContextHolder`

---

## 2. Критические уязвимости безопасности

### 2.1 CORS: Открытый wildcard (КРИТИЧЕСКАЯ)

**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt:47-57`

```kotlin
@Bean
fun corsConfigurationSource(): CorsConfigurationSource {
    val configuration = CorsConfiguration()
    configuration.allowedOriginPatterns = listOf("*")  // КРИТИЧЕСКАЯ УЯЗВИМОСТЬ
    configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
    configuration.allowedHeaders = listOf("*")
    configuration.allowCredentials = true  // Опасно в сочетании с "*"
    ...
}
```

**Проблема:** 
- `allowedOriginPatterns = listOf("*")` в сочетании с `allowCredentials = true` позволяет любому сайту делать authenticated запросы к API
- Это открывает возможность CSRF атак и кражи данных пользователей

**Риск:** Критический (CVSS 9.0+)

**Примечание:** Существует `CorsConfig.kt` с более ограничительными настройками, но он перезаписывается `SecurityConfig.corsConfigurationSource()`.

---

### 2.2 IDOR: Отсутствие проверки владельца ресурсов (КРИТИЧЕСКАЯ)

**Затронутые таблицы:**

| Таблица | userId поле | Проверка ownership |
|---------|-------------|-------------------|
| NotesTable | **НЕТ** | **НЕТ** |
| FoldersTable | **НЕТ** | **НЕТ** |
| CustomDatabasesTable | **НЕТ** | **НЕТ** |
| TagsTable | ДА | ДА |
| RemindersTable | ДА | ДА |
| PushSubscriptionsTable | ДА | ДА |

**Примеры уязвимого кода:**

**NoteController.kt:20-27:**
```kotlin
@GetMapping
fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
    val notes = noteService.getAllNotesWithTags()  // Возвращает ВСЕ заметки ВСЕХ пользователей
    return ResponseEntity.ok(successResponse(notes))
}

@GetMapping("/{id}")
fun getNoteById(@PathVariable id: String): ResponseEntity<ApiResponse<NoteDto>> {
    val noteDto = noteService.getNoteByIdWithTags(id)  // Любой пользователь может читать любую заметку
    ...
}
```

**FolderController.kt:19-30:**
```kotlin
@GetMapping
fun getAllFolders(): ResponseEntity<ApiResponse<List<FolderDto>>> {
    val folders = folderService.getAllFolders().map { it.toDto() }  // ВСЕ папки ВСЕХ пользователей
    ...
}
```

**DatabaseController.kt:19-32:**
```kotlin
@GetMapping
fun getAllDatabases(): ResponseEntity<ApiResponse<List<CustomDatabaseDto>>> {
    val databases = databaseService.getAllDatabasesWithColumns()  // ВСЕ базы ВСЕХ пользователей
    ...
}
```

**FileController.kt:40-44:**
```kotlin
@GetMapping("/{key}")
fun getFileUrl(@PathVariable key: String): ResponseEntity<ApiResponse<GetFileUrlResponse>> {
    val url = fileService.getFileUrl(key)  // Любой файл по ключу без проверки владельца
    ...
}
```

**Риск:** Критический (CVSS 9.0+)

**Атака:** Любой аутентифицированный пользователь может:
- Читать, изменять, удалять заметки других пользователей
- Читать, изменять, удалять папки других пользователей
- Читать, изменять, удалять базы данных других пользователей
- Скачивать файлы других пользователей (при угадывании UUID)

---

### 2.3 Rate Limiting: Полное отсутствие (ВЫСОКИЙ РИСК)

**Поиск в коде:**
```bash
grep -r "rate.?limit\|throttl\|bucket4j\|resilience4j" server/
# Результат: пусто
```

**build.gradle.kts** не содержит зависимостей для rate limiting.

**Уязвимые endpoints:**
- `POST /api/auth/demo` — brute force demo сессий
- `POST /api/files/upload` — DoS через загрузку файлов
- `POST /api/notes` — spam создания ресурсов
- Все OAuth endpoints — enumeration атаки

**Риск:** Высокий (CVSS 7.0+)

---

## 3. Проблемы средней критичности

### 3.1 Дублирование констант SESSION_COOKIE_NAME

**Файлы:**
- `SecurityConfig.kt:66` — `SESSION_COOKIE_NAME = "SESSION_ID"`
- `AuthController.kt:33` — `SESSION_COOKIE_NAME = "SESSION_ID"`
- `TagController.kt:24` — `SESSION_COOKIE_NAME = "SESSION_ID"`

**Проблема:** Изменение имени cookie в одном месте не применится везде.

### 3.2 Непоследовательное получение userId

**Три разных подхода в контроллерах:**

1. **SecurityContextHolder** (ReminderController, NotificationController, CalendarController):
```kotlin
private fun getCurrentUserId(): String {
    val authentication = SecurityContextHolder.getContext().authentication
    return authentication?.principal as? String
        ?: throw AuthenticationException("User not authenticated")
}
```

2. **Cookie + SessionService** (TagController, AuthController):
```kotlin
private fun getUserIdFromRequest(request: HttpServletRequest): String {
    val sessionId = request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
        ?: throw AuthenticationException("Session cookie not found")
    return sessionService.getUserIdFromSession(sessionId)
        ?: throw AuthenticationException("Invalid or expired session")
}
```

3. **Без проверки** (NoteController, FolderController, DatabaseController, FileController):
```kotlin
// userId НЕ извлекается вообще
```

### 3.3 CORS Config конфликт

Существует два CORS конфига:
- `CorsConfig.kt` — правильный, с whitelist из переменных окружения
- `SecurityConfig.corsConfigurationSource()` — неправильный, с `*`

`SecurityConfig` bean имеет приоритет над `WebMvcConfigurer`.

---

## 4. Эталонная реализация (для копирования)

### 4.1 Правильная таблица с userId

**TagsTable.kt:**
```kotlin
object TagsTable : Table("tags") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36).index()  // <-- ОБЯЗАТЕЛЬНО
    val name = varchar("name", 100)
    ...
}
```

### 4.2 Правильная проверка ownership в сервисе

**TagService.kt:**
```kotlin
fun getTagByIdForUser(id: String, userId: String): Tag {
    val tag = getTagById(id)
        ?: throw NotFoundException("Tag not found: $id")
    if (tag.userId != userId) {
        throw AccessDeniedException("Access denied to tag: $id")  // <-- ПРОВЕРКА
    }
    return tag
}

fun verifyTagOwnership(tagId: String, userId: String) {
    val tag = getTagById(tagId)
        ?: throw NotFoundException("Tag not found: $tagId")
    if (tag.userId != userId) {
        throw AccessDeniedException("Access denied to tag: $tagId")
    }
}
```

### 4.3 Правильный контроллер с userId

**TagController.kt:**
```kotlin
@GetMapping
fun getAllTags(request: HttpServletRequest): ResponseEntity<ApiResponse<List<TagDto>>> {
    val userId = getUserIdFromRequest(request)  // <-- ПОЛУЧАЕМ userId
    val tags = tagService.getAllTags(userId)     // <-- ПЕРЕДАЁМ В СЕРВИС
    return ResponseEntity.ok(successResponse(tags))
}
```

---

## 5. Граф зависимостей затронутого кода

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layer                           │
├─────────────────────────────────────────────────────────────────┤
│  SecurityConfig.kt ──────────────────────────────────────────┐  │
│       ├── corsConfigurationSource() [ИСПРАВИТЬ]             │  │
│       └── SessionAuthenticationFilter [OK]                   │  │
│                                                              │  │
│  CorsConfig.kt [УДАЛИТЬ или ОБЪЕДИНИТЬ]                     │  │
└──────────────────────────────────────────────────────────────┼──┘
                                                               │
┌─────────────────────────────────────────────────────────────────┐
│                      Controllers (IDOR)                         │
├─────────────────────────────────────────────────────────────────┤
│  [ИСПРАВИТЬ]                    │  [OK]                         │
│  ├── NoteController.kt          │  ├── TagController.kt         │
│  ├── FolderController.kt        │  ├── ReminderController.kt    │
│  ├── DatabaseController.kt      │  ├── NotificationController   │
│  └── FileController.kt          │  └── CalendarController.kt    │
└──────────────────────────────────────────────────────────────────┘
                         │                    │
                         ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Services                                  │
├─────────────────────────────────────────────────────────────────┤
│  [ИСПРАВИТЬ]                    │  [OK - эталон]                │
│  ├── NoteService.kt             │  ├── TagService.kt            │
│  ├── FolderService.kt           │  └── ReminderService.kt       │
│  ├── DatabaseService.kt         │                               │
│  └── FileService.kt             │                               │
└──────────────────────────────────────────────────────────────────┘
                         │                    │
                         ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Tables (Schema)                          │
├─────────────────────────────────────────────────────────────────┤
│  [ДОБАВИТЬ userId]              │  [OK]                         │
│  ├── NotesTable.kt              │  ├── TagsTable.kt             │
│  ├── FoldersTable.kt            │  └── RemindersTable.kt        │
│  ├── CustomDatabasesTable.kt    │                               │
│  ├── ColumnsTable.kt            │                               │
│  ├── RecordsTable.kt            │                               │
│  └── FilesTable.kt (если есть)  │                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 6. Список файлов для изменения

### 6.1 Критические (Security)

| Файл | Изменение | Риск |
|------|-----------|------|
| `config/SecurityConfig.kt` | Исправить CORS whitelist | Критический |
| `config/CorsConfig.kt` | Удалить или объединить | Критический |
| `domain/note/NotesTable.kt` | Добавить userId колонку | Критический |
| `domain/folder/FoldersTable.kt` | Добавить userId колонку | Критический |
| `domain/database/CustomDatabasesTable.kt` | Добавить userId колонку | Критический |
| `domain/database/ColumnsTable.kt` | Добавить userId (опционально, через database) | Высокий |
| `domain/database/RecordsTable.kt` | Добавить userId (опционально, через database) | Высокий |

### 6.2 Репозитории и Сервисы

| Файл | Изменение |
|------|-----------|
| `domain/note/NoteRepository.kt` | Фильтрация по userId |
| `domain/note/NoteService.kt` | Передача userId, проверка ownership |
| `domain/folder/FolderRepository.kt` | Фильтрация по userId |
| `domain/folder/FolderService.kt` | Передача userId, проверка ownership |
| `domain/database/DatabaseRepository.kt` | Фильтрация по userId |
| `domain/database/DatabaseService.kt` | Передача userId, проверка ownership |
| `domain/storage/FileService.kt` | Привязка файлов к userId |

### 6.3 Контроллеры

| Файл | Изменение |
|------|-----------|
| `domain/note/NoteController.kt` | Получать userId, передавать в сервис |
| `domain/folder/FolderController.kt` | Получать userId, передавать в сервис |
| `domain/database/DatabaseController.kt` | Получать userId, передавать в сервис |
| `domain/storage/FileController.kt` | Получать userId, проверять ownership |

### 6.4 Rate Limiting (новый функционал)

| Действие | Описание |
|----------|----------|
| Добавить зависимость | bucket4j-core, bucket4j-jcache |
| Создать `RateLimitConfig.kt` | Конфигурация limits |
| Создать `RateLimitFilter.kt` | Фильтр для всех endpoints |
| Создать `RateLimitException.kt` | Исключение 429 |

---

## 7. Оценка рисков

### 7.1 Риски при исправлении

| Риск | Вероятность | Воздействие | Митигация |
|------|-------------|-------------|-----------|
| Миграция БД сломает существующие данные | Высокая | Критическое | Написать миграцию для привязки данных к demo user |
| Приложение перестанет работать после CORS fix | Средняя | Высокое | Добавить все легитимные origins в whitelist |
| Rate limiting заблокирует легитимных пользователей | Низкая | Среднее | Установить разумные лимиты (100 req/min) |

### 7.2 Риски при НЕ исправлении

| Риск | Вероятность | Воздействие |
|------|-------------|-------------|
| Утечка данных пользователей | Высокая | Критическое |
| CSRF атака через открытый CORS | Высокая | Критическое |
| DoS через отсутствие rate limiting | Средняя | Высокое |

---

## 8. Рекомендуемый подход

### Этап 1: CORS (быстрый fix, 1 час)

1. Удалить `CorsConfig.kt`
2. В `SecurityConfig.corsConfigurationSource()`:
   - Заменить `listOf("*")` на whitelist из конфигурации
   - Использовать `@Value("\${cors.allowed-origins}")` или аналогично

### Этап 2: IDOR — схема БД (требует миграции, 2-4 часа)

1. Создать SQL миграцию для добавления `user_id` в:
   - `notes`
   - `folders`
   - `custom_databases`
2. Написать скрипт миграции данных (привязать к demo user или первому user)
3. Добавить индексы на `user_id`

### Этап 3: IDOR — код (4-8 часов)

1. Обновить Table objects — добавить `userId`
2. Обновить Repositories — фильтрация по `userId`
3. Обновить Services — передача `userId`, проверка ownership
4. Обновить Controllers — извлечение `userId` из `SecurityContextHolder`
5. Унифицировать получение `userId` (создать базовый контроллер или extension)

### Этап 4: Rate Limiting (2-4 часа)

1. Добавить зависимости в `build.gradle.kts`
2. Создать `RateLimitConfig.kt` с лимитами по endpoint-ам
3. Создать фильтр или использовать аннотации

### Этап 5: Тестирование (2-4 часа)

1. Написать интеграционные тесты для CORS
2. Написать тесты для IDOR защиты
3. Написать тесты для rate limiting

---

## 9. Миграция базы данных

### 9.1 SQL миграция (пример)

```sql
-- V202605201_add_user_id_to_notes.sql

-- Добавляем колонку
ALTER TABLE notes ADD COLUMN user_id VARCHAR(36);

-- Привязываем существующие данные к demo user (или первому user)
UPDATE notes SET user_id = (SELECT id FROM users LIMIT 1);

-- Делаем NOT NULL
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;

-- Добавляем индекс
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Аналогично для folders и custom_databases
ALTER TABLE folders ADD COLUMN user_id VARCHAR(36);
UPDATE folders SET user_id = (SELECT id FROM users LIMIT 1);
ALTER TABLE folders ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_folders_user_id ON folders(user_id);

ALTER TABLE custom_databases ADD COLUMN user_id VARCHAR(36);
UPDATE custom_databases SET user_id = (SELECT id FROM users LIMIT 1);
ALTER TABLE custom_databases ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_custom_databases_user_id ON custom_databases(user_id);
```

---

## 10. Заключение

### Критические уязвимости (требуют немедленного исправления):

1. **CORS wildcard** — позволяет CSRF атаки с любого сайта
2. **IDOR в Notes/Folders/Databases** — любой пользователь может читать/изменять данные других

### Высокоприоритетные улучшения:

3. **Rate Limiting** — защита от DoS и brute force
4. **Унификация получения userId** — уменьшение дублирования и риска ошибок

### Оценка трудозатрат:

| Задача | Время |
|--------|-------|
| CORS fix | 1 час |
| DB миграция | 2-4 часа |
| IDOR fix в коде | 4-8 часов |
| Rate Limiting | 2-4 часа |
| Тестирование | 2-4 часа |
| **Итого** | **11-21 час** |

---

*Анализ выполнен автоматически. Рекомендуется ручная проверка перед внедрением.*
