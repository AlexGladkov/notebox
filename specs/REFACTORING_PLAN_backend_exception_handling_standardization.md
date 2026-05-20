# План рефакторинга: Стандартизация обработки исключений в бэкенде

## Резюме

**Цель:** Централизовать обработку ошибок в `GlobalExceptionHandler`, удалить локальные try-catch блоки из контроллеров, создать единую иерархию доменных исключений, стандартизировать HTTP статусы и коды ошибок.

**Проблемы:**
1. Дублирование типов исключений (`NotFoundException` vs `ResourceNotFoundException`)
2. Доменные исключения не обрабатываются в `GlobalExceptionHandler`
3. Голые try-catch блоки в 6 контроллерах
4. Использование `IllegalArgumentException`, `RuntimeException`, `IllegalStateException` вместо доменных исключений
5. Слишком широкие catch-блоки (`catch (e: Exception)`)

**Результат:** Чистые контроллеры без try-catch, единая точка обработки ошибок, типизированные исключения с понятной семантикой.

---

## Шаги выполнения

### Группа 1: Консолидация иерархии исключений (Critical)

#### Шаг 1.1: Расширить `Exceptions.kt` — создать базовый sealed class

**Файл:** `server/src/main/kotlin/com/notebox/exception/Exceptions.kt`

**Изменения:**
```kotlin
package com.notebox.exception

// Базовый класс для всех доменных исключений
sealed class DomainException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

// Ресурс не найден (HTTP 404)
class NotFoundException(message: String) : DomainException(message)

// Доступ запрещён (HTTP 403)  
class AccessDeniedException(message: String) : DomainException(message)

// Ошибка валидации входных данных (HTTP 400)
class ValidationException(message: String) : DomainException(message)

// Пользователь не аутентифицирован (HTTP 401)
class AuthenticationException(message: String) : DomainException(message)

// Ошибка OAuth провайдера (HTTP 401 или 502)
class OAuthException(message: String, cause: Throwable? = null) : DomainException(message, cause)

// Циклическая ссылка (HTTP 400)
class CircularReferenceException(message: String) : DomainException(message)

// Ошибка внешнего сервиса (HTTP 502)
class ExternalServiceException(message: String, cause: Throwable? = null) : DomainException(message, cause)
```

**Удалить:** Старые классы `ResourceNotFoundException`, `InvalidRequestException`.

---

#### Шаг 1.2: Удалить `DomainExceptions.kt`

**Файл:** `server/src/main/kotlin/com/notebox/exception/DomainExceptions.kt`

**Действие:** Удалить файл полностью.

---

### Группа 2: Обновление GlobalExceptionHandler (Critical)

#### Шаг 2.1: Обновить обработчики исключений

**Файл:** `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt`

**Изменения:**

1. Обновить импорты:
```kotlin
import com.notebox.exception.*
```

2. Заменить обработчик `ResourceNotFoundException` на `NotFoundException`:
```kotlin
@ExceptionHandler(NotFoundException::class)
fun handleNotFoundException(ex: NotFoundException): ResponseEntity<ApiResponse<Nothing>> {
    logger.warn("Resource not found: {}", ex.message)
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(errorResponse("NOT_FOUND", ex.message ?: "Resource not found"))
}
```

3. Добавить обработчик `AccessDeniedException`:
```kotlin
@ExceptionHandler(AccessDeniedException::class)
fun handleAccessDeniedException(ex: AccessDeniedException): ResponseEntity<ApiResponse<Nothing>> {
    logger.warn("Access denied: {}", ex.message)
    return ResponseEntity
        .status(HttpStatus.FORBIDDEN)
        .body(errorResponse("FORBIDDEN", ex.message ?: "Access denied"))
}
```

4. Добавить обработчик `ValidationException`:
```kotlin
@ExceptionHandler(ValidationException::class)
fun handleValidationException(ex: ValidationException): ResponseEntity<ApiResponse<Nothing>> {
    logger.warn("Validation error: {}", ex.message)
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(errorResponse("VALIDATION_ERROR", ex.message ?: "Validation error"))
}
```

5. Добавить обработчик `AuthenticationException`:
```kotlin
@ExceptionHandler(AuthenticationException::class)
fun handleAuthenticationException(ex: AuthenticationException): ResponseEntity<ApiResponse<Nothing>> {
    logger.warn("Authentication error: {}", ex.message)
    return ResponseEntity
        .status(HttpStatus.UNAUTHORIZED)
        .body(errorResponse("UNAUTHORIZED", ex.message ?: "Not authenticated"))
}
```

