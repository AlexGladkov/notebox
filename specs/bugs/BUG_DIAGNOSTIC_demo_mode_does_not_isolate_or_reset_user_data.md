# Диагностический отчёт: Demo mode does not isolate or reset user data

**Дата:** 2026-05-23  
**Severity:** MEDIUM  
**Статус воспроизведения:** Частично (демо-вход заблокирован 403, но код проанализирован)

---

## Bug Summary

Демо-режим не сбрасывает данные пользователя при каждом входе, как указано в баннере. Данные (теги, файлы, напоминания) накапливаются между сессиями, так как `DemoDataCleaner` очищает только заметки и базы данных, игнорируя остальные типы данных.

---

## Root Cause

**Основная причина:** Неполная очистка данных в `DemoDataCleaner.clearAllDemoData()`

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoDataCleaner.kt`  
**Строки:** 31-37

```kotlin
fun clearAllDemoData() {
    validateOnlyDemoUserExists()
    databaseRepository.deleteAllDatabases()  // ✅ Очищает
    noteRepository.deleteAll()               // ✅ Очищает
    // ❌ ОТСУТСТВУЕТ: очистка тегов, файлов, напоминаний, push-подписок
}
```

**Дополнительные проблемы:**
1. **Конфигурационный рассинхрон:** `application.yml:58` имеет default `false`, тогда как `docker-compose.yml:57` имеет default `true`
2. **Отсутствие атомарной транзакции:** `DemoAuthProvider.createDemoSession()` не обёрнут в единую транзакцию

---

## Consilium Findings

### Architect (Code Tracer)
- **Root Cause Agreed:** ✅ Да
- **Summary:** DemoDataCleaner очищает только notes и databases. Tags, NoteTags, Files, Reminders, PushSubscriptions НЕ очищаются между демо-сессиями. Это объясняет накопление данных.

### Stack Expert (Spring/Kotlin)
- **Root Cause Agreed:** ✅ Да
- **Summary:** Дополнительно выявлен конфигурационный mismatch между application.yml (default false) и docker-compose.yml (default true). Также отсутствует атомарная транзакция, что создаёт race condition при параллельных демо-входах.

### Consensus
**Согласие:** Оба субагента согласны, что корневая причина - неполная очистка данных.

---

## Reproduction Results

**Статус:** ❌ Не воспроизведён (заблокирован)

**Причина:** API endpoint `/api/auth/demo` возвращает HTTP 403 Forbidden, так как `demoAuthProvider.isDemoModeEnabled()` возвращает `false`.

**Анализ кода подтверждает:** Даже если бы демо-вход работал, данные накапливались бы из-за неполной очистки в DemoDataCleaner.

---

## Affected Files

| Файл | Действие | Описание |
|------|----------|----------|
| `server/src/main/kotlin/com/notebox/domain/demo/DemoDataCleaner.kt` | Modify | Добавить очистку тегов, файлов, напоминаний, push-подписок |
| `server/src/main/kotlin/com/notebox/domain/tag/TagRepository.kt` | Modify | Добавить метод `deleteAllByUserId(userId: String)` |
| `server/src/main/kotlin/com/notebox/domain/storage/FileRepository.kt` | Modify | Добавить метод `deleteAllByUserId(userId: String)` |
| `server/src/main/kotlin/com/notebox/domain/reminder/ReminderRepository.kt` | Modify | Добавить метод `deleteAllByUserId(userId: String)` |
| `server/src/main/kotlin/com/notebox/domain/notification/PushSubscriptionRepository.kt` | Modify | Добавить метод `deleteAllByUserId(userId: String)` |
| `server/src/main/resources/application.yml` | Modify | Изменить default `demo.mode.enabled` с `false` на `true` |

---

## Fix Plan

### Шаг 1: Добавить методы очистки в репозитории

**TagRepository.kt:**
```kotlin
fun deleteAllByUserId(userId: String): Int = transaction {
    NoteTagsTable.deleteWhere { 
        NoteTagsTable.noteId inSubQuery NotesTable.slice(NotesTable.id)
            .select { NotesTable.userId eq userId }
    }
    TagsTable.deleteWhere { TagsTable.userId eq userId }
}
```

**FileRepository.kt:**
```kotlin
fun deleteAllByUserId(userId: String): Int = transaction {
    UploadedFilesTable.deleteWhere { UploadedFilesTable.userId eq userId }
}
```

**ReminderRepository.kt:**
```kotlin
fun deleteAllByUserId(userId: String): Int = transaction {
    RemindersTable.deleteWhere { RemindersTable.userId eq userId }
}
```

**PushSubscriptionRepository.kt:**
```kotlin
fun deleteAllByUserId(userId: String): Int = transaction {
    PushSubscriptionsTable.deleteWhere { PushSubscriptionsTable.userId eq userId }
}
```

### Шаг 2: Обновить DemoDataCleaner

```kotlin
@Component
class DemoDataCleaner(
    private val userRepository: UserRepository,
    private val databaseRepository: DatabaseRepository,
    private val noteRepository: NoteRepository,
    private val tagRepository: TagRepository,
    private val fileRepository: FileRepository,
    private val reminderRepository: ReminderRepository,
    private val pushSubscriptionRepository: PushSubscriptionRepository
) {
    fun clearAllDemoData() {
        logger.info("Clearing demo data...")
        val demoUser = validateOnlyDemoUserExists()

        // Очистка в правильном порядке (зависимости сначала)
        pushSubscriptionRepository.deleteAllByUserId(demoUser.id)
        reminderRepository.deleteAllByUserId(demoUser.id)
        fileRepository.deleteAllByUserId(demoUser.id)
        tagRepository.deleteAllByUserId(demoUser.id)  // Удаляет NoteTags и Tags
        databaseRepository.deleteAllDatabases()
        noteRepository.deleteAll()

        logger.info("Demo data cleared successfully")
    }
}
```

### Шаг 3: Исправить конфигурацию (опционально, но рекомендуется)

**application.yml:58:**
```yaml
demo:
  mode:
    enabled: ${DEMO_MODE_ENABLED:true}  # Было: false
