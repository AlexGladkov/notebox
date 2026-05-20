# План рефакторинга: Backend Controllers — Input Validation и DTO Standardization

**Дата:** 2026-05-20  
**Автор:** Claude Code  
**Статус:** Готов к исполнению

---

## Резюме

Данный план направлен на стандартизацию слоя контроллеров в backend-части приложения NoteBox:

1. **Добавление @Valid аннотаций** — обеспечить валидацию входных данных на всех endpoints
2. **Стандартизация DTO** — добавить недостающие валидационные аннотации в request-объекты
3. **Вынос бизнес-логики** — перенести валидацию файлов и парсинг enum из контроллеров
4. **Унификация API ответов** — привести все ответы к единому формату `ApiResponse<T>`
5. **Замена ValidationUtils** — создать кастомный `@ValidUuid` валидатор вместо ручных проверок

**Основные проблемы:**
- `AuthController.updateCurrentUser()` не использует @Valid
- `UpdateUserDto` не имеет валидационных аннотаций
- `FileController` содержит ~70 строк логики валидации файлов
- `NotificationController.getVapidPublicKey()` возвращает `Map` вместо `ApiResponse`
- 27 вызовов `ValidationUtils.validateUUID()` вручную в контроллерах

---

## Шаги рефакторинга

### Группа 1: Инфраструктура валидации (Критический приоритет)

#### Шаг 1: Создать аннотацию @ValidUuid
**Файл:** `server/src/main/kotlin/com/notebox/validation/ValidUuid.kt` (новый)

```kotlin
package com.notebox.validation

import jakarta.validation.Constraint
import jakarta.validation.Payload
import kotlin.reflect.KClass

@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [UuidValidator::class])
annotation class ValidUuid(
    val message: String = "Invalid UUID format",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = [],
    val fieldName: String = "id"
)
```

#### Шаг 2: Создать валидатор UuidValidator
**Файл:** `server/src/main/kotlin/com/notebox/validation/UuidValidator.kt` (новый)

```kotlin
package com.notebox.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import java.util.UUID

class UuidValidator : ConstraintValidator<ValidUuid, String?> {
    private lateinit var fieldName: String
    
    override fun initialize(constraintAnnotation: ValidUuid) {
        fieldName = constraintAnnotation.fieldName
    }
    
    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        if (value == null) return true // null handled by @NotNull
        return try {
            UUID.fromString(value)
            true
        } catch (e: IllegalArgumentException) {
            context.disableDefaultConstraintViolation()
            context.buildConstraintViolationWithTemplate("Invalid UUID format for field: $fieldName")
                .addConstraintViolation()
            false
        }
    }
}
```

#### Шаг 3: Создать аннотацию @ValidThemePreference
**Файл:** `server/src/main/kotlin/com/notebox/validation/ValidThemePreference.kt` (новый)

```kotlin
package com.notebox.validation

import jakarta.validation.Constraint
import jakarta.validation.Payload
import kotlin.reflect.KClass

@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [ThemePreferenceValidator::class])
annotation class ValidThemePreference(
    val message: String = "Invalid theme preference. Allowed values: light, dark, system",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = []
)
```

#### Шаг 4: Создать валидатор ThemePreferenceValidator
**Файл:** `server/src/main/kotlin/com/notebox/validation/ThemePreferenceValidator.kt` (новый)

```kotlin
package com.notebox.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext

class ThemePreferenceValidator : ConstraintValidator<ValidThemePreference, String?> {
    companion object {
        val VALID_THEMES = setOf("light", "dark", "system")
    }
    
    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        if (value == null) return true
        return value in VALID_THEMES
    }
}
```

---

### Группа 2: Стандартизация DTO (Высокий приоритет)

#### Шаг 5: Добавить валидацию в UpdateUserDto
**Файл:** `server/src/main/kotlin/com/notebox/dto/UpdateUserDto.kt`

**Изменения:**
- Добавить `@field:Size(max = 255)` к `name`
- Добавить `@field:Size(max = 2048)` к `avatarUrl`
- Добавить `@field:ValidThemePreference` к `themePreference`

```kotlin
data class UpdateUserDto(
    @field:Size(max = 255, message = "Name must be at most 255 characters")
    val name: String? = null,
    
    @field:Size(max = 2048, message = "Avatar URL must be at most 2048 characters")
    val avatarUrl: String? = null,
    
    @field:ValidThemePreference
    val themePreference: String? = null
)
```

#### Шаг 6: Добавить валидацию UUID в MoveNoteRequest
**Файл:** `server/src/main/kotlin/com/notebox/dto/NoteDto.kt`

**Изменения в `MoveNoteRequest`:**
- Добавить `@field:ValidUuid(fieldName = "parentId")` к `parentId`

```kotlin
data class MoveNoteRequest(
    @field:ValidUuid(fieldName = "parentId")
    val parentId: String? = null
)
```