6. Добавить обработчик `OAuthException`:
```kotlin
@ExceptionHandler(OAuthException::class)
fun handleOAuthException(ex: OAuthException): ResponseEntity<ApiResponse<Nothing>> {
    logger.error("OAuth error: {}", ex.message, ex.cause)
    return ResponseEntity
        .status(HttpStatus.BAD_GATEWAY)
        .body(errorResponse("OAUTH_ERROR", ex.message ?: "OAuth authentication failed"))
}
```

7. Добавить обработчик `ExternalServiceException`:
```kotlin
@ExceptionHandler(ExternalServiceException::class)
fun handleExternalServiceException(ex: ExternalServiceException): ResponseEntity<ApiResponse<Nothing>> {
    logger.error("External service error: {}", ex.message, ex.cause)
    return ResponseEntity
        .status(HttpStatus.BAD_GATEWAY)
        .body(errorResponse("EXTERNAL_SERVICE_ERROR", ex.message ?: "External service error"))
}
```

8. Обновить обработчик `InvalidRequestException` → удалить (заменён на `ValidationException`).

9. Удалить обработчик `IllegalArgumentException` — теперь используем `ValidationException`.

---

### Группа 3: Рефакторинг сервисов (High)

#### Шаг 3.1: NoteService — заменить IllegalArgumentException на доменные исключения

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt`

**Изменения:**

1. Добавить импорт:
```kotlin
import com.notebox.exception.NotFoundException
import com.notebox.exception.ValidationException
import com.notebox.exception.CircularReferenceException
```

2. Строка 50: заменить `throw IllegalArgumentException("Parent note not found")` на:
```kotlin
throw NotFoundException("Parent note with id '$parentId' not found")
```

3. Строка 54: заменить `throw IllegalArgumentException("Maximum nesting depth...")` на:
```kotlin
throw ValidationException("Maximum nesting depth of $MAX_DEPTH levels exceeded")
```

4. Строка 74: заменить `throw IllegalArgumentException("Note not found")` на:
```kotlin
throw NotFoundException("Note with id '$id' not found")
```

5. Строка 81: заменить `throw IllegalArgumentException("Parent note not found")` на:
```kotlin
throw NotFoundException("Parent note with id '$parentId' not found")
```

6. Строки 84, 117: заменить `throw IllegalArgumentException("Note cannot be its own parent")` на:
```kotlin
throw CircularReferenceException("Note cannot be its own parent")
```

7. Строки 90, 123: заменить `throw IllegalArgumentException("Cannot set parent to a descendant note")` на:
```kotlin
throw CircularReferenceException("Cannot set parent to a descendant note")
```

8. Строки 97, 130: заменить `throw IllegalArgumentException("This change would exceed maximum nesting depth...")` на:
```kotlin
throw ValidationException("This change would exceed maximum nesting depth of $MAX_DEPTH levels")
```

9. Строка 108: заменить `throw IllegalArgumentException("Note not found")` на:
```kotlin
throw NotFoundException("Note with id '$noteId' not found")
```

10. Строка 114: заменить `throw IllegalArgumentException("Parent note not found")` на:
```kotlin
throw NotFoundException("Parent note with id '$newParentId' not found")
```

11. Строка 124: заменить `throw IllegalArgumentException("Cannot move note to its own descendant")` на:
```kotlin
throw CircularReferenceException("Cannot move note to its own descendant")
```

---

#### Шаг 3.2: TagService — обновить импорты исключений

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagService.kt`

**Изменения:**
1. Обновить импорт с `com.notebox.exception.NotFoundException` (без изменения — уже используется правильный тип).
2. Если есть `IllegalArgumentException` для валидации — заменить на `ValidationException`.

---

