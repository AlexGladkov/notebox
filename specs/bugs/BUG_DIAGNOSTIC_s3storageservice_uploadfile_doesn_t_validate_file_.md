# Диагностический отчёт: S3StorageService.uploadFile не валидирует размер файла

**Дата:** 2026-05-25  
**Severity:** MEDIUM  
**Статус:** ПОДТВЕРЖДЁН  
**Воспроизведён:** Да

---

## Bug Summary

FileValidationService.validateFile() не проверяет размер загружаемого файла (`file.size`). Файлы любого размера принимаются до момента чтения в память для загрузки в S3, что создаёт уязвимость для DoS-атак через исчерпание памяти.

---

## Root Cause

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileValidationService.kt`  
**Строки:** 22-60  
**Уверенность:** HIGH

### Описание

Метод `validateFile()` проверяет:
- `file.isEmpty` - пустой ли файл
- `file.contentType` - допустимый ли MIME-тип
- Расширение файла против whitelist
- Magic bytes (сигнатура файла)

**Но НЕ проверяет:** `file.size > MAX_FILE_SIZE`

### Код с багом

```kotlin
fun validateFile(file: MultipartFile): FileValidationResult {
    if (file.isEmpty) {
        return FileValidationResult(isValid = false, ...)
    }
    
    val contentType = file.contentType
    if (contentType == null || contentType !in ALLOWED_CONTENT_TYPES) {
        return FileValidationResult(isValid = false, ...)
    }
    
    // ... проверка расширения и magic bytes ...
    
    // ЗДЕСЬ ДОЛЖНА БЫТЬ ПРОВЕРКА РАЗМЕРА
    
    return FileValidationResult(isValid = true)  // Строка 60
}
```

### Вторичная проблема

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/S3StorageService.kt`  
**Строка:** 60

```kotlin
s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.inputStream, file.size))
```

Файл загружается в память через `file.inputStream` без предварительной проверки размера.

---

## Consilium Findings

### Architect (Code Tracer)

**Root Cause Agreed:** Да

**Summary:**
- Первичная причина: FileValidationService.kt (строки 22-61) - отсутствует проверка `file.size`
- Баг введён в коммите `9a2cc98` (2026-05-20) при рефакторинге валидации в отдельный сервис
- Архитектурная проблема: разделение ответственности между Spring config (infrastructure) и сервисом (business logic)
- Отсутствует defense-in-depth - только nginx защищает (~1MB лимит по умолчанию)

### Stack Expert (Framework Analysis)

**Root Cause Agreed:** Да

**Summary:**
- Spring Boot настройки корректны: `spring.servlet.multipart.max-file-size: 10MB` (application.yml:38)
- Но это framework-level ограничение, срабатывает после чтения файла
- nginx не имеет явного `client_max_body_size` - использует default ~1MB
- GlobalExceptionHandler обрабатывает MaxUploadSizeExceededException, но это "слишком поздно"
- AWS SDK RequestBody не имеет встроенного ограничения размера

### Консенсус

**Согласие:** Полный консенсус между субагентами

Оба субагента независимо определили:
1. Корневая причина в FileValidationService.validateFile()
2. Отсутствует константа MAX_FILE_SIZE
3. Отсутствует проверка `file.size` перед другими валидациями
4. Текущая защита только через nginx (implicit ~1MB limit)

**Разногласия:** Отсутствуют

---

## Reproduction Results

### Подтверждённые тесты

| Размер файла | HTTP Status | Результат |
|--------------|-------------|-----------|
| 42KB PNG | 201 Created | Успешно загружен |
| 547KB PNG | 201 Created | Успешно загружен |
| 0.98MB PNG | 201 Created | Успешно загружен |
| 1.20MB PNG | 413 | nginx rejected |
| 5MB | 413 | nginx rejected |
| 15MB | 413 | nginx rejected |

**Вывод:** Приложение принимает файлы любого размера до лимита nginx (~1MB). Никакой валидации размера на уровне приложения нет.

---

## Affected Files

### Требуют изменения

1. **`server/src/main/kotlin/com/notebox/domain/storage/FileValidationService.kt`** (PRIMARY)
   - Добавить константу `MAX_FILE_SIZE = 10 * 1024 * 1024L` (10MB)
   - Добавить проверку `file.size > MAX_FILE_SIZE` в начало `validateFile()`

### Связанные файлы (без изменений)

