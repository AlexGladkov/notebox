# План рефакторинга: Backend Security — CORS, Auth и IDOR Hardening

**Дата создания:** 2026-05-20  
**Ветка:** refactoring/backend-security-cors-auth-i-idor-hardening  
**Статус:** План готов к выполнению

---

## Краткое описание

Устранение критических уязвимостей безопасности в бэкенде NoteBox:

1. **CORS wildcard** — заменить `allowedOriginPatterns = listOf("*")` на whitelist из конфигурации
2. **IDOR уязвимости** — добавить `userId` в таблицы notes, folders, custom_databases и проверку ownership во всех операциях
3. **Rate Limiting** — добавить защиту от DoS и brute force атак

**Критичность:** CVSS 9.0+ (CORS + IDOR), 7.0+ (Rate Limiting)

---

## Шаги выполнения

### Область 1: CORS Hardening (Критическая)

#### Шаг 1. Удалить дублирующий CorsConfig.kt
**Файл:** `server/src/main/kotlin/com/notebox/config/CorsConfig.kt`  
**Действие:** Удалить файл  
**Причина:** WebMvcConfigurer игнорируется при наличии SecurityConfig.corsConfigurationSource()

#### Шаг 2. Исправить CORS whitelist в SecurityConfig
**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`  
**Изменение:**
```kotlin
// БЫЛО (строки 47-52):
@Bean
fun corsConfigurationSource(): CorsConfigurationSource {
    val configuration = CorsConfiguration()
    configuration.allowedOriginPatterns = listOf("*")  // УЯЗВИМОСТЬ
    ...
}