#### Шаг 7: Добавить валидацию в SetNoteTagsRequest
**Файл:** `server/src/main/kotlin/com/notebox/dto/TagDto.kt`

**Изменения в `SetNoteTagsRequest`:**
- Добавить `@field:NotNull` и `@field:Size(min = 0)` к `tagIds` (разрешаем пустой список для удаления тегов)

```kotlin
data class SetNoteTagsRequest(
    @field:NotNull(message = "Tag IDs list cannot be null")
    val tagIds: List<String>
)
```

#### Шаг 8: Добавить enum RepeatType в ReminderDto (опционально)
**Файл:** `server/src/main/kotlin/com/notebox/dto/ReminderDto.kt`

**Изменения:**
- Заменить `repeatType: String?` на `repeatType: RepeatType?` в `CreateReminderRequest` и `UpdateReminderRequest`
- Или добавить кастомную валидацию для строкового значения

Поскольку это breaking change для API, рекомендуется оставить String и добавить валидацию:
```kotlin
@field:Pattern(regexp = "^(NONE|DAILY|WEEKLY|MONTHLY|YEARLY)$", message = "Invalid repeat type")
val repeatType: String? = null
```

---

### Группа 3: Рефакторинг контроллеров (Высокий приоритет)

#### Шаг 9: Добавить @Valid в AuthController.updateCurrentUser()
**Файл:** `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt`

**Изменения:**
- Добавить `@Valid` перед `@RequestBody updateDto: UpdateUserDto`
- Удалить ручную валидацию `themePreference` (перенесена в DTO)

```kotlin
@PutMapping("/me")
fun updateCurrentUser(
    request: HttpServletRequest,
    @Valid @RequestBody updateDto: UpdateUserDto
): ResponseEntity<ApiResponse<UserDto>>
```

Также удалить блок:
```kotlin
// УДАЛИТЬ:
if (updateDto.themePreference != null &&
    updateDto.themePreference !in VALID_THEME_PREFERENCES) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST)
        .body(ApiResponse.error<Nothing>("INVALID_THEME", ...))
}
```

И удалить константу `VALID_THEME_PREFERENCES` из контроллера.

