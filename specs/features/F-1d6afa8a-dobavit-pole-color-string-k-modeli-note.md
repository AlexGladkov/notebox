# Спецификация: Добавить поле color (String) к модели Note

**ID:** F-1d6afa8a  
**Дата:** 2026-04-07  
**Статус:** Готово к реализации

## Краткое описание

Добавить поле `color` типа `String` к модели `Note` для цветовой маркировки заметок. Поле должно быть nullable с дефолтным значением `null`.

## Контекст

Приложение NoteBox - сервер на Kotlin/Spring Boot с ORM Exposed. Модель `Note` уже содержит несколько nullable полей для кастомизации (icon, backdropType, backdropValue, backdropPositionY). Поле `color` будет использоваться аналогично для визуальной маркировки заметок.

## Требования

### Функциональные требования

1. **Поле color в модели Note**
   - Тип: `String?` (nullable)
   - Дефолтное значение: `null`
   - Формат: произвольная строка (валидация формата на стороне клиента)
   - Максимальная длина: 20 символов (достаточно для HEX #RRGGBBAA или именованных цветов)

2. **API**
   - Поле `color` должно возвращаться в `NoteDto`
   - Поле `color` должно приниматься в `CreateNoteRequest` и `UpdateNoteRequest`
   - Валидация: опционально, max 20 символов

3. **База данных**
   - Новая колонка `color` в таблице `notes`
   - Тип: `VARCHAR(20)`, nullable
   - Дефолт: `NULL`

### Нефункциональные требования

- Обратная совместимость: существующие заметки без цвета продолжают работать (color = null)
- Миграция БД: если используется автоматическое обновление схемы (SchemaUtils.create), изменения применятся автоматически

## Файлы для изменения

| Файл | Изменения |
|------|-----------|
| `server/src/main/kotlin/com/notebox/domain/note/Note.kt` | Добавить поле `color: String?` |
| `server/src/main/kotlin/com/notebox/domain/note/NotesTable.kt` | Добавить колонку `color` |
| `server/src/main/kotlin/com/notebox/dto/NoteDto.kt` | Добавить `color` в `NoteDto`, `CreateNoteRequest`, `UpdateNoteRequest` |
| `server/src/main/kotlin/com/notebox/domain/note/NoteRepository.kt` | Добавить `color` в `create()`, `update()`, `toNote()` |
| `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt` | Добавить `color` в `createNote()`, `updateNote()` |

## Детальный план реализации

### 1. NotesTable.kt

Добавить колонку после `backdropPositionY`:

```kotlin
val color = varchar("color", 20).nullable()
```

### 2. Note.kt

Добавить поле в data class:

```kotlin
data class Note(
    val id: String,
    val title: String,
    val content: String,
    val parentId: String?,
    val icon: String?,
    val backdropType: String?,
    val backdropValue: String?,
    val backdropPositionY: Int?,
    val color: String?,  // <-- новое поле
    val createdAt: Instant,
    val updatedAt: Instant
)
```

Обновить метод `toDto()`:

```kotlin
fun toDto() = NoteDto(
    // ... существующие поля ...
    color = color,
    // ...
)
```

### 3. NoteDto.kt

Добавить поле в `NoteDto`:

```kotlin
data class NoteDto(
    // ... существующие поля ...
    val color: String?,
    // ...
)
```

Добавить поле в `CreateNoteRequest`:

```kotlin
@field:Size(max = 20, message = "Color must be less than 20 characters")
val color: String? = null
```

Добавить поле в `UpdateNoteRequest`:

```kotlin
@field:Size(max = 20, message = "Color must be less than 20 characters")
val color: String? = null
```

### 4. NoteRepository.kt

Обновить сигнатуру и тело `create()`:

```kotlin
fun create(
    // ... существующие параметры ...
    color: String? = null
): Note
```

Обновить сигнатуру и тело `update()`:

```kotlin
fun update(
    // ... существующие параметры ...
    color: String? = null
): Note?
```

Обновить `toNote()`:

```kotlin
private fun toNote(row: ResultRow) = Note(
    // ... существующие поля ...
    color = row[NotesTable.color],
    // ...
)
```

### 5. NoteService.kt

Обновить сигнатуры `createNote()` и `updateNote()`:

```kotlin
fun createNote(
    // ... существующие параметры ...
    color: String? = null
): Note

fun updateNote(
    // ... существующие параметры ...
    color: String? = null
): Note?
```

### 6. NoteController.kt (если есть изменения)

Убедиться, что контроллер передаёт `color` из request в service.

## Критерии приёмки

- [ ] Поле `color` добавлено в модель `Note`
- [ ] Колонка `color` добавлена в таблицу `notes`
- [ ] API принимает и возвращает поле `color`
- [ ] Валидация: max 20 символов
- [ ] Существующие заметки работают без изменений (color = null)
- [ ] Создание заметки с color работает
- [ ] Обновление заметки с изменением color работает
- [ ] Приложение успешно запускается

## Граничные случаи

1. **Создание заметки без color** - должен быть null
2. **Обновление заметки: установка color** - должен сохраниться
3. **Обновление заметки: сброс color в null** - должен стать null
4. **Миграция существующих данных** - все существующие заметки получают color = null автоматически

## Риски

- **Миграция БД**: Если используется Flyway/Liquibase, потребуется отдельный скрипт миграции. Если SchemaUtils.create - изменения применятся автоматически.

## Вне скоупа

- UI для выбора цвета (реализуется отдельно на фронтенде)
- Валидация формата цвета (HEX, RGB и т.д.) на бэкенде
- Предустановленный набор цветов
- Миграция данных с заполнением дефолтного цвета для существующих заметок

## Примечания

Интервью с пользователем не было проведено (бэкенд недоступен). Спецификация составлена на основе описания задачи и анализа существующего кода. Формат хранения цвета - произвольная строка, что даёт гибкость клиентам использовать любой формат (HEX, именованные цвета и т.д.).
