# Диагностический отчёт: NoteRepository.findByFolder возвращает все заметки без учёта владельца

**ID бага:** noterepository-findbyfolder-returns-all-notes-igno  
**Серьёзность:** MEDIUM  
**Статус:** ВОСПРОИЗВЕДЁН И ДИАГНОСТИРОВАН  
**Дата диагностики:** 2026-05-25

---

## Bug Summary

Endpoint `GET /api/notes?folderId=X` полностью игнорирует query параметр `folderId` и возвращает все заметки пользователя вместо фильтрации по указанной папке (parentId).

---

## Root Cause

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt`  
**Строки:** 20-25  
**Уверенность:** HIGH

### Проблемный код

```kotlin
@GetMapping
fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
    val userId = getCurrentUserId()
    val notes = noteService.getAllNotesWithTags(userId)
    return ResponseEntity.ok(successResponse(notes))
}
```

### Суть проблемы

1. **Отсутствует параметр `@RequestParam`:** Метод не принимает `folderId` как query параметр
2. **Нет условной логики:** Невозможно отфильтровать по папке даже при наличии параметра
3. **Регрессия рефакторинга:** Функциональность была удалена в коммите `578410e` (2026-02-17) при миграции с folder-based на parent-based иерархию

### Историческая справка

Коммит `578410e` (2026-02-17) провёл архитектурную миграцию:
- ✓ Обновлены Repository и Service слои (работают корректно)
- ✗ Controller слой НЕ был обновлён для приёма `folderId` как query параметра

---

## Consilium Findings

### Architect (Code Tracer)

| Аспект | Находка |
|--------|---------|
| Root Cause Agreed | ✓ Да |
| Локация | `NoteController.kt:20-25` |
| Тип проблемы | Архитектурная регрессия после рефакторинга |
| Data Flow | `GET /api/notes?folderId=X` → Controller (игнорирует параметр) → Service (не получает folderId) → Repository (возвращает всё) |
| Безопасность | Фильтрация по userId работает - нет cross-user утечки |

**Ключевые выводы Architect:**
- Repository слой ПРАВИЛЬНО реализует фильтрацию: `findByParentId(parentId, userId)` фильтрует по обоим параметрам
- Service слой ПРАВИЛЬНО поддерживает: метод `getChildrenWithTags(parentId, userId)` уже существует
- Только Controller слой требует исправления

### Stack Expert (Framework Analysis)

| Аспект | Находка |
|--------|---------|
| Root Cause Agreed | ✓ Да |
| Framework Issue | Нет - это ошибка разработчика |
| Spring Behavior | Query параметры без соответствующего `@RequestParam` молча игнорируются |
| Exposed ORM | Корректно использует DSL с параметризованными запросами |

**Дополнительные находки Stack Expert:**
- Raw SQL в `findAllDescendants()` использует строковую интерполяцию (потенциальный риск)
- CORS wildcard в dev окружении: `host.docker.internal:*`
- Отсутствует RBAC - только userId фильтрация

### Консенсус субагентов

| Вопрос | Architect | Stack Expert | Консенсус |
|--------|-----------|--------------|-----------|
| Корневая причина в Controller | ✓ | ✓ | **СОГЛАСИЕ** |
| Repository работает правильно | ✓ | ✓ | **СОГЛАСИЕ** |
| Это регрессия рефакторинга | ✓ | ✓ | **СОГЛАСИЕ** |
| Нет cross-user утечки | ✓ | ✓ | **СОГЛАСИЕ** |
| Требуется 1 файл для fix | ✓ | ✓ | **СОГЛАСИЕ** |

**Разногласия:** Отсутствуют

---

## Reproduction Results

**Статус:** ✅ БАГ ВОСПРОИЗВЕДЁН

### Тестовый сценарий

| Шаг | Действие | Результат |
|-----|----------|-----------|
| 1 | `GET /api/notes` | Возвращает 5 заметок ✓ |
| 2 | `GET /api/notes?folderId={uuid}` | Ожидание: 1 заметка |
| 3 | Фактический результат | 5 заметок (все) ✗ |

### Доказательства

```json
{
  "folderId": "0a8ed0cd-3691-4770-971a-af260bc411f6",
  "expectedCount": 1,
  "actualCount": 5,
  "bugConfirmed": true
}
```

**Скриншоты:**
- `.reproduction-evidence/04-api-test-with-folder-filter.png`
- `.reproduction-evidence/05-bug-confirmed.png`

---

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/domain/note/NoteController.kt` | MODIFY | Добавить `@RequestParam folderId` и условную логику |
| (опционально) Tests | ADD | Добавить интеграционные тесты для folder filtering |

