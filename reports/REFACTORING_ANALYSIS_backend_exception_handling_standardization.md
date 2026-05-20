# Анализ: Стандартизация обработки исключений в бэкенде

## 1. Обзор текущей архитектуры

### 1.1 Существующие компоненты обработки ошибок

| Компонент | Путь | Назначение |
|-----------|------|------------|
| GlobalExceptionHandler | `config/GlobalExceptionHandler.kt` | Централизованная обработка исключений через @RestControllerAdvice |
| DomainExceptions.kt | `exception/DomainExceptions.kt` | Доменные исключения: NotFoundException, AccessDeniedException |
| Exceptions.kt | `exception/Exceptions.kt` | Другие исключения: ResourceNotFoundException, InvalidRequestException, CircularReferenceException |
| ApiResponse | `dto/ApiResponse.kt` | Единый формат ответа API |

### 1.2 Текущий формат ответа об ошибке

```kotlin
data class ApiResponse<T>(
    val data: T?,
    val error: ErrorDto? = null
)

data class ErrorDto(
    val code: String,
    val message: String
)
```

### 1.3 Обрабатываемые исключения в GlobalExceptionHandler

| Исключение | HTTP статус | Код ошибки |
|------------|-------------|------------|
| ResourceNotFoundException | 404 | NOT_FOUND |
| InvalidRequestException | 400 | INVALID_REQUEST |
| CircularReferenceException | 400 | CIRCULAR_REFERENCE |
| MethodArgumentNotValidException | 400 | VALIDATION_ERROR |
| ConstraintViolationException | 400 | VALIDATION_ERROR |
| MaxUploadSizeExceededException | 413 | FILE_TOO_LARGE |
| IllegalArgumentException | 400 | INVALID_ARGUMENT |
| Exception (fallback) | 500 | INTERNAL_ERROR |

---

## 2. Список затронутых файлов и компонентов

### 2.1 Контроллеры с локальной обработкой исключений

| Файл | Строки с try-catch | Проблема |
|------|-------------------|----------|
| `domain/auth/AuthController.kt` | 68, 122, 216 | Catch Exception, IllegalArgumentException |
| `domain/note/NoteController.kt` | 41, 115 | Catch IllegalArgumentException |
| `domain/tag/TagController.kt` | 46, 67, 87, 114, 137 | Catch NotFoundException, AccessDeniedException, IllegalArgumentException |
| `domain/storage/FileController.kt` | 29, 46, 56 | Catch IllegalArgumentException |
| `domain/reminder/ReminderController.kt` | 59, 86 | Catch IllegalArgumentException |
| `domain/notification/NotificationController.kt` | 48 | Catch Exception (слишком широкий) |

### 2.2 Сервисы, бросающие исключения

| Файл | Исключения | Проблема |
|------|------------|----------|
| `domain/note/NoteService.kt` | IllegalArgumentException | Не используются доменные исключения |
| `domain/tag/TagService.kt` | NotFoundException, AccessDeniedException, IllegalArgumentException | Смешанный подход |
| `domain/storage/FileService.kt` | IllegalArgumentException | Не используются доменные исключения |
| `domain/folder/FolderService.kt` | - | Не валидирует входные данные |
| `domain/auth/OAuthService.kt` | RuntimeException | Используется RuntimeException |

### 2.3 OAuth провайдеры с проблемной обработкой

| Файл | Строки | Проблема |
|------|--------|----------|
| `domain/auth/AppleOAuthProvider.kt` | 81, 109, 115 | Бросает RuntimeException вместо доменных исключений |
| `domain/auth/GoogleOAuthProvider.kt` | 82, 111 | Бросает RuntimeException вместо доменных исключений |

### 2.4 Другие компоненты с try-catch

| Файл | Описание |
|------|----------|
| `domain/calendar/GoogleCalendarService.kt` | Глушит ошибки через catch + log |
| `domain/reminder/ReminderCalendarSyncService.kt` | Глушит ошибки через catch + log |
| `domain/reminder/ReminderScheduler.kt` | Catch Exception в scheduled job |
| `domain/notification/PushNotificationService.kt` | Catch Exception при отправке |
| `domain/demo/DemoContentService.kt` | Catch Exception с rollback |
| `config/DatabaseConfig.kt` | Catch Exception при миграции |

---

## 3. Граф зависимостей затронутого кода