#### Шаг 3.3: FileService — заменить IllegalArgumentException

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileService.kt`

**Изменения:**
1. Добавить импорт `com.notebox.exception.ValidationException`
2. Все `throw IllegalArgumentException(...)` заменить на `throw ValidationException(...)`.

---

### Группа 4: Рефакторинг OAuth провайдеров (High)

#### Шаг 4.1: AppleOAuthProvider — заменить RuntimeException на OAuthException

**Файл:** `server/src/main/kotlin/com/notebox/domain/auth/AppleOAuthProvider.kt`

**Изменения:**

1. Добавить импорт:
```kotlin
import com.notebox.exception.OAuthException
```

2. Строка 75: заменить:
```kotlin
throw RuntimeException("Empty response body from Apple token endpoint")
```
на:
```kotlin
throw OAuthException("Empty response body from Apple token endpoint")
```

3. Строка 78: заменить:
```kotlin
throw RuntimeException("Failed to exchange code with Apple...")
```
на:
```kotlin
throw OAuthException("Failed to exchange code with Apple (${response.code}): $responseBody")
```

4. Строка 84: заменить:
```kotlin
throw RuntimeException("Failed to parse Apple token response: ${e.message}", e)
```
на:
```kotlin
throw OAuthException("Failed to parse Apple token response: ${e.message}", e)
```

5. Строки 106, 112, 119, 123, 125, 128: все `throw RuntimeException(...)` заменить на `throw OAuthException(...)`.

---

#### Шаг 4.2: GoogleOAuthProvider — заменить RuntimeException на OAuthException

**Файл:** `server/src/main/kotlin/com/notebox/domain/auth/GoogleOAuthProvider.kt`

**Изменения:**
1. Добавить импорт `com.notebox.exception.OAuthException`
2. Все `throw RuntimeException(...)` заменить на `throw OAuthException(...)`.

---

### Группа 5: Очистка контроллеров (High)

#### Шаг 5.1: NoteController — удалить try-catch блоки

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt`

**Изменения:**

1. Метод `createNote` (строки 40-61): удалить try-catch, оставить только бизнес-логику:
```kotlin
@PostMapping
fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
    val note = noteService.createNote(
        request.title,
        request.content,
        request.parentId,
        request.icon,
        request.backdropType,
        request.backdropValue,
        request.backdropPositionY,
        request.color
    )
    val noteDto = noteService.getNoteByIdWithTags(note.id)
        ?: throw NotFoundException("Failed to retrieve created note")
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(successResponse(noteDto))
}
```

2. Метод `moveNote` (строки 110-127): удалить try-catch:
```kotlin
@PutMapping("/{id}/move")
fun moveNote(
    @PathVariable @ValidUuid(fieldName = "id") id: String,
    @Valid @RequestBody request: MoveNoteRequest
): ResponseEntity<ApiResponse<NoteDto>> {
    noteService.moveNote(id, request.parentId)
        ?: throw NotFoundException("Note not found")
    val noteDto = noteService.getNoteByIdWithTags(id)
        ?: throw NotFoundException("Note not found")
    return ResponseEntity.ok(successResponse(noteDto))
}
```

3. Добавить импорт `com.notebox.exception.NotFoundException`.

4. Методы `getNoteById`, `updateNote`: заменить inline error response на `throw NotFoundException(...)`.

---

#### Шаг 5.2: TagController — удалить try-catch блоки

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt`

**Изменения:**

1. Удалить импорты старых исключений из `com.notebox.exception`.

2. Добавить импорт `com.notebox.exception.AuthenticationException`.

3. Методы `getAllTags`, `getTagById`, `createTag`, `updateTag`, `deleteTag`, `setNoteTags`: удалить все try-catch блоки.

4. Заменить `getUserIdFromRequest` возвращающий `null` на:
```kotlin
private fun getUserIdFromRequest(request: HttpServletRequest): String {
    val sessionId = request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
        ?: throw AuthenticationException("Session cookie not found")
    return sessionService.getUserIdFromSession(sessionId)
        ?: throw AuthenticationException("Invalid or expired session")
}
```

5. Удалить все inline проверки `?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)...`.

---

#### Шаг 5.3: FileController — удалить try-catch блоки

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt`

**Изменения:**

1. Методы `uploadFile`, `getFileUrl`, `deleteFile`: удалить try-catch блоки, оставить только бизнес-логику.

---

#### Шаг 5.4: ReminderController — удалить try-catch и исправить getCurrentUserId

**Файл:** `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt`

**Изменения:**

1. Добавить импорт `com.notebox.exception.AuthenticationException`.

2. Методы `createReminder`, `updateReminder`: удалить try-catch блоки.

3. Заменить `getCurrentUserId`:
```kotlin
private fun getCurrentUserId(): String {
    val authentication = SecurityContextHolder.getContext().authentication
    return authentication?.principal as? String
        ?: throw AuthenticationException("User not authenticated")
}
```

---

#### Шаг 5.5: NotificationController — удалить широкий catch и исправить getCurrentUserId

**Файл:** `server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt`

**Изменения:**

