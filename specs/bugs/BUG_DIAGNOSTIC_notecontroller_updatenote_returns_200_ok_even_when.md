# Диагностический отчёт: NoteController.updateNote возвращает 200 OK для несуществующих заметок

**Дата диагностики:** 24 мая 2026 г.  
**Severity:** MEDIUM  
**Статус:** БАГ НЕ ВОСПРОИЗВОДИТСЯ — УЖЕ ИСПРАВЛЕН

---

## Bug Summary

PUT /api/notes/{id} с несуществующим UUID заметки должен был возвращать 200 OK с пустым телом вместо 404 Not Found. **Баг уже исправлен** — API корректно возвращает HTTP 404 Not Found с правильной JSON структурой ошибки.

---

## Root Cause

### Изначальная проблема (commit 1ed0631, 11 февраля 2026)

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt`  
**Строки:** 71-114

В первоначальной реализации метод `updateNote` в NoteService не проверял существование заметки перед обновлением. Метод `noteRepository.update()` молча возвращал `null`, если заметка не найдена, без выброса исключения.

```kotlin
// СТАРЫЙ КОД (проблемный)
fun updateNote(id: String, ...): Note? {
    return noteRepository.update(id, ...)  // Возвращал null без исключения
}
```

### Исправление (commit 984df85, 20 мая 2026)

Добавлена проактивная проверка существования заметки с выбросом `NotFoundException`:

```kotlin
// ИСПРАВЛЕННЫЙ КОД
fun updateNote(id: String, userId: String, ...): Note? {
    val existingNote = noteRepository.findByIdAndUserId(id, userId)
        ?: throw NotFoundException("Note with id '$id' not found")  // ← КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ
    
    // ... валидация и обновление ...
    return noteRepository.update(...)
}
```

**Confidence:** HIGH — исправление подтверждено тестированием и анализом git истории.

---

## Consilium Findings

### Архитектор (Code Tracer)

| Аспект | Результат |
|--------|-----------|
| **Root Cause Agreed** | ✅ Да |
| **Ключевой коммит исправления** | 984df85 (20 мая 2026) |
| **Механизм исправления** | Перенос выброса `NotFoundException` с уровня Controller на уровень Service |
| **Архитектурный паттерн** | Fail-Fast Principle, Exception Translation |

**Ключевые находки:**
- Исходная проблема: Repository возвращал `null`, Service пробрасывал его, Controller не всегда проверял
- Двойная защита добавлена: проверка в Service (строка 84-85) + резервная в Controller (строка 80)
- Использование `findByIdAndUserId()` также предотвращает IDOR уязвимости

### Stack Expert (Framework Analysis)

| Аспект | Результат |
|--------|-----------|
| **Root Cause Agreed** | ✅ Да |
| **Framework Version** | Spring Boot 3.2.2 + Kotlin 1.9.22 |
| **Exception Handling** | GlobalExceptionHandler правильно настроен |
| **Configuration** | `throw-exception-if-no-handler-found: true` включено |

**Ключевые находки:**
- GlobalExceptionHandler с `@RestControllerAdvice` правильно перехватывает `NotFoundException`
- Иерархия исключений корректна: `NotFoundException → DomainException → RuntimeException`
- Jackson и Exposed ORM правильно интегрированы с Spring Boot 3.2.2

### Консенсус

| Вопрос | Результат |
|--------|-----------|
| **Согласие по root cause** | ✅ Полный консенсус |
| **Согласие по статусу бага** | ✅ Полный консенсус |
| **Разногласия** | Нет |

Оба субагента согласны: баг был исправлен в коммите 984df85 от 20 мая 2026 года путём добавления проактивной проверки существования заметки в NoteService.

---

## Reproduction Results

**Воспроизведён:** НЕТ ❌

### Тестовые запросы

| UUID | HTTP Status | Результат |
|------|-------------|-----------|
| `00000000-0000-0000-0000-000000000000` | 404 | ✅ Корректно |
| `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` | 404 | ✅ Корректно |
| `12345678-1234-1234-1234-123456789012` | 404 | ✅ Корректно |
| `ffffffff-ffff-ffff-ffff-ffffffffffff` | 404 | ✅ Корректно |
| `99999999-9999-9999-9999-999999999999` | 404 | ✅ Корректно |

### Пример ответа API

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "NOT_FOUND",
    "message": "Note with id '00000000-0000-0000-0000-000000000000' not found"
  }
}
```

---

## Affected Files

Так как баг уже исправлен, изменений не требуется. Для справки, вот затронутые файлы:

| Файл | Строки | Роль | Статус |
|------|--------|------|--------|
| `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` | 84-85 | Основная проверка существования | ✅ Исправлено |
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | 80 | Резервная проверка | ✅ Исправлено |
| `server/src/main/kotlin/com/notebox/config/GlobalExceptionHandler.kt` | 20-26 | Обработка NotFoundException | ✅ Работает |

---

## Fix Plan

### Рекомендация: Закрыть баг как "Already Fixed"

Баг был исправлен в рамках commit 984df85 от 20 мая 2026 года. Никаких дополнительных изменений кода не требуется.

### Рекомендуемые действия

| # | Действие | Описание |
|---|----------|----------|
| 1 | Добавить интеграционные тесты | Создать тесты для валидации 404 ответов на PUT /api/notes/{id} |
| 2 | Обновить документацию API | Документировать все возможные коды ошибок в OpenAPI спецификации |
| 3 | Закрыть баг-репорт | Пометить как "Won't Fix" или "Already Fixed" |

---

## Testing Strategy

### Существующее покрытие

API корректно обрабатывает:
- ✅ Валидный UUID формат через `@ValidUuid` аннотацию
- ✅ Несуществующие заметки через `NotFoundException`
- ✅ Чужие заметки через `findByIdAndUserId()` (IDOR protection)

### Рекомендуемые тесты (для предотвращения регрессии)

```kotlin
@Test
fun `updateNote with non-existent ID returns 404`() {
    val nonExistentId = UUID.randomUUID().toString()
    
    mockMvc.perform(
        put("/api/notes/$nonExistentId")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""{"title": "Test", "content": "Test"}""")
    )
    .andExpect(status().isNotFound)
    .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
    .andExpect(jsonPath("$.error.message").value(containsString(nonExistentId)))
}
```

---

## Risk Assessment

### Текущие риски: МИНИМАЛЬНЫЕ

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Race condition (заметка удалена между проверкой и обновлением) | Низкая | Двойная проверка в Controller (строка 80) |
| Регрессия при рефакторинге | Средняя | Добавить интеграционные тесты |

### Что могло бы сломаться

1. **Удаление проверки в NoteService** — вернёт баг
2. **Изменение иерархии исключений** — GlobalExceptionHandler не перехватит
3. **Отключение GlobalExceptionHandler** — 500 Internal Server Error вместо 404

---

## Заключение

**Баг НЕ требует исправления** — он был устранён в рамках рефакторинга обработки исключений (commit 984df85, 20 мая 2026).

API endpoint `PUT /api/notes/{id}` работает корректно:
- ✅ Возвращает HTTP 404 Not Found для несуществующих заметок
- ✅ Возвращает корректную JSON структуру с кодом ошибки
- ✅ Имеет двойную защиту на уровне Service и Controller

**Рекомендация:** Закрыть баг как "Already Fixed" и добавить интеграционные тесты для предотвращения регрессии.

---

**Подготовлено:** Consilium Bug Analysis  
**Версия:** 1.0  
**Дата:** 24 мая 2026 г.
