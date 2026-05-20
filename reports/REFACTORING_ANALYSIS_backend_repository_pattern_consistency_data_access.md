# Анализ рефакторинга: Backend Repository Pattern Consistency и Data Access Layer

**Дата анализа:** 2026-05-20  
**Область:** Backend репозитории и слой доступа к данным  
**Статус:** Готов к рефакторингу

---

## 1. Обзор текущей архитектуры

### 1.1 Структура репозиториев

Проект содержит **9 репозиториев**, организованных по доменным областям:

```
com.notebox.domain/
├── auth/
│   ├── SessionRepository.kt
│   ├── UserRepository.kt
│   └── UserOAuthAccountRepository.kt
├── database/
│   └── DatabaseRepository.kt
├── folder/
│   └── FolderRepository.kt
├── note/
│   └── NoteRepository.kt
├── notification/
│   └── PushSubscriptionRepository.kt
├── reminder/
│   └── ReminderRepository.kt
└── tag/
    └── TagRepository.kt
```

### 1.2 Технологический стек

- **ORM:** Jetbrains Exposed (DSL)
- **База данных:** PostgreSQL (предположительно)
- **Фреймворк:** Spring Boot с Kotlin
- **Управление транзакциями:** Exposed `transaction {}` блоки

### 1.3 Паттерн репозитория

Все репозитории являются конкретными классами, аннотированными `@Repository`. Каждый метод самостоятельно управляет транзакциями через `transaction {}`.

---

## 2. Список затронутых файлов и компонентов

### 2.1 Репозитории (9 файлов)

| Файл | LOC | Методов | Критичность |
|------|-----|---------|-------------|
| `NoteRepository.kt` | 248 | 21 | Высокая |
| `DatabaseRepository.kt` | 219 | 19 | Средняя |
| `ReminderRepository.kt` | 160 | 14 | Средняя |
| `UserOAuthAccountRepository.kt` | 107 | 8 | Низкая |
| `TagRepository.kt` | 96 | 10 | Высокая |
| `UserRepository.kt` | 84 | 6 | Низкая |
| `PushSubscriptionRepository.kt` | 79 | 7 | Низкая |
| `FolderRepository.kt` | 75 | 7 | Низкая |
| `SessionRepository.kt` | 63 | 7 | Низкая |

### 2.2 Сервисы (зависящие от репозиториев)

- `NoteService.kt` - использует NoteRepository
- `TagService.kt` - использует TagRepository
- `FolderService.kt` - использует FolderRepository, NoteRepository
- `DatabaseService.kt` - использует DatabaseRepository
- `ReminderService.kt` - использует ReminderRepository, NoteRepository
- `UserService.kt` - использует UserRepository, UserOAuthAccountRepository
- `SessionService.kt` - использует SessionRepository
- `PushNotificationService.kt` - использует PushSubscriptionRepository
- `NoteDtoMapper.kt` - использует NoteRepository

### 2.3 Контроллеры (косвенно затронутые)

- `NoteController.kt`
- `TagController.kt`
- `FolderController.kt`
- `DatabaseController.kt`
- `ReminderController.kt`
- `AuthController.kt`
- `NotificationController.kt`

---

## 3. Граф зависимостей

```
┌─────────────────────────────────────────────────────────────────┐
│                        CONTROLLERS                              │
│  NoteController  TagController  FolderController  ...           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVICES                                │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ NoteService │───▶│NoteDtoMapper│───▶│ NoteRepository      │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│         │                                       │               │
│         │                                       │ findTagsByNoteId│
│         │                                       │ (дублируется)  │
│         ▼                                       │               │
│  ┌─────────────┐                               ▼               │
│  │ TagService  │────────────────────▶ ┌───────────────┐        │
│  └─────────────┘                      │ TagRepository │        │
│                                       └───────────────┘        │
│                                               │                 │
│  ┌──────────────┐    ┌─────────────────┐     │                 │
│  │FolderService │───▶│ FolderRepository│     │                 │
│  └──────────────┘    └─────────────────┘     │                 │
│         │                                     │                 │
│         └────────────────────────────────────┼───────────────▶ │
│                       (использует NoteRepository)              │
│                                                                 │
│  ┌────────────────┐    ┌──────────────────┐                    │
│  │DatabaseService │───▶│DatabaseRepository│ (3 entity в 1)    │
│  └────────────────┘    └──────────────────┘                    │
│         │                                                       │
│  ┌──────┴──────┐                                               │
│  │ColumnService│                                               │
│  │RecordService│                                               │
│  └─────────────┘                                               │
│                                                                 │
│  ┌────────────────┐    ┌──────────────────┐                    │
│  │ReminderService │───▶│ReminderRepository│                    │
│  └────────────────┘    └──────────────────┘                    │
│         │                                                       │
│         └───────────────────────────────────▶ NoteRepository   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPOSED TABLES                              │
│  NotesTable  TagsTable  NoteTagsTable  FoldersTable  ...        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Выявленные проблемы (Code Smells)

### 4.1 Неконсистентность именования методов

#### 4.1.1 Префиксы `find` vs `get`

| Репозиторий | find* | get* | Проблема |
|-------------|-------|------|----------|
| NoteRepository | findById, findAll, findByParentId | getDepth, getAncestorPath | Смешение |
| ReminderRepository | findById, findAll, findByNoteId | getDueReminders, getUpcoming | Смешение |
| UserOAuthAccountRepository | findById, findByProvider | getByUserIdAndProvider | Смешение |

**Рекомендация:** Унифицировать к `find*` для поиска сущностей, `get*` для вычисляемых значений.

#### 4.1.2 Сигнатуры с userId

Разные репозитории по-разному требуют userId:

```kotlin
// ReminderRepository - userId обязателен
fun findById(id: String, userId: String): Reminder?
fun delete(id: String, userId: String): Boolean