```
GlobalExceptionHandler
    ├── ApiResponse
    │   └── ErrorDto
    ├── Exceptions.kt
    │   ├── ResourceNotFoundException
    │   ├── InvalidRequestException
    │   └── CircularReferenceException
    └── DomainExceptions.kt (НЕ ПОДКЛЮЧЕНО!)
        ├── NotFoundException
        └── AccessDeniedException

Контроллеры
    ├── AuthController
    │   ├── OAuthService
    │   │   ├── AppleOAuthProvider → RuntimeException
    │   │   └── GoogleOAuthProvider → RuntimeException
    │   ├── SessionService
    │   └── DemoAuthProvider
    ├── NoteController
    │   └── NoteService → IllegalArgumentException
    ├── TagController
    │   └── TagService → NotFoundException, AccessDeniedException, IllegalArgumentException
    ├── FileController
    │   └── FileService → IllegalArgumentException
    ├── ReminderController
    │   └── ReminderService
    ├── NotificationController
    │   └── PushSubscriptionRepository
    ├── FolderController
    │   └── FolderService (без валидации)
    ├── DatabaseController
    │   └── DatabaseService
    └── CalendarController
        └── GoogleCalendarService (глушит ошибки)
```

---

## 4. Выявленные проблемы (Code Smells)

### 4.1 Дублирование типов исключений

**Проблема:** Существуют два похожих исключения для одного случая:
- `NotFoundException` в `DomainExceptions.kt`
- `ResourceNotFoundException` в `Exceptions.kt`

**Последствия:** Путаница, невозможно единообразно обработать ошибку "не найдено".

### 4.2 Отсутствие обработки доменных исключений в GlobalExceptionHandler

**Проблема:** `NotFoundException` и `AccessDeniedException` из `DomainExceptions.kt` НЕ обрабатываются в `GlobalExceptionHandler`.

**Последствия:** `TagController` вынужден вручную ловить эти исключения (строки 46-55, 87-102).

### 4.3 Голые try-catch блоки в контроллерах

**Пример из NoteController.kt (строки 41-61):**
```kotlin
@PostMapping
fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
    try {
        val note = noteService.createNote(...)
        // ...
    } catch (e: IllegalArgumentException) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
    }
}
```

**Проблема:** Логика обработки ошибок размазана по всем контроллерам.

### 4.4 Использование IllegalArgumentException вместо доменных исключений

**Пример из NoteService.kt:**
```kotlin
if (parentDepth >= MAX_DEPTH) {
    throw IllegalArgumentException("Maximum nesting depth of $MAX_DEPTH levels exceeded")
}
```

**Проблема:** `IllegalArgumentException` — слишком общее исключение, не несёт семантики домена.

### 4.5 RuntimeException в OAuth провайдерах

**Пример из AppleOAuthProvider.kt (строка 84):**
```kotlin
throw RuntimeException("Failed to parse Apple token response: ${e.message}", e)
```

**Проблема:** Нет специфического типа для ошибок OAuth, невозможно корректно обработать.

### 4.6 Глушение ошибок в интеграциях

**Пример из GoogleCalendarService.kt (строки 91-97):**
```kotlin
fun deleteEvent(userId: String, googleEventId: String) {
    try {
        // ...
    } catch (e: Exception) {
        logger.error("Failed to delete calendar event", e)
        // Ошибка проглочена!
    }
}
```

**Проблема:** Пользователь не узнает об ошибке синхронизации с календарём.

### 4.7 Слишком широкий catch в NotificationController

**Строка 58:**
```kotlin
} catch (e: Exception) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(errorResponse("SUBSCRIPTION_ERROR", e.message ?: "Failed to create subscription"))
}
```

**Проблема:** Любая ошибка (включая NullPointerException) возвращается как SUBSCRIPTION_ERROR.

### 4.8 IllegalStateException для аутентификации

**Пример из ReminderController.kt (строка 121):**
```kotlin
private fun getCurrentUserId(): String {
    return authentication?.principal as? String
        ?: throw IllegalStateException("User not authenticated")
}
```

**Проблема:** `IllegalStateException` не обрабатывается специфически, попадает в generic handler как 500 Internal Error.

---

## 5. Оценка рисков

### 5.1 Высокий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Удаление дублирующихся исключений | Сломать код, использующий старые типы | Полный поиск и замена |
| Изменение типов исключений в сервисах | Сломать контроллеры, которые ловят эти исключения | Обновить контроллеры параллельно |

### 5.2 Средний риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Добавление новых типов исключений | Пропустить место, где нужно обновить | Тестирование всех endpoints |
| Изменение GlobalExceptionHandler | Неожиданные ответы клиентам | Проверить контракт с фронтендом |

### 5.3 Низкий риск

