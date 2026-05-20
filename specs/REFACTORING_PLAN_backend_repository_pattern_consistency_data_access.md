# План рефакторинга: Backend Repository Pattern Consistency и Data Access Layer

**Дата создания:** 2026-05-20  
**Статус:** Готов к выполнению  
**Приоритет:** Высокий  
**Оценка времени:** 4-6 часов

---

## Резюме

Данный план направлен на унификацию паттерна репозиториев в backend-части приложения Notebox. Основные цели:

1. **Исправление N+1 Query Problems** — критические проблемы производительности в методах `findAllDescendants()`, `getDepth()`, `getAncestorPath()`
2. **Устранение дублирования кода** — удаление дублированного метода `findTagsByNoteId` из NoteRepository
3. **Добавление batch-методов** — `findByIds()`, `deleteByIds()` для оптимизации массовых операций
4. **Оптимизация существующих методов** — batch UPDATE/DELETE в `orphanChildren()` и `deleteWithDescendants()`
5. **Унификация паттернов проверки существования** — стандартизация через `.any()` вместо `.count() > 0`

---

## Шаги рефакторинга

### Группа A: Критические N+1 оптимизации (Приоритет: Critical)

#### Шаг 1: Оптимизация `findAllDescendants()` в NoteRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 105-117

**Текущий код (N запросов по глубине дерева):**
```kotlin
fun findAllDescendants(noteId: String): List<Note> = transaction {
    val descendants = mutableListOf<Note>()
    val queue = mutableListOf(noteId)

    while (queue.isNotEmpty()) {
        val currentId = queue.removeAt(0)
        val children = findByParentId(currentId)  // N запросов!
        descendants.addAll(children)
        queue.addAll(children.map { it.id })
    }
    descendants
}
```

**Новый код (1 запрос с рекурсивным CTE):**
```kotlin
fun findAllDescendants(noteId: String): List<Note> = transaction {
    val sql = """
        WITH RECURSIVE descendants AS (
            SELECT id, title, content, parent_id, icon, backdrop_type, backdrop_value, 
                   backdrop_position_y, color, created_at, updated_at
            FROM notes
            WHERE parent_id = ?
            
            UNION ALL
            
            SELECT n.id, n.title, n.content, n.parent_id, n.icon, n.backdrop_type, 
                   n.backdrop_value, n.backdrop_position_y, n.color, n.created_at, n.updated_at
            FROM notes n
            INNER JOIN descendants d ON n.parent_id = d.id
        )
        SELECT * FROM descendants
    """.trimIndent()
    
    TransactionManager.current().exec(sql, listOf(StringColumnType() to noteId)) { rs ->
        generateSequence {
            if (rs.next()) toNoteFromResultSet(rs) else null
        }.toList()
    } ?: emptyList()
}

private fun toNoteFromResultSet(rs: java.sql.ResultSet) = Note(
    id = rs.getString("id"),
    title = rs.getString("title"),
    content = rs.getString("content"),
    parentId = rs.getString("parent_id"),
    icon = rs.getString("icon"),
    backdropType = rs.getString("backdrop_type"),
    backdropValue = rs.getString("backdrop_value"),
    backdropPositionY = rs.getInt("backdrop_position_y"),
    color = rs.getString("color"),
    createdAt = rs.getTimestamp("created_at").toInstant(),
    updatedAt = rs.getTimestamp("updated_at").toInstant()
)
```

**Зависимости:** NoteService.kt (строки 88, 121)

---

#### Шаг 2: Оптимизация `getDepth()` в NoteRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 119-130

**Текущий код (N запросов по глубине):**
```kotlin
fun getDepth(noteId: String): Int = transaction {
    var depth = 0
    var currentId: String? = noteId
    while (currentId != null) {
        val note = findById(currentId) ?: break  // N запросов!
        currentId = note.parentId
        if (currentId != null) depth++
    }
    depth
}
```