2. `server/src/main/kotlin/com/notebox/domain/storage/FileService.kt` - вызывает validateFile()
3. `server/src/main/kotlin/com/notebox/domain/storage/S3StorageService.kt` - загрузка в S3
4. `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt` - HTTP endpoint
5. `server/src/main/resources/application.yml` - Spring multipart config (10MB)

---

## Fix Plan

### Шаг 1: Добавить константу MAX_FILE_SIZE

**Файл:** `FileValidationService.kt`  
**Действие:** Modify  
**Описание:** Добавить константу в companion object

```kotlin
companion object {
    const val MAX_FILE_SIZE = 10 * 1024 * 1024L // 10MB
    
    val ALLOWED_CONTENT_TYPES = setOf(...)
    val ALLOWED_EXTENSIONS = setOf(...)
}
```

### Шаг 2: Добавить проверку размера в validateFile()

**Файл:** `FileValidationService.kt`  
**Действие:** Modify  
**Описание:** Добавить проверку размера ПЕРЕД другими проверками (до чтения содержимого)

```kotlin
fun validateFile(file: MultipartFile): FileValidationResult {
    // Проверка размера ПЕРВОЙ (до чтения содержимого файла)
    if (file.size > MAX_FILE_SIZE) {
        return FileValidationResult(
            isValid = false,
            errorCode = "FILE_TOO_LARGE",
            errorMessage = "File size ${file.size} bytes exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB"
        )
    }
    
    if (file.isEmpty) {
        // ... existing code ...
    }
    // ... rest of validation ...
}
```

### Шаг 3: Добавить unit-тест

**Файл:** `FileValidationServiceTest.kt` (новый или существующий)  
**Действие:** Add test  
**Описание:** Тест для проверки отклонения больших файлов

```kotlin
@Test
fun `validateFile rejects files exceeding MAX_FILE_SIZE`() {
    val largeFile = MockMultipartFile(
        "file", "large.png", "image/png",
        ByteArray(11 * 1024 * 1024) // 11MB > 10MB limit
    )
    
    val result = fileValidationService.validateFile(largeFile)
    
    assertFalse(result.isValid)
    assertEquals("FILE_TOO_LARGE", result.errorCode)
}
```

---

## Testing Strategy

### Unit Tests

1. **FileValidationServiceTest**
   - `validateFile rejects files exceeding MAX_FILE_SIZE` - файл 11MB должен быть отклонён
   - `validateFile accepts files under MAX_FILE_SIZE` - файл 5MB должен пройти (если валиден)
   - `validateFile returns FILE_TOO_LARGE error code` - проверка errorCode

### Integration Tests

2. **FileControllerIntegrationTest**
   - POST `/api/files/upload` с файлом 11MB → HTTP 400 с errorCode "FILE_TOO_LARGE"
   - POST `/api/files/upload` с файлом 1MB → HTTP 201 (если валидный тип)

### Manual Tests

3. **Browser Test**
   - Загрузить файл 15MB через UI → увидеть понятное сообщение об ошибке
   - Загрузить файл 5MB через UI → успешная загрузка

---

## Risk Assessment

### Что может сломаться

1. **Существующие загрузки больших файлов**
   - Риск: НИЗКИЙ - nginx уже блокирует файлы >1MB
   - Митигация: Лимит 10MB соответствует Spring config

2. **Тесты с mock-файлами**
   - Риск: НИЗКИЙ - добавленная проверка не влияет на маленькие файлы
   - Митигация: Обновить тесты если используют файлы >10MB

### Безопасность

3. **DoS через память**
   - До: Уязвимость если nginx лимит увеличен
   - После: Защита на уровне приложения, независимо от nginx

### Обратная совместимость

- Клиенты, загружающие файлы <10MB: **без изменений**
- Клиенты, загружающие файлы >10MB: получат HTTP 400 вместо 413 от nginx

---

## Appendix: Data Flow

```
HTTP POST /api/files/upload
    ↓
FileController.uploadFile()
    ↓
FileService.uploadFile()
    ↓
FileValidationService.validateFile()  ← FIX HERE: add size check
    ↓ (if valid)
S3StorageService.uploadFile()
    ↓
RequestBody.fromInputStream() ← file loaded into memory
    ↓
MinIO/S3
```

---

**Автор:** Consilium Diagnostic Agent  
**Дата создания:** 2026-05-25