---

## Fix Plan

### Шаг 1: Модификация NoteController.kt (строки 20-25)

**Текущий код:**
```kotlin
@GetMapping
fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
    val userId = getCurrentUserId()
    val notes = noteService.getAllNotesWithTags(userId)
    return ResponseEntity.ok(successResponse(notes))
}
```

**Исправленный код:**
```kotlin
@GetMapping
fun getAllNotes(
    @RequestParam(required = false) folderId: String?
): ResponseEntity<ApiResponse<List<NoteDto>>> {
    val userId = getCurrentUserId()
    val notes = if (folderId != null) {
        noteService.getChildrenWithTags(folderId, userId)
    } else {
        noteService.getAllNotesWithTags(userId)
    }
    return ResponseEntity.ok(successResponse(notes))
}
```

### Шаг 2 (опционально): Добавить валидацию UUID

```kotlin
if (folderId != null) {
    ValidationUtils.validateUUID(folderId, "folderId")
}
```

### Шаг 3: Добавить интеграционные тесты

Файл: `server/src/test/kotlin/com/notebox/domain/note/NoteControllerIntegrationTest.kt`

```kotlin
@Test
fun `getAllNotes with folderId should return only children of that folder`() {
    // Setup: создать папку и дочернюю заметку
    // Action: GET /api/notes?folderId={parentId}
    // Assert: только дочерние заметки возвращены
}

@Test
fun `getAllNotes without folderId should return all user notes`() {
    // Setup: создать несколько заметок в разных папках
    // Action: GET /api/notes
    // Assert: все заметки пользователя возвращены
}
```

---

## Testing Strategy

### Функциональное тестирование

1. **Happy Path:**
   - `GET /api/notes` → возвращает все заметки пользователя
   - `GET /api/notes?folderId={valid_uuid}` → возвращает только дочерние заметки

2. **Edge Cases:**
   - `GET /api/notes?folderId={non_existent_uuid}` → пустой список
   - `GET /api/notes?folderId=invalid` → ошибка валидации (400)
   - `GET /api/notes?folderId={other_user_folder}` → пустой список (userId фильтр)

3. **Security Testing:**
   - Запрос без токена → 401 Unauthorized
   - Запрос с folderId другого пользователя → не возвращает чужие заметки

### Регрессионное тестирование

- Существующие тесты `NoteControllerIntegrationTest` должны проходить
- Проверить работу создания/удаления/обновления заметок

---

## Risk Assessment

### Низкий риск

| Риск | Митигация |
|------|-----------|
| Изменение API контракта | Query параметр опциональный - обратная совместимость сохранена |
| Поломка существующего UI | Frontend уже отправляет `folderId` - изменение улучшит UX |
| Регрессия других endpoints | Изменение касается только `getAllNotes()` |

### Дополнительные улучшения (не в рамках fix)

- Добавить OpenAPI документацию для параметра `folderId`
- Рассмотреть метод-level security с `@PreAuthorize`
- Унифицировать именование: `folderId` vs `parentId`

---

## Приложения

### Файлы диагностики

- `.diagnostic-results/architect.md` - Полный анализ архитектуры
- `.diagnostic-results/stack-expert.md` - Анализ технологического стека
- `.reproduction-evidence/reproduction-report.md` - Отчёт о воспроизведении
- `.reproduction-results.json` - Структурированные данные воспроизведения

### Git история

| Коммит | Дата | Описание |
|--------|------|----------|
| `578410e` | 2026-02-17 | **РЕГРЕССИЯ** - Миграция на parentId иерархию |
| `c581b60` | 2026-02-17 | Последняя работающая версия с folder filter |
| `c1e98d5` | 2026-05-20 | Унификация userId extraction в контроллерах |

---

**Подготовлено:** Consilium Diagnostic System  
**Дата:** 2026-05-25  
**Статус:** Готов к имплементации