// TagRepository - userId не требуется
fun findById(id: String): Tag?
fun delete(id: String): Boolean
```

**Рекомендация:** Унифицировать подход к multi-tenancy либо через userId в методе, либо через context.

#### 4.1.3 Batch-операции

```kotlin
// Разные названия для аналогичных операций
deleteByUserId()      // SessionRepository, UserOAuthAccountRepository
deleteByParentId()    // FolderRepository, NoteRepository
deleteByNoteId()      // ReminderRepository
deleteByEndpoint()    // PushSubscriptionRepository
deleteAll()           // NoteRepository
deleteAllDatabases()  // DatabaseRepository
```

**Рекомендация:** Стандартизировать паттерн `deleteBy{Field}(value)` и `deleteAll()`.

### 4.2 N+1 Query Problems

#### 4.2.1 КРИТИЧНО: findAllDescendants() - NoteRepository:105-117

```kotlin
fun findAllDescendants(noteId: String): List<Note> = transaction {
    val descendants = mutableListOf<Note>()
    val queue = mutableListOf(noteId)

    while (queue.isNotEmpty()) {
        val currentId = queue.removeAt(0)
        val children = findByParentId(currentId)  // <- N запросов к БД!
        descendants.addAll(children)
        queue.addAll(children.map { it.id })
    }
    descendants
}
```

**Количество запросов:** O(глубина дерева)  
**Решение:** Рекурсивный CTE (Common Table Expression) запрос

#### 4.2.2 КРИТИЧНО: getDepth() - NoteRepository:119-130

```kotlin
fun getDepth(noteId: String): Int = transaction {
    var depth = 0
    var currentId: String? = noteId
    while (currentId != null) {
        val note = findById(currentId) ?: break  // <- N запросов!
        currentId = note.parentId
        if (currentId != null) depth++
    }
    depth
}
```

**Количество запросов:** O(глубина вложенности)  
**Решение:** Рекурсивный CTE или materialized path

#### 4.2.3 КРИТИЧНО: getAncestorPath() - NoteRepository:132-143

Аналогичная проблема с рекурсивным обходом вверх по дереву.

#### 4.2.4 СРЕДНЕ: orphanChildren() - NoteRepository:172-185

```kotlin
fun orphanChildren(noteId: String): Int = transaction {
    val children = findByParentId(noteId)
    children.forEach { child ->
        NotesTable.update({ NotesTable.id eq child.id }) {  // <- N обновлений!
            it[parentId] = note.parentId
        }
    }
    children.size
}
```

**Решение:** Batch update с `WHERE parentId = ?`

#### 4.2.5 СРЕДНЕ: deleteWithDescendants() - NoteRepository:162-170

```kotlin
allIds.forEach { id ->
    deletedCount += NotesTable.deleteWhere { NotesTable.id eq id }  // <- N удалений!
}
```

**Решение:** `DELETE WHERE id IN (...)`

#### 4.2.6 НИЗКО: verifyTagsOwnership() - TagService:37-39

```kotlin
fun verifyTagsOwnership(tagIds: List<String>, userId: String) {
    tagIds.forEach { verifyTagOwnership(it, userId) }  // <- N запросов findById!
}
```

**Решение:** Batch-запрос `findByIds(tagIds)` и проверка в памяти

### 4.3 Дублирование кода

#### 4.3.1 Дублирование findTagsByNoteId

**NoteRepository.kt:199-211:**
```kotlin
fun findTagsByNoteId(noteId: String): List<Tag> = transaction {
    (TagsTable innerJoin NoteTagsTable)
        .select { NoteTagsTable.noteId eq noteId }
        .map { row ->
            Tag(
                id = row[TagsTable.id],
                userId = row[TagsTable.userId],
                name = row[TagsTable.name],
                color = row[TagsTable.color],
                createdAt = row[TagsTable.createdAt]
            )
        }
}
```

**TagRepository.kt:63-67:**
```kotlin
fun findTagsByNoteId(noteId: String): List<Tag> = transaction {
    (TagsTable innerJoin NoteTagsTable)
        .select { NoteTagsTable.noteId eq noteId }
        .map { toTag(it) }
}
```

**Рекомендация:** Удалить дублирование, оставить только в TagRepository

#### 4.3.2 Дублирование маппинга Tag

В `NoteRepository` создается Tag вручную, в `TagRepository` используется `toTag()`.

#### 4.3.3 Дублирование проверки существования

```kotlin
// Способ 1
val exists = Table.select { id eq value }.count() > 0