1. Добавить импорт `com.notebox.exception.AuthenticationException`.

2. Метод `subscribe`: удалить try-catch блок, оставить бизнес-логику.

3. Заменить `getCurrentUserId`:
```kotlin
private fun getCurrentUserId(): String {
    val authentication = SecurityContextHolder.getContext().authentication
    return authentication?.principal as? String
        ?: throw AuthenticationException("User not authenticated")
}
```

---

#### Шаг 5.6: AuthController — упростить обработку ошибок OAuth

**Файл:** `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt`

**Изменения:**

1. Методы `handleOAuthCallback`, `handleOAuthCallbackPost`: оставить try-catch для редиректов (это особый случай — OAuth callback должен редиректить на фронтенд с параметром ошибки, а не возвращать JSON).

2. Метод `loginDemo`: оставить try-catch — демо-режим требует graceful degradation.

---

### Группа 6: Обновление CalendarController и других (Medium)

#### Шаг 6.1: CalendarController — исправить getCurrentUserId

**Файл:** `server/src/main/kotlin/com/notebox/domain/calendar/CalendarController.kt`

**Изменения:**
1. Если есть `IllegalStateException` для аутентификации — заменить на `AuthenticationException`.

---

## Файлы для изменения

| Файл | Тип изменения |
|------|---------------|
| `server/src/main/kotlin/com/notebox/exception/Exceptions.kt` | Расширить |
| `server/src/main/kotlin/com/notebox/exception/DomainExceptions.kt` | Удалить |
| `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/tag/TagService.kt` | Проверить |
| `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/storage/FileService.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/auth/AppleOAuthProvider.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/auth/GoogleOAuthProvider.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt` | Обновить |
| `server/src/main/kotlin/com/notebox/domain/calendar/CalendarController.kt` | Проверить |

## Файлы для создания

Нет.

## Файлы для удаления

| Файл | Причина |
|------|---------|
| `server/src/main/kotlin/com/notebox/exception/DomainExceptions.kt` | Дублирует типы из `Exceptions.kt` |

## Миграция

Миграция данных или API не требуется. Формат ответа `ApiResponse` остаётся неизменным.

Изменяются только коды ошибок для некоторых случаев:
- `INVALID_ARGUMENT` → `VALIDATION_ERROR` (унификация)
- Новые коды: `FORBIDDEN`, `UNAUTHORIZED`, `OAUTH_ERROR`, `EXTERNAL_SERVICE_ERROR`

## Стратегия тестирования

1. **Unit-тесты:** Проверить, что каждый новый тип исключения возвращает корректный HTTP статус и код ошибки.

2. **Интеграционные тесты:**
   - POST `/api/notes` с невалидными данными → 400 + `VALIDATION_ERROR`
   - GET `/api/notes/{id}` с несуществующим ID → 404 + `NOT_FOUND`
   - GET `/api/tags` без сессии → 401 + `UNAUTHORIZED`
   - PUT `/api/tags/{id}` чужого тега → 403 + `FORBIDDEN`
   - POST `/api/notes` с parentId=noteId → 400 + `CIRCULAR_REFERENCE`

3. **Ручное тестирование:** Проверить OAuth flow для Google и Apple.

4. **Компиляция:** После каждого шага проверять компиляцию проекта.

## Оценка рисков

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Сломать OAuth callback | Средняя | Высокое | Сохранить try-catch в AuthController для редиректов |
| Пропустить место с IllegalArgumentException | Низкая | Среднее | Grep по всем файлам перед завершением |
| Изменить контракт API | Низкая | Высокое | Формат ApiResponse не меняется |
| Конфликт импортов после удаления DomainExceptions.kt | Низкая | Низкое | Обновить все импорты перед удалением |

## Порядок выполнения

1. Шаг 1.1 → Шаг 2.1 (исключения и handler взаимозависимы)
2. Шаги 3.1-3.3 (сервисы)
3. Шаги 4.1-4.2 (OAuth провайдеры)
4. Шаги 5.1-5.6 (контроллеры)
5. Шаг 1.2 (удаление DomainExceptions.kt — в конце)
6. Шаг 6.1 (CalendarController — если требуется)

## Ожидаемые метрики

| Метрика | До | После |
|---------|------|-------|
| Количество try-catch в контроллерах | ~15 | 2 (OAuth callbacks) |
| Дублирующих типов исключений | 2 | 0 |
| Типов в GlobalExceptionHandler | 8 | 12 |
| Файлов исключений | 2 | 1 |