// СТАНЕТ:
@Value("\${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
private lateinit var allowedOrigins: String

@Bean
fun corsConfigurationSource(): CorsConfigurationSource {
    val configuration = CorsConfiguration()
    configuration.allowedOrigins = allowedOrigins.split(",").map { it.trim() }
    configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
    configuration.allowedHeaders = listOf("Content-Type", "Authorization", "X-Requested-With", "Accept")
    configuration.exposedHeaders = listOf("Content-Disposition")
    configuration.allowCredentials = true
    configuration.maxAge = 3600L
    ...
}
```

---

### Область 2: Миграция базы данных (Критическая)

#### Шаг 3. Создать Flyway миграцию для добавления userId
**Файл:** `server/src/main/resources/db/migration/V004__add_user_id_to_entities.sql`  
**Содержимое:**
```sql
-- Добавляем userId в notes
ALTER TABLE notes ADD COLUMN user_id VARCHAR(36);
UPDATE notes SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_notes_user_id ON notes(user_id);

-- Добавляем userId в folders
ALTER TABLE folders ADD COLUMN user_id VARCHAR(36);
UPDATE folders SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE folders ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Добавляем userId в custom_databases
ALTER TABLE custom_databases ADD COLUMN user_id VARCHAR(36);
UPDATE custom_databases SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
ALTER TABLE custom_databases ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_custom_databases_user_id ON custom_databases(user_id);
```

---

### Область 3: Модели и таблицы (Критическая)

#### Шаг 4. Добавить userId в NotesTable
**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NotesTable.kt`  
**Изменение:** После строки `val id = varchar("id", 36)` добавить:
```kotlin
val userId = varchar("user_id", 36).index()
```

#### Шаг 5. Добавить userId в Note data class
**Файл:** `server/src/main/kotlin/com/notebox/domain/note/Note.kt`  
**Изменение:** Добавить поле `val userId: String` в конструктор

#### Шаг 6. Добавить userId в FoldersTable
**Файл:** `server/src/main/kotlin/com/notebox/domain/folder/FoldersTable.kt`  
**Изменение:** После строки `val id = varchar("id", 36)` добавить:
```kotlin
val userId = varchar("user_id", 36).index()
```

#### Шаг 7. Добавить userId в Folder data class
**Файл:** `server/src/main/kotlin/com/notebox/domain/folder/Folder.kt`  
**Изменение:** Добавить поле `val userId: String` в конструктор

#### Шаг 8. Добавить userId в CustomDatabasesTable
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/CustomDatabasesTable.kt`  
**Изменение:** После строки `val id = varchar("id", 36)` добавить:
```kotlin
val userId = varchar("user_id", 36).index()
```

#### Шаг 9. Добавить userId в CustomDatabase data class
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/CustomDatabase.kt`  
**Изменение:** Добавить поле `val userId: String` в конструктор

---

### Область 4: Репозитории — фильтрация по userId (Критическая)

#### Шаг 10. Обновить NoteRepository
**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Изменения:**
- `findAll()` → `findAllByUserId(userId: String)`
- `findById(id)` → добавить фильтр `.andWhere { NotesTable.userId eq userId }` или проверку после
- `save(note)` → записывать `userId`
- Обновить маппинг для чтения `userId`

#### Шаг 11. Обновить FolderRepository
**Файл:** `server/src/main/kotlin/com/notebox/domain/folder/FolderRepository.kt`  
**Изменения:**
- `findAll()` → `findAllByUserId(userId: String)`
- `findById(id)` → добавить фильтр по userId или проверку после
- `save(folder)` → записывать `userId`
- Обновить маппинг для чтения `userId`

#### Шаг 12. Обновить DatabaseRepository
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseRepository.kt`  
**Изменения:**
- `findAll()` → `findAllByUserId(userId: String)`
- `findById(id)` → добавить фильтр по userId или проверку после
- `save(database)` → записывать `userId`
- Обновить маппинг для чтения `userId`

---

### Область 5: Сервисы — проверка ownership (Критическая)

#### Шаг 13. Обновить NoteService
**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt`  
**Изменения:**
- Все публичные методы принимают `userId: String` как параметр
- `getAllNotes(userId)` → возвращает только заметки пользователя
- `getNoteById(id, userId)` → проверяет ownership, бросает AccessDeniedException
- `createNote(dto, userId)` → устанавливает userId при создании
- `updateNote(id, dto, userId)` → проверяет ownership перед обновлением
- `deleteNote(id, userId)` → проверяет ownership перед удалением

Паттерн проверки ownership (по аналогии с TagService):
```kotlin
fun getNoteByIdForUser(id: String, userId: String): Note {
    val note = noteRepository.findById(id)
        ?: throw NotFoundException("Note not found: $id")
    if (note.userId != userId) {
        throw AccessDeniedException("Access denied to note: $id")
    }
    return note
}
```

#### Шаг 14. Обновить FolderService
**Файл:** `server/src/main/kotlin/com/notebox/domain/folder/FolderService.kt`  
**Изменения:**
- Все публичные методы принимают `userId: String`
- `getAllFolders(userId)` → фильтрация по userId
- `getFolderById(id, userId)` → проверка ownership
- `createFolder(dto, userId)` → установка userId
- `updateFolder(id, dto, userId)` → проверка ownership
- `deleteFolder(id, userId)` → проверка ownership

#### Шаг 15. Обновить DatabaseService
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseService.kt`  
**Изменения:**
- Все публичные методы принимают `userId: String`
- `getAllDatabases(userId)` → фильтрация по userId
- `getDatabaseById(id, userId)` → проверка ownership
- `createDatabase(dto, userId)` → установка userId
- `updateDatabase(id, dto, userId)` → проверка ownership
- `deleteDatabase(id, userId)` → проверка ownership

#### Шаг 16. Обновить ColumnService
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/ColumnService.kt`  
**Изменения:**
- Методы принимают `userId: String`
- Перед операциями с columns проверять ownership parent database через DatabaseService

#### Шаг 17. Обновить RecordService
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/RecordService.kt`  
**Изменения:**
- Методы принимают `userId: String`
- Перед операциями с records проверять ownership parent database через DatabaseService

#### Шаг 18. Обновить FileService (если применимо)
**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileService.kt`  
**Изменения:**
- Проверять, что файл принадлежит пользователю (через parent note/database) перед отдачей URL

---

### Область 6: Контроллеры — извлечение userId (Критическая)

#### Шаг 19. Создать базовый контроллер для унификации получения userId
**Файл:** `server/src/main/kotlin/com/notebox/config/BaseController.kt` (новый файл)  
**Содержимое:**
```kotlin
package com.notebox.config

import com.notebox.exception.AuthenticationException
import org.springframework.security.core.context.SecurityContextHolder

abstract class BaseController {
    protected fun getCurrentUserId(): String {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
            ?: throw AuthenticationException("User not authenticated")
    }
}
```

#### Шаг 20. Обновить NoteController
**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt`  
**Изменения:**
- Наследовать от `BaseController`
- Во всех методах вызывать `getCurrentUserId()` и передавать в сервис
- Удалить любые прямые обращения к cookies/SessionService

#### Шаг 21. Обновить FolderController
**Файл:** `server/src/main/kotlin/com/notebox/domain/folder/FolderController.kt`  
**Изменения:**
- Наследовать от `BaseController`
- Во всех методах вызывать `getCurrentUserId()` и передавать в сервис

#### Шаг 22. Обновить DatabaseController
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseController.kt`  
**Изменения:**
- Наследовать от `BaseController`
- Во всех методах вызывать `getCurrentUserId()` и передавать в сервис

#### Шаг 23. Обновить FileController
**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt`  
**Изменения:**
- Наследовать от `BaseController`
- Во всех методах вызывать `getCurrentUserId()` и передавать в сервис

#### Шаг 24. Рефакторинг TagController на BaseController
**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt`  
**Изменения:**
- Наследовать от `BaseController` вместо дублирования логики
- Удалить `getUserIdFromRequest()` и `SESSION_COOKIE_NAME`
- Использовать `getCurrentUserId()`

---

### Область 7: Обновление Demo сервиса (Высокая)

#### Шаг 25. Обновить DemoContentService
**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoContentService.kt`  
**Изменения:**
- При создании demo контента передавать `userId` во все entities
- Убедиться, что DemoNoteBuilder и DemoDatabaseBuilder устанавливают userId

#### Шаг 26. Обновить DemoNoteBuilder
**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoNoteBuilder.kt`  
**Изменения:**
- Добавить `userId` в создаваемые заметки

#### Шаг 27. Обновить DemoDatabaseBuilder
**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoDatabaseBuilder.kt`  
**Изменения:**
- Добавить `userId` в создаваемые базы данных

---

### Область 8: Rate Limiting (Высокая)

#### Шаг 28. Добавить зависимость Bucket4j
**Файл:** `server/build.gradle.kts`  
**Изменение:** В блок dependencies добавить:
```kotlin
// Rate Limiting
implementation("com.bucket4j:bucket4j-core:8.7.0")
```

#### Шаг 29. Создать RateLimitException
**Файл:** `server/src/main/kotlin/com/notebox/exception/Exceptions.kt`  
**Изменение:** Добавить:
```kotlin
/**
 * Превышен лимит запросов (HTTP 429).
 */
class RateLimitException(message: String) : DomainException(message)
```

#### Шаг 30. Обновить GlobalExceptionHandler для RateLimitException
**Файл:** `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt`  
**Изменение:** Добавить обработчик:
```kotlin
@ExceptionHandler(RateLimitException::class)
fun handleRateLimitException(ex: RateLimitException): ResponseEntity<ApiResponse<Nothing>> {
    return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
        .body(errorResponse("RATE_LIMIT_EXCEEDED", ex.message ?: "Too many requests"))
}
```

#### Шаг 31. Создать RateLimitFilter
**Файл:** `server/src/main/kotlin/com/notebox/config/RateLimitFilter.kt` (новый файл)  
**Содержимое:**
```kotlin
package com.notebox.config

import io.github.bucket4j.Bandwidth
import io.github.bucket4j.Bucket
import io.github.bucket4j.Refill
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

@Component
class RateLimitFilter : OncePerRequestFilter() {
    
    private val buckets = ConcurrentHashMap<String, Bucket>()
    
    // Лимиты: 100 запросов в минуту на IP
    private val limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)))
    
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val clientIp = getClientIp(request)
        val bucket = buckets.computeIfAbsent(clientIp) { Bucket.builder().addLimit(limit).build() }
        
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response)
        } else {
            response.status = HttpServletResponse.SC_TOO_MANY_REQUESTS
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests"}}""")
        }
    }
    
    private fun getClientIp(request: HttpServletRequest): String {
        val xForwardedFor = request.getHeader("X-Forwarded-For")
        return if (!xForwardedFor.isNullOrBlank()) {
            xForwardedFor.split(",").first().trim()
        } else {
            request.remoteAddr
        }
    }
}
```

#### Шаг 32. Зарегистрировать RateLimitFilter в SecurityConfig
**Файл:** `server/src/main/kotlin/com/notebox/config/SecurityConfig.kt`  
**Изменение:** Добавить фильтр первым в цепочке:
```kotlin
.addFilterBefore(rateLimitFilter, SessionAuthenticationFilter::class.java)
```

---

## Файлы для изменения (полный список)

| Файл | Тип изменения |
|------|---------------|
| `config/CorsConfig.kt` | Удалить |
| `config/SecurityConfig.kt` | Изменить CORS, добавить RateLimitFilter |
| `config/BaseController.kt` | Создать |
| `config/RateLimitFilter.kt` | Создать |
| `config/GlobalExceptionHandler.kt` | Добавить обработчик 429 |
| `db/migration/V004__add_user_id_to_entities.sql` | Создать |
| `exception/Exceptions.kt` | Добавить RateLimitException |
| `domain/note/NotesTable.kt` | Добавить userId |
| `domain/note/Note.kt` | Добавить userId |
| `domain/note/NoteRepository.kt` | Фильтрация по userId |
| `domain/note/NoteService.kt` | Проверка ownership |
| `domain/note/NoteController.kt` | Извлечение userId |
| `domain/folder/FoldersTable.kt` | Добавить userId |
| `domain/folder/Folder.kt` | Добавить userId |
| `domain/folder/FolderRepository.kt` | Фильтрация по userId |
| `domain/folder/FolderService.kt` | Проверка ownership |
| `domain/folder/FolderController.kt` | Извлечение userId |
| `domain/database/CustomDatabasesTable.kt` | Добавить userId |
| `domain/database/CustomDatabase.kt` | Добавить userId |
| `domain/database/DatabaseRepository.kt` | Фильтрация по userId |
| `domain/database/DatabaseService.kt` | Проверка ownership |
| `domain/database/DatabaseController.kt` | Извлечение userId |
| `domain/database/ColumnService.kt` | Проверка через parent |
| `domain/database/RecordService.kt` | Проверка через parent |
| `domain/storage/FileController.kt` | Извлечение userId |
| `domain/storage/FileService.kt` | Проверка ownership |
| `domain/tag/TagController.kt` | Рефакторинг на BaseController |
| `domain/demo/DemoContentService.kt` | Передача userId |
| `domain/demo/DemoNoteBuilder.kt` | Установка userId |
| `domain/demo/DemoDatabaseBuilder.kt` | Установка userId |
| `build.gradle.kts` | Добавить bucket4j |

---

## Файлы для создания

| Файл | Назначение |
|------|------------|
| `config/BaseController.kt` | Базовый контроллер с унифицированным getCurrentUserId() |
| `config/RateLimitFilter.kt` | Фильтр rate limiting на основе Bucket4j |
| `db/migration/V004__add_user_id_to_entities.sql` | Миграция для добавления userId в БД |

---

## Файлы для удаления

| Файл | Причина |
|------|---------|
| `config/CorsConfig.kt` | Дублирует функционал SecurityConfig, не применяется |

---

## Миграция данных

**Стратегия:** Существующие данные без userId привязываются к первому созданному пользователю (обычно demo user).

```sql
UPDATE notes SET user_id = (SELECT id FROM users ORDER BY created_at LIMIT 1) WHERE user_id IS NULL;
```

**Риски:**
- Если в БД несколько реальных пользователей, их данные будут смешаны
- **Митигация:** Для production необходима ручная миграция с маппингом данных к владельцам

---

## Стратегия тестирования

### Ручное тестирование
1. **CORS:** Запустить frontend на localhost:5173, убедиться что запросы проходят; попробовать с другого origin — должен быть CORS error
2. **IDOR:** Создать две учётные записи, попытаться получить заметку другого пользователя по ID — должен быть 403
3. **Rate Limiting:** Отправить 101 запрос за минуту — последний должен вернуть 429

### Автоматические тесты (если есть время)
- Интеграционные тесты для CORS headers
- Unit тесты для ownership проверки в сервисах
- Unit тесты для RateLimitFilter

---

## Оценка рисков

### Риски при выполнении

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Миграция сломает существующие данные | Средняя | Высокое | Backup перед миграцией, проверка в dev окружении |
| Frontend перестанет работать после CORS fix | Низкая | Высокое | Добавить все легитимные origins в whitelist через переменную окружения |
| Rate limiting заблокирует легитимных пользователей | Низкая | Среднее | Установлен разумный лимит 100 req/min |
| Сломаются demo сценарии | Средняя | Среднее | Обновить DemoContentService для передачи userId |

### Критические зависимости
- Шаги 3-9 (миграция + модели) должны выполняться вместе
- Шаги 10-18 (репозитории + сервисы) зависят от шагов 4-9
- Шаги 19-24 (контроллеры) зависят от шагов 13-18

---

## Порядок выполнения

1. **Критический блок 1:** CORS (шаги 1-2) — можно выполнить независимо
2. **Критический блок 2:** IDOR схема + модели (шаги 3-9) — вместе
3. **Критический блок 3:** IDOR репозитории + сервисы (шаги 10-18) — после блока 2
4. **Критический блок 4:** IDOR контроллеры (шаги 19-24) — после блока 3
5. **Высокий приоритет:** Demo сервис (шаги 25-27) — после блока 4
6. **Высокий приоритет:** Rate Limiting (шаги 28-32) — независимо от IDOR

---

*План создан автоматически на основе анализа безопасности. Рекомендуется ревью перед выполнением.*