| Изменение | Риск | Митигация |
|-----------|------|-----------|
| Удаление локальных try-catch | Минимальный, если GlobalExceptionHandler покрывает все случаи | Добавить обработчики перед удалением |

---

## 6. Рекомендуемый подход

### 6.1 Этап 1: Консолидация исключений

1. Оставить один файл `exception/Exceptions.kt` со всеми доменными исключениями
2. Создать иерархию:
   ```kotlin
   sealed class DomainException(message: String) : RuntimeException(message)
   
   class NotFoundException(message: String) : DomainException(message)
   class AccessDeniedException(message: String) : DomainException(message)
   class ValidationException(message: String) : DomainException(message)
   class AuthenticationException(message: String) : DomainException(message)
   class OAuthException(message: String, cause: Throwable? = null) : DomainException(message)
   class CircularReferenceException(message: String) : DomainException(message)
   ```

3. Удалить `DomainExceptions.kt` после миграции

### 6.2 Этап 2: Обновление GlobalExceptionHandler

1. Добавить обработчики для всех доменных исключений
2. Стандартизировать HTTP статусы:
   - `NotFoundException` → 404
   - `AccessDeniedException` → 403
   - `ValidationException` → 400
   - `AuthenticationException` → 401
   - `OAuthException` → 401 или 502 (в зависимости от причины)

### 6.3 Этап 3: Рефакторинг сервисов

1. Заменить `IllegalArgumentException` на `ValidationException`
2. Заменить `RuntimeException` в OAuth на `OAuthException`
3. Заменить `IllegalStateException` для аутентификации на `AuthenticationException`

### 6.4 Этап 4: Очистка контроллеров

1. Удалить локальные try-catch блоки
2. Оставить только бизнес-логику в методах контроллеров

### 6.5 Этап 5: Обработка интеграций

1. Создать `ExternalServiceException` для ошибок внешних сервисов
2. В `GoogleCalendarService` и подобных — не глушить ошибки, а пробрасывать
3. Добавить логику retry или graceful degradation где необходимо

---

## 7. Ожидаемый результат

### До рефакторинга (NoteController.kt):
```kotlin
@PostMapping
fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
    try {
        val note = noteService.createNote(...)
        return ResponseEntity.status(HttpStatus.CREATED).body(successResponse(noteDto))
    } catch (e: IllegalArgumentException) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
    }
}
```

### После рефакторинга (NoteController.kt):
```kotlin
@PostMapping
fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
    val note = noteService.createNote(...)
    return ResponseEntity.status(HttpStatus.CREATED).body(successResponse(noteDto))
}
```

Обработка ошибок централизована в `GlobalExceptionHandler`.

---

## 8. Метрики успеха

| Метрика | До | После |
|---------|------|-------|
| Количество try-catch в контроллерах | ~20 | 0 |
| Типов исключений для одного случая | 2 (NotFoundException + ResourceNotFoundException) | 1 |
| Покрытие GlobalExceptionHandler | 8 типов | 10+ типов |
| Контроллеры с локальной обработкой | 6 | 0 |

---

## 9. Приложение: Полный список файлов для изменения

### Обязательные изменения:
1. `server/src/main/kotlin/com/notebox/exception/DomainExceptions.kt` — удалить
2. `server/src/main/kotlin/com/notebox/exception/Exceptions.kt` — расширить
3. `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt` — обновить
4. `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` — удалить try-catch
5. `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` — заменить исключения
6. `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt` — удалить try-catch
7. `server/src/main/kotlin/com/notebox/domain/tag/TagService.kt` — обновить импорты
8. `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt` — удалить try-catch
9. `server/src/main/kotlin/com/notebox/domain/storage/FileService.kt` — заменить исключения
10. `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt` — упростить обработку
11. `server/src/main/kotlin/com/notebox/domain/auth/AppleOAuthProvider.kt` — заменить RuntimeException
12. `server/src/main/kotlin/com/notebox/domain/auth/GoogleOAuthProvider.kt` — заменить RuntimeException
13. `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt` — удалить try-catch
14. `server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt` — удалить широкий catch
15. `server/src/main/kotlin/com/notebox/domain/calendar/CalendarController.kt` — обновить getCurrentUserId

### Рекомендуемые (не обязательные):
16. `server/src/main/kotlin/com/notebox/domain/calendar/GoogleCalendarService.kt` — не глушить ошибки
17. `server/src/main/kotlin/com/notebox/domain/reminder/ReminderCalendarSyncService.kt` — пробрасывать ошибки
18. `server/src/main/kotlin/com/notebox/domain/notification/PushNotificationService.kt` — специфичные исключения