// Способ 2
val exists = Table.select { id eq value }.any()

// Способ 3
findById(id) ?: return@transaction null
```

### 4.4 Архитектурные проблемы

#### 4.4.1 DatabaseRepository нарушает SRP

`DatabaseRepository` управляет тремя разными сущностями:
- `CustomDatabase`
- `Column`
- `Record`

**Рекомендация:** Разделить на `CustomDatabaseRepository`, `ColumnRepository`, `RecordRepository`

#### 4.4.2 Отсутствие интерфейсов репозиториев

Все репозитории - конкретные классы. Это затрудняет:
- Unit-тестирование (сложно мокать)
- Подмену реализации
- Соблюдение Dependency Inversion Principle

#### 4.4.3 Отсутствие базового репозитория

Нет общего `BaseRepository<T, ID>` с методами `findById`, `findAll`, `save`, `delete`.

#### 4.4.4 Transaction scope на уровне метода

Каждый метод оборачивает логику в `transaction {}`:

```kotlin
fun findById(id: String): Note? = transaction { ... }
fun create(...): Note = transaction { ... }
```

Это не позволяет группировать несколько операций в одну транзакцию на уровне сервиса.

### 4.5 Недостающие методы

| Репозиторий | Недостающие методы |
|-------------|-------------------|
| TagRepository | `findByIds(List<String>)` - для batch-проверки владения |
| NoteRepository | `findByIds(List<String>)` - для batch-загрузки |
| NoteRepository | `countByParentId(parentId)` - для проверки без загрузки |
| NoteRepository | `updateParentIdBatch(noteIds, newParentId)` - batch-обновление |
| NoteRepository | `deleteByIds(List<String>)` - batch-удаление |

### 4.6 Проблемы с исключениями

В проекте **6 исключений**, разбросанных по двум файлам:

```
exception/
├── DomainExceptions.kt
│   ├── NotFoundException
│   └── AccessDeniedException
└── Exceptions.kt
    ├── ResourceNotFoundException  <- дублирует NotFoundException!
    ├── InvalidRequestException
    └── CircularReferenceException
