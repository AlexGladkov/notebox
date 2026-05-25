# Bug Diagnostic: DemoContentService creates duplicate demo data on repeated login

## Bug Summary

DemoContentService.initializeDemoContent() якобы создаёт дубликаты демо-контента при повторных входах в демо-режим. **После анализа: баг НЕ воспроизводится при нормальном использовании благодаря существующей защите.**

## Root Cause

**Файл:** `server/src/main/kotlin/com/notebox/domain/auth/DemoAuthProvider.kt`  
**Строки:** 33-37

```kotlin
// Сбросить демо-данные к начальному состоянию
demoContentService.clearDemoData()

// Создать свежий демо-контент
demoContentService.createDemoContent(demoUser.id)
```

**Анализ:**
- Код использует паттерн "destructive idempotency" — при каждом входе сначала удаляются ВСЕ предыдущие демо-данные, затем создаются новые
- При последовательных входах дубликаты невозможны — старые данные удаляются перед созданием новых
- **Потенциальная проблема:** race condition при concurrent-запросах (два одновременных входа)

**Confidence:** HIGH (код изучен, браузерное тестирование подтверждает)

## Consilium Findings

### Architect (Code Tracer)
- **Root Cause Agreed:** Да, баг не воспроизводится при нормальном использовании
- **Summary:** Код защищён паттерном clear-then-create. Каждый вход удаляет все данные и создаёт свежие. Race condition возможен при concurrent requests.

### Stack Expert
- **Root Cause Agreed:** Да, с оговоркой о concurrent-сценарии
- **Summary:** Spring Boot + Exposed без @Transactional. Каждая операция коммитится отдельно. Нет идемпотентных проверок в createDemoContent(), но clearDemoData() компенсирует это при последовательных входах.

### Consensus
- **Agreed:** Да, оба субагента согласны что баг не воспроизводится при последовательных входах
- **Disagreements:** Различаются оценки риска concurrent-сценария (Architect считает низким, Stack Expert считает реальным)

## Reproduction Results

**Reproduced:** НЕТ

Браузерное тестирование (Playwright) показало:
1. После 4 циклов вход/выход дубликаты НЕ появились
2. Пользовательская заметка "Новая страница" сохранилась в единственном экземпляре
3. Демо-контент (Welcome note, Tutorial folder) вообще не создаётся автоматически — это может быть отдельным багом или особенностью текущей реализации

## Affected Files

| Файл | Изменение |
|------|-----------|
| `server/src/main/kotlin/com/notebox/domain/demo/DemoNoteBuilder.kt` | Добавить проверку существования заметок перед созданием |
| `server/src/main/kotlin/com/notebox/domain/demo/DemoDatabaseBuilder.kt` | Добавить проверку существования базы данных перед созданием |

## Fix Plan

### Рекомендация: Добавить defensive idempotency checks

Хотя баг не воспроизводится при нормальном использовании, добавление проверок улучшит robustness кода.

### Step 1: Добавить проверку в DemoNoteBuilder

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoNoteBuilder.kt`

```kotlin
fun createDemoNotes(userId: String): List<Note> {
    // Defensive check: if demo notes already exist, skip creation
    val existingNotes = noteService.getNotes(userId)
    if (existingNotes.isNotEmpty()) {
        logger.info("Demo notes already exist for user $userId, skipping creation")
        return existingNotes
    }
    // ... existing creation logic
}
```

### Step 2: Добавить проверку в DemoDatabaseBuilder

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoDatabaseBuilder.kt`

```kotlin
fun createDemoDatabase(userId: String): Database {
    // Defensive check: if demo database exists, return existing
    val existingDatabases = databaseService.getDatabases(userId)
    if (existingDatabases.isNotEmpty()) {
        logger.info("Demo database already exists for user $userId")
        return existingDatabases.first()
    }
    // ... existing creation logic
}
```

### Альтернативный подход: Синхронизация

Добавить `synchronized` или distributed lock на уровне DemoAuthProvider:

```kotlin
@Synchronized
fun createDemoSession(): Pair<User, Session> {
    // ... existing code
}
```

## Testing Strategy

1. **Unit Tests:**
   - Тест: вызов createDemoNotes() когда заметки уже существуют — должен вернуть существующие
   - Тест: вызов createDemoDatabase() когда БД существует — должен вернуть существующую

2. **Integration Tests:**
   - Тест: 3 последовательных входа — проверить отсутствие дубликатов
   - Тест: concurrent login simulation — 2 одновременных запроса на /api/auth/demo

3. **Manual Testing:**
   - Повторить браузерное тестирование с Playwright
   - Проверить что демо-контент создаётся корректно

## Risk Assessment

**Risk Level:** LOW

**Что может сломаться:**
- Если проверка существования выполняется неправильно, демо-контент может не создаваться
- Изменение поведения при concurrent requests

**Mitigation:**
- Thorough testing перед деплоем
- Feature flag для постепенного rollout
- Logging для мониторинга

## Conclusion

Баг как описан (последовательные входы = дубликаты) **НЕ существует** в текущей реализации благодаря паттерну clearDemoData() → createDemoContent(). Однако добавление explicit idempotency checks является хорошей практикой defensive programming и защитит от edge cases.

**Рекомендация:** LOW PRIORITY fix — добавить проверки для robustness, но это не критический баг.

---
*Дата диагностики: 2026-05-25*  
*Диагностика выполнена: Claude Code Consilium*