**Новый код (1 запрос с рекурсивным CTE):**
```kotlin
fun getDepth(noteId: String): Int = transaction {
    val sql = """
        WITH RECURSIVE ancestors AS (
            SELECT id, parent_id, 0 as depth
            FROM notes
            WHERE id = ?
            
            UNION ALL
            
            SELECT n.id, n.parent_id, a.depth + 1
            FROM notes n
            INNER JOIN ancestors a ON n.id = a.parent_id
        )
        SELECT MAX(depth) as max_depth FROM ancestors
    """.trimIndent()
    
    TransactionManager.current().exec(sql, listOf(StringColumnType() to noteId)) { rs ->
        if (rs.next()) rs.getInt("max_depth") else 0
    } ?: 0
}
```

**Зависимости:** NoteService.kt (строки 52, 94, 127)

---

#### Шаг 3: Оптимизация `getAncestorPath()` в NoteRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 132-143

**Текущий код (N запросов):**
```kotlin
fun getAncestorPath(noteId: String): List<Note> = transaction {
    val path = mutableListOf<Note>()
    var currentId: String? = noteId
    while (currentId != null) {
        val note = findById(currentId) ?: break  // N запросов!
        path.add(0, note)
        currentId = note.parentId
    }
    path
}
```

**Новый код (1 запрос с рекурсивным CTE):**
```kotlin
fun getAncestorPath(noteId: String): List<Note> = transaction {
    val sql = """
        WITH RECURSIVE ancestors AS (
            SELECT id, title, content, parent_id, icon, backdrop_type, backdrop_value,
                   backdrop_position_y, color, created_at, updated_at, 0 as depth
            FROM notes
            WHERE id = ?
            
            UNION ALL
            
            SELECT n.id, n.title, n.content, n.parent_id, n.icon, n.backdrop_type,
                   n.backdrop_value, n.backdrop_position_y, n.color, n.created_at, n.updated_at, 
                   a.depth + 1
            FROM notes n
            INNER JOIN ancestors a ON n.id = a.parent_id
        )
        SELECT id, title, content, parent_id, icon, backdrop_type, backdrop_value,
               backdrop_position_y, color, created_at, updated_at
        FROM ancestors ORDER BY depth DESC
    """.trimIndent()
    
    TransactionManager.current().exec(sql, listOf(StringColumnType() to noteId)) { rs ->
        generateSequence {
            if (rs.next()) toNoteFromResultSet(rs) else null
        }.toList()
    } ?: emptyList()
}
```

**Зависимости:** NoteService.kt (строки 33, 171), NoteController.kt (строка 106)

---

### Группа B: Batch-оптимизации (Приоритет: High)

#### Шаг 4: Оптимизация `orphanChildren()` — batch UPDATE

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 172-185

**Текущий код (N обновлений):**
```kotlin
fun orphanChildren(noteId: String): Int = transaction {
    val note = findById(noteId) ?: return@transaction 0
    val children = findByParentId(noteId)
    val now = Instant.now()
    children.forEach { child ->
        NotesTable.update({ NotesTable.id eq child.id }) {  // N обновлений!
            it[parentId] = note.parentId
            it[updatedAt] = now
        }
    }
    children.size
}
```

**Новый код (1 UPDATE):**
```kotlin
fun orphanChildren(noteId: String): Int = transaction {
    val note = findById(noteId) ?: return@transaction 0
    val now = Instant.now()
    
    NotesTable.update({ NotesTable.parentId eq noteId }) {
        it[parentId] = note.parentId
        it[updatedAt] = now
    }
}
```

---

#### Шаг 5: Оптимизация `deleteWithDescendants()` — batch DELETE

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 162-170

**Текущий код (N удалений):**
```kotlin
fun deleteWithDescendants(noteId: String): Int = transaction {
    val descendants = findAllDescendants(noteId)
    val allIds = listOf(noteId) + descendants.map { it.id }
    var deletedCount = 0
    allIds.forEach { id ->
        deletedCount += NotesTable.deleteWhere { NotesTable.id eq id }  // N удалений!
    }
    deletedCount
}
```

**Новый код (1 DELETE):**
```kotlin
fun deleteWithDescendants(noteId: String): Int = transaction {
    val descendants = findAllDescendants(noteId)
    val allIds = listOf(noteId) + descendants.map { it.id }
    
    if (allIds.isEmpty()) return@transaction 0
    
    NotesTable.deleteWhere { NotesTable.id inList allIds }
}
```

---