```

**Проблемы:**
- `NotFoundException` и `ResourceNotFoundException` - дублирование
- Неконсистентное использование в коде
- Некоторые репозитории бросают `IllegalArgumentException` вместо доменных исключений

---

## 5. Оценка рисков

### 5.1 Высокий риск

| Изменение | Причина риска | Митигация |
|-----------|---------------|-----------|
| Изменение сигнатур методов репозиториев | Множество зависимых сервисов | Автоматизированное тестирование |
| Рефакторинг N+1 queries | Изменение логики обхода дерева | Нагрузочное тестирование |
| Разделение DatabaseRepository | 3 сервиса зависят от него | Поэтапный рефакторинг |

### 5.2 Средний риск

| Изменение | Причина риска | Митигация |
|-----------|---------------|-----------|
| Добавление интерфейсов | Изменение DI конфигурации | Проверка Spring context |
| Удаление дублирования findTagsByNoteId | Изменение импортов | IDE поддержка |

### 5.3 Низкий риск

| Изменение | Причина риска | Митигация |
|-----------|---------------|-----------|
| Переименование методов | IDE автоматически обновит вызовы | Компиляция |
| Унификация исключений | Локальные изменения | Unit-тесты |

---

## 6. Рекомендуемый подход к рефакторингу

### Фаза 1: Подготовка (не ломает API)

1. **Добавить batch-методы без удаления существующих:**
   - `findByIds(ids: List<String>)`
   - `deleteByIds(ids: List<String>)`
   - `updateParentIdBatch(noteIds, newParentId)`

2. **Создать интерфейсы репозиториев:**
   ```kotlin
   interface NoteRepository {
       fun findById(id: String): Note?
       fun findAll(): List<Note>
       // ...
   }
   
   @Repository
   class ExposedNoteRepository : NoteRepository { ... }
   ```

3. **Вынести общую логику в BaseRepository**

### Фаза 2: Оптимизация N+1 (требует тестирования)

1. **Заменить рекурсивные методы на CTE-запросы:**
   - `findAllDescendants()` -> рекурсивный CTE
   - `getDepth()` -> рекурсивный CTE
   - `getAncestorPath()` -> рекурсивный CTE

2. **Batch-оптимизация существующих методов:**
   - `orphanChildren()` -> batch UPDATE
   - `deleteWithDescendants()` -> batch DELETE с inList

### Фаза 3: Структурная чистка

1. **Разделить DatabaseRepository** на три репозитория

2. **Унифицировать именование методов**

3. **Консолидировать исключения**

### Фаза 4: Удаление дублирования

1. **Удалить findTagsByNoteId из NoteRepository**

2. **Унифицировать toEntity() mappers**

---

## 7. Приоритизация задач

### P0 - Критично (влияет на производительность)

1. Оптимизация `findAllDescendants()` - используется при каждом обновлении/перемещении заметки
2. Оптимизация `getDepth()` - используется при каждом создании/перемещении заметки
3. Добавление `findByIds()` для batch-операций

### P1 - Важно (архитектурный долг)

1. Создание интерфейсов репозиториев
2. Разделение DatabaseRepository
3. Унификация именования методов

### P2 - Желательно (code quality)

1. Удаление дублирования findTagsByNoteId
2. Консолидация исключений
3. Унификация паттернов проверки существования

---

## 8. Метрики успеха

| Метрика | До | После |
|---------|-----|-------|
| Количество SQL-запросов при загрузке потомков (глубина 4) | ~15 | 1 |
| Количество SQL-запросов при проверке глубины | ~4 | 1 |
| Дублирование кода (findTagsByNoteId) | 2 места | 1 место |
| Покрытие интерфейсами | 0% | 100% |
| Консистентность именования | ~60% | 100% |

---

## Приложение A: SQL для оптимизации N+1

### A.1 Рекурсивный CTE для findAllDescendants

```sql
WITH RECURSIVE descendants AS (
    SELECT id, title, content, parent_id, 0 as depth
    FROM notes
    WHERE parent_id = :noteId
    
    UNION ALL
    
    SELECT n.id, n.title, n.content, n.parent_id, d.depth + 1
    FROM notes n
    INNER JOIN descendants d ON n.parent_id = d.id
)
SELECT * FROM descendants;
```

### A.2 Рекурсивный CTE для getAncestorPath

```sql
WITH RECURSIVE ancestors AS (
    SELECT id, title, content, parent_id, 0 as depth
    FROM notes
    WHERE id = :noteId
    
    UNION ALL
    
    SELECT n.id, n.title, n.content, n.parent_id, a.depth + 1
    FROM notes n
    INNER JOIN ancestors a ON n.id = a.parent_id
)
SELECT * FROM ancestors ORDER BY depth DESC;
```

### A.3 Batch update для orphanChildren

```sql
UPDATE notes 
SET parent_id = :newParentId, updated_at = NOW()
WHERE parent_id = :oldParentId;
```

---

## Приложение B: Предлагаемая структура интерфейсов

```kotlin
// Базовый репозиторий
interface BaseRepository<T, ID> {
    fun findById(id: ID): T?
    fun findAll(): List<T>
    fun existsById(id: ID): Boolean
    fun count(): Long
    fun delete(id: ID): Boolean
}

// Расширение для поиска по нескольким ID
interface BatchFindRepository<T, ID> : BaseRepository<T, ID> {
    fun findByIds(ids: List<ID>): List<T>
    fun deleteByIds(ids: List<ID>): Int
}

// Расширение для иерархических структур
interface HierarchicalRepository<T, ID> : BatchFindRepository<T, ID> {
    fun findByParentId(parentId: ID?): List<T>
    fun findDescendants(id: ID): List<T>
    fun findAncestors(id: ID): List<T>
    fun getDepth(id: ID): Int
}
```