#### Шаг 10: Создать FileValidationService
**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileValidationService.kt` (новый)

Перенести логику валидации файлов из `FileController`:
- `isValidFileType(inputStream, extension)`
- `isValidExtension(extension)`
- Константы `ALLOWED_EXTENSIONS`, `ALLOWED_CONTENT_TYPES`, `MAX_FILE_SIZE`
- Логику проверки magic bytes

```kotlin
@Service
class FileValidationService {
    companion object {
        val ALLOWED_EXTENSIONS = setOf("jpg", "jpeg", "png", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx")
        val ALLOWED_CONTENT_TYPES = setOf(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "application/pdf",
            "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        const val MAX_FILE_SIZE = 10 * 1024 * 1024L // 10MB
    }
    
    fun validateFile(file: MultipartFile): FileValidationResult
    fun isValidFileType(inputStream: InputStream, extension: String): Boolean
    fun isValidExtension(extension: String): Boolean
}

data class FileValidationResult(
    val isValid: Boolean,
    val errorCode: String? = null,
    val errorMessage: String? = null
)
```

#### Шаг 11: Упростить FileController
**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt`

**Изменения:**
- Внедрить `FileValidationService`
- Заменить inline-валидацию на вызов сервиса
- Удалить private методы `isValidFileType`, `isValidExtension`
- Удалить константы, перенесённые в сервис

```kotlin
@PostMapping("/upload")
fun uploadFile(
    @RequestParam("file") file: MultipartFile,
    @RequestParam("userId") userId: String
): ResponseEntity<ApiResponse<FileDto>> {
    val validationResult = fileValidationService.validateFile(file)
    if (!validationResult.isValid) {
        return ResponseEntity.badRequest()
            .body(ApiResponse.error(validationResult.errorCode!!, validationResult.errorMessage!!))
    }
    // ... остальная логика
}
```

#### Шаг 12: Исправить формат ответа в NotificationController.getVapidPublicKey()
**Файл:** `server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt`

**Текущий код:**
```kotlin
@GetMapping("/vapid-public-key")
fun getVapidPublicKey(): ResponseEntity<Map<String, Any>> {
    return ResponseEntity.ok(mapOf("publicKey" to vapidPublicKey))
}
```

**Изменить на:**
```kotlin
@GetMapping("/vapid-public-key")
fun getVapidPublicKey(): ResponseEntity<ApiResponse<VapidKeyResponse>> {
    return ResponseEntity.ok(ApiResponse.success(VapidKeyResponse(vapidPublicKey)))
}
```

И добавить DTO:
```kotlin
data class VapidKeyResponse(val publicKey: String)
```

#### Шаг 13: Исправить формат ответа в FileController.deleteFile()
**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt`

**Текущий код:**
```kotlin
return ResponseEntity.badRequest().build()
```

**Изменить на:**
```kotlin
return ResponseEntity.badRequest()
    .body(ApiResponse.error<Nothing>("DELETE_FAILED", "Failed to delete file"))
```

---

### Группа 4: Замена ValidationUtils.validateUUID() (Средний приоритет)

#### Шаг 14: Рефакторинг NoteController — заменить ValidationUtils
**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt`

**Изменения (8 мест):**
- Заменить path variable валидацию: `@PathVariable @ValidUuid(fieldName = "id") id: String`
- Удалить вызовы `ValidationUtils.validateUUID(id, "id")`

Пример:
```kotlin
// БЫЛО:
@GetMapping("/{id}")
fun getNote(@PathVariable id: String): ResponseEntity<ApiResponse<NoteDto>> {
    ValidationUtils.validateUUID(id, "id")
    // ...
}

// СТАЛО:
@GetMapping("/{id}")
fun getNote(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<NoteDto>> {
    // ...
}
```

#### Шаг 15: Рефакторинг FolderController — заменить ValidationUtils
**Файл:** `server/src/main/kotlin/com/notebox/domain/folder/FolderController.kt`

**Изменения (4 места):**
- Добавить `@ValidUuid` к path variables
- Удалить вызовы `ValidationUtils.validateUUID()`

#### Шаг 16: Рефакторинг DatabaseController — заменить ValidationUtils
**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseController.kt`

**Изменения (10 мест):**
- Добавить `@ValidUuid` к path variables
- Удалить вызовы `ValidationUtils.validateUUID()`

#### Шаг 17: Рефакторинг TagController — заменить ValidationUtils
**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt`

**Изменения (5 мест):**
- Добавить `@ValidUuid` к path variables
- Удалить вызовы `ValidationUtils.validateUUID()`

#### Шаг 18: Рефакторинг ReminderController — заменить ValidationUtils
**Файл:** `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt`

**Изменения (4 места):**
- Добавить `@ValidUuid` к path variables
- Удалить вызовы `ValidationUtils.validateUUID()`
- Также: перенести парсинг `RepeatType.valueOf()` в сервис или использовать Jackson deserialization

#### Шаг 19: Пометить ValidationUtils как deprecated или удалить
**Файл:** `server/src/main/kotlin/com/notebox/util/ValidationUtils.kt`

**Вариант A — Deprecated:**
```kotlin
@Deprecated("Use @ValidUuid annotation instead", ReplaceWith("@ValidUuid"))
object ValidationUtils {
    // ...
}
```

**Вариант B — Удалить файл полностью** (если все использования заменены)

---

### Группа 5: Обновление GlobalExceptionHandler (Низкий приоритет)

#### Шаг 20: Добавить обработку ConstraintViolationException
**Файл:** `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt`

Убедиться, что обрабатывается `ConstraintViolationException` для валидации path variables:

```kotlin
@ExceptionHandler(ConstraintViolationException::class)
fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<ApiResponse<Nothing>> {
    val errors = ex.constraintViolations.map { 
        "${it.propertyPath}: ${it.message}" 
    }
    return ResponseEntity.badRequest()
        .body(ApiResponse.error("VALIDATION_ERROR", errors.joinToString("; ")))
}
```

#### Шаг 21: Добавить @Validated на контроллеры
**Файлы:** Все контроллеры, использующие `@ValidUuid` на path variables

Добавить аннотацию `@Validated` на уровне класса контроллера для активации валидации path variables:

```kotlin
@RestController
@RequestMapping("/api/notes")
@Validated  // <-- Добавить
class NoteController(...)
```

---

## Файлы для изменения (полный список)

### Новые файлы (4)
| Файл | Назначение |
|------|------------|
| `server/src/main/kotlin/com/notebox/validation/ValidUuid.kt` | Аннотация валидации UUID |
| `server/src/main/kotlin/com/notebox/validation/UuidValidator.kt` | Валидатор UUID |
| `server/src/main/kotlin/com/notebox/validation/ValidThemePreference.kt` | Аннотация валидации темы |
| `server/src/main/kotlin/com/notebox/validation/ThemePreferenceValidator.kt` | Валидатор темы |
| `server/src/main/kotlin/com/notebox/domain/storage/FileValidationService.kt` | Сервис валидации файлов |

### Файлы для изменения (13)
| Файл | Изменения |
|------|-----------|
| `server/src/main/kotlin/com/notebox/dto/UpdateUserDto.kt` | Добавить @Size, @ValidThemePreference |
| `server/src/main/kotlin/com/notebox/dto/NoteDto.kt` | Добавить @ValidUuid в MoveNoteRequest |
| `server/src/main/kotlin/com/notebox/dto/TagDto.kt` | Добавить @NotNull в SetNoteTagsRequest |
| `server/src/main/kotlin/com/notebox/dto/ReminderDto.kt` | Добавить @Pattern для repeatType |
| `server/src/main/kotlin/com/notebox/domain/auth/AuthController.kt` | Добавить @Valid, удалить ручную валидацию |
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | @Validated, @ValidUuid (8 мест) |
| `server/src/main/kotlin/com/notebox/domain/folder/FolderController.kt` | @Validated, @ValidUuid (4 места) |
| `server/src/main/kotlin/com/notebox/domain/database/DatabaseController.kt` | @Validated, @ValidUuid (10 мест) |
| `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt` | @Validated, @ValidUuid (5 мест) |
| `server/src/main/kotlin/com/notebox/domain/reminder/ReminderController.kt` | @Validated, @ValidUuid (4 места) |
| `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt` | Внедрить FileValidationService, исправить ответы |
| `server/src/main/kotlin/com/notebox/domain/notification/NotificationController.kt` | Исправить getVapidPublicKey() |
| `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt` | Добавить ConstraintViolationException |

### Файлы для удаления/deprecation (1)
| Файл | Действие |
|------|----------|
| `server/src/main/kotlin/com/notebox/util/ValidationUtils.kt` | Пометить @Deprecated или удалить |

---

## Миграционные шаги

**Данная рефакторинг не требует миграции данных.**

Изменения в API:
1. `GET /api/notifications/vapid-public-key` — изменится структура ответа с `{ publicKey: "..." }` на `{ success: true, data: { publicKey: "..." } }`. Это **breaking change** для фронтенда.

**Действие:** Обновить фронтенд-код, который вызывает этот endpoint.

---

## Стратегия тестирования

### Unit-тесты

1. **UuidValidator**
   - Валидный UUID → true
   - Невалидная строка → false
   - null → true (nullable)
   - Пустая строка → false

2. **ThemePreferenceValidator**
   - "light", "dark", "system" → true
   - "invalid", "" → false
   - null → true

3. **FileValidationService**
   - Валидный файл с корректным content-type → success
   - Файл с неразрешённым расширением → error
   - Файл превышающий MAX_SIZE → error
   - Файл с подменённым content-type (magic bytes) → error

### Integration-тесты

1. **AuthController**
   - PUT /api/auth/me с невалидным themePreference → 400 с VALIDATION_ERROR
   - PUT /api/auth/me с валидными данными → 200

2. **NoteController**
   - GET /api/notes/{invalid-uuid} → 400 с VALIDATION_ERROR
   - GET /api/notes/{valid-uuid} → 200 или 404

3. **NotificationController**
   - GET /api/notifications/vapid-public-key → 200 с ApiResponse структурой

### Manual QA checklist

- [ ] Проверить логин и обновление профиля пользователя
- [ ] Проверить создание/редактирование/удаление заметок
- [ ] Проверить загрузку файлов разных типов
- [ ] Проверить push-уведомления (VAPID key)
- [ ] Проверить создание напоминаний с разными repeat types

---

## Оценка рисков

### Высокий риск
| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Изменение структуры VAPID response сломает фронтенд | Высокая | Среднее | Одновременно обновить фронтенд |

### Средний риск
| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Новая валидация отклонит ранее допустимые запросы | Средняя | Низкое | Добавлять валидацию постепенно, проверять логи |
| Ошибки в FileValidationService | Низкая | Среднее | Покрыть unit-тестами все edge cases |

### Низкий риск
| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Регрессия при переносе бизнес-логики | Низкая | Низкое | Сравнить поведение до/после |

---

## Порядок исполнения (summary)

1. **Шаги 1-4:** Создать инфраструктуру валидации (4 новых файла)
2. **Шаги 5-8:** Обновить DTO с валидационными аннотациями
3. **Шаг 9:** Исправить AuthController
4. **Шаги 10-11:** Создать FileValidationService, упростить FileController
5. **Шаги 12-13:** Исправить формат ответов
6. **Шаги 14-18:** Заменить ValidationUtils на @ValidUuid в 5 контроллерах
7. **Шаг 19:** Deprecated/удалить ValidationUtils
8. **Шаги 20-21:** Обновить GlobalExceptionHandler, добавить @Validated
9. **Тестирование:** Запустить существующие тесты, добавить новые

---

## Метрики успеха

| Метрика | До | После |
|---------|-----|-------|
| Контроллеры с полной @Valid покрытием | 6/8 | 8/8 |
| DTO с валидационными аннотациями | 8/11 | 11/11 |
| Вызовы ValidationUtils.validateUUID | 27 | 0 |
| Строки бизнес-логики в контроллерах | ~120 | ~20 |
| Endpoints с нестандартным форматом ответа | 2 | 0 |