### Группа C: Добавление batch-методов (Приоритет: High)

#### Шаг 6: Добавить `findByIds()` в NoteRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`

**Добавить метод:**
```kotlin
fun findByIds(ids: List<String>): List<Note> = transaction {
    if (ids.isEmpty()) return@transaction emptyList()
    
    NotesTable.select { NotesTable.id inList ids }
        .map { toNote(it) }
}
```

---

#### Шаг 7: Добавить `deleteByIds()` в NoteRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`

**Добавить метод:**
```kotlin
fun deleteByIds(ids: List<String>): Int = transaction {
    if (ids.isEmpty()) return@transaction 0
    
    NotesTable.deleteWhere { NotesTable.id inList ids }
}
```

---

#### Шаг 8: Добавить `findByIds()` в TagRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagRepository.kt`

**Добавить метод:**
```kotlin
fun findByIds(ids: List<String>): List<Tag> = transaction {
    if (ids.isEmpty()) return@transaction emptyList()
    
    TagsTable.select { TagsTable.id inList ids }
        .map { toTag(it) }
}
```

**Использование:** Для оптимизации `verifyTagsOwnership()` в TagService

---

### Группа D: Устранение дублирования (Приоритет: Medium)

#### Шаг 9: Удалить дублированный `findTagsByNoteId()` из NoteRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 199-211

**Действие:** Удалить метод `findTagsByNoteId()`, оставить только в TagRepository

**Зависимости для обновления:**
- `server/src/main/kotlin/com/notebox/domain/note/NoteDtoMapper.kt` (строка 15)

---

#### Шаг 10: Обновить NoteDtoMapper для использования TagRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteDtoMapper.kt`  
**Строка:** 15

**Текущий код:**
```kotlin
val tags = noteRepository.findTagsByNoteId(note.id).map { it.toDto() }
```

**Изменения:**
1. Добавить зависимость `TagRepository` в конструктор NoteDtoMapper
2. Изменить вызов на `tagRepository.findTagsByNoteId(note.id)`

---

#### Шаг 11: Удалить дублированный маппинг Tag в `findTagsForNotes()`

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`  
**Строки:** 213-232

Метод `findTagsForNotes()` создаёт Tag вручную вместо использования `toTag()`.

**Опция A:** Переместить метод в TagRepository как `findTagsForNoteIds()`  
**Опция B:** Оставить в NoteRepository, но вынести маппинг Tag в отдельную функцию

**Рекомендация:** Опция A — перенести в TagRepository, так как это операция с тегами

---

### Группа E: Унификация паттернов (Приоритет: Medium)

#### Шаг 12: Унифицировать проверку существования в DatabaseRepository

**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseRepository.kt`

**Текущий код (строки 56, 116, 161):**
```kotlin
val exists = Table.select { ... }.count() > 0
```

**Новый код:**
```kotlin
val exists = Table.select { ... }.any()
```

**Затронутые методы:**
- `updateDatabase()` (строка 56)
- `updateColumn()` (строка 116)
- `updateRecord()` (строка 161)

---

#### Шаг 13: Добавить необходимые импорты для CTE-запросов

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt`

**Добавить импорты:**
```kotlin
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.StringColumnType
```

---

### Группа F: Оптимизация setNoteTags (Приоритет: Low)

#### Шаг 14: Оптимизация `setNoteTags()` — batch INSERT

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagRepository.kt`  
**Строки:** 69-80

**Текущий код (N вставок):**
```kotlin
fun setNoteTags(noteId: String, tagIds: List<String>): Unit = transaction {
    NoteTagsTable.deleteWhere { NoteTagsTable.noteId eq noteId }
    tagIds.forEach { tagId ->
        NoteTagsTable.insert {  // N вставок!
            it[NoteTagsTable.noteId] = noteId
            it[NoteTagsTable.tagId] = tagId
        }
    }
}
```

**Новый код (1 batch INSERT):**
```kotlin
fun setNoteTags(noteId: String, tagIds: List<String>): Unit = transaction {
    NoteTagsTable.deleteWhere { NoteTagsTable.noteId eq noteId }
    
    if (tagIds.isNotEmpty()) {
        NoteTagsTable.batchInsert(tagIds) { tagId ->
            this[NoteTagsTable.noteId] = noteId
            this[NoteTagsTable.tagId] = tagId
        }
    }
}
```