```

---

## Testing Strategy

### Unit Tests
1. Создать тест `DemoDataCleanerTest`:
   - Проверить, что `clearAllDemoData()` удаляет все типы данных
   - Проверить порядок удаления (зависимости сначала)

### Integration Tests
1. Создать демо-сессию → создать данные (notes, tags, files) → создать вторую сессию → проверить, что все данные очищены

### Manual Testing
1. Войти в демо → создать заметку с тегом → выйти
2. Войти в демо снова → проверить, что теги и заметки удалены
3. Проверить граф: должен показывать только свежесозданный контент

---

## Risk Assessment

### Риски

1. **Потеря данных реальных пользователей:** НИЗКИЙ
   - Защита: `validateOnlyDemoUserExists()` предотвращает очистку, если есть не-демо пользователи

2. **Порядок удаления (foreign key constraints):** СРЕДНИЙ
   - Защита: Удалять в правильном порядке (зависимые данные сначала)
   - Миттигация: NoteTags должны удаляться перед Notes

3. **Performance при большом объёме демо-данных:** НИЗКИЙ
   - Демо-данные ограничены (5 заметок, 1 база)

### Митигация

- Покрыть изменения тестами перед деплоем
- Проверить foreign key constraints между таблицами
- Тестировать на staging перед production

---

## Appendix: Data Tables Analysis

| Таблица | Foreign Keys | Очищается сейчас | Нужно очистить |
|---------|--------------|------------------|----------------|
| NotesTable | userId | ✅ | - |
| CustomDatabasesTable | userId | ✅ | - |
| ColumnsTable | databaseId | ✅ (cascade) | - |
| RecordsTable | databaseId | ✅ (cascade) | - |
| **TagsTable** | userId | ❌ | ✅ |
| **NoteTagsTable** | noteId, tagId | ❌ | ✅ |
| **UploadedFilesTable** | userId | ❌ | ✅ |
| **RemindersTable** | userId, noteId | ❌ | ✅ |
| **PushSubscriptionsTable** | userId | ❌ | ✅ |