---

## Файлы для модификации

| Файл | Изменения |
|------|-----------|
| `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` | Оптимизация CTE-запросов, добавление batch-методов, удаление дублирования |
| `server/src/main/kotlin/com/notebox/domain/tag/TagRepository.kt` | Добавление `findByIds()`, оптимизация `setNoteTags()` |
| `server/src/main/kotlin/com/notebox/domain/note/NoteDtoMapper.kt` | Добавление зависимости TagRepository |
| `server/src/main/kotlin/com/notebox/domain/database/DatabaseRepository.kt` | Унификация `.any()` вместо `.count() > 0` |

---

## Файлы для создания

Нет новых файлов.

---

## Файлы для удаления

Нет файлов для удаления.

---

## Миграции

Миграции БД не требуются — все изменения затрагивают только код приложения.

---

## Стратегия тестирования

### 1. Компиляция
```bash
cd server && ./gradlew compileKotlin
```

### 2. Запуск unit-тестов
```bash
cd server && ./gradlew test
```

### 3. Функциональное тестирование

**Тесты N+1 оптимизаций:**
- Создать иерархию заметок глубиной 5 уровней
- Вызвать `findAllDescendants()` для корневой заметки
- Убедиться, что возвращаются все потомки
- Проверить логи SQL — должен быть 1 запрос

**Тесты `getDepth()`:**
- Для заметки на 3-м уровне вложенности должен возвращать 3
- Для корневой заметки должен возвращать 0

**Тесты `getAncestorPath()`:**
- Для заметки на 3-м уровне должен возвращать путь из 3 заметок
- Первая заметка в пути — корневая
- Последняя — сама заметка

**Тесты batch-операций:**
- `deleteWithDescendants()` — удаляет все потомки за 1 запрос
- `orphanChildren()` — обновляет parentId за 1 запрос

### 4. Проверка существующей функциональности

- Создание заметки (вложенной)
- Перемещение заметки
- Удаление заметки с потомками
- Отображение breadcrumbs (путь к заметке)
- Работа с тегами заметок

---

## Оценка рисков

### Высокий риск

| Изменение | Причина | Митигация |
|-----------|---------|-----------|
| CTE-запросы | Нативный SQL может не работать на всех СУБД | Тестирование на PostgreSQL, который поддерживает CTE |
| Изменение результата `getAncestorPath()` | Порядок элементов может измениться | Проверить ORDER BY DESC в запросе |

### Средний риск

| Изменение | Причина | Митигация |
|-----------|---------|-----------|
| Удаление `findTagsByNoteId` из NoteRepository | Возможны неочевидные зависимости | Компиляция выявит все проблемы |
| Изменение NoteDtoMapper | DI конфигурация | Проверить Spring context |

### Низкий риск

| Изменение | Причина | Митигация |
|-----------|---------|-----------|
| Batch INSERT/UPDATE/DELETE | Изменение количества запросов | Unit-тесты |
| Унификация `.any()` | Семантически эквивалентно | Компиляция |

---

## Метрики успеха

| Метрика | До | После |
|---------|-----|-------|
| SQL-запросов при загрузке потомков (глубина 4) | ~15 | 1 |
| SQL-запросов при получении глубины (уровень 4) | ~4 | 1 |
| SQL-запросов при получении пути (уровень 4) | ~4 | 1 |
| SQL-запросов при удалении с потомками (10 заметок) | ~11 | 2 |
| SQL-запросов при orphanChildren (5 детей) | ~6 | 2 |
| Дублирование findTagsByNoteId | 2 места | 1 место |

---

## Порядок выполнения

1. **Шаги 1-3** — CTE-оптимизации (последовательно, с тестированием каждого)
2. **Шаги 4-5** — Batch UPDATE/DELETE
3. **Шаги 6-8** — Новые batch-методы
4. **Шаги 9-11** — Устранение дублирования (вместе, так как связаны)
5. **Шаги 12-13** — Унификация паттернов
6. **Шаг 14** — Оптимизация setNoteTags
7. **Финальное тестирование** — компиляция и тесты
