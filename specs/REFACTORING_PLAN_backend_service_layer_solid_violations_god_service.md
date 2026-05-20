# План рефакторинга: Backend Service Layer — SOLID нарушения и God Services

## Резюме

**Цель:** Декомпозиция god-сервисов, устранение нарушений SOLID принципов, вынос бизнес-логики из контроллеров в сервисы.

**Основные проблемы:**
1. **DemoContentService** — God Service с 5 зависимостями и 4+ ответственностями (КРИТИЧНО)
2. **DatabaseService** — управляет 3 разными сущностями: databases, columns, records (СРЕДНЕ)
3. **ReminderService** — смешивает CRUD с интеграцией Google Calendar (СРЕДНЕ)
4. **TagController/FileController** — бизнес-логика в контроллерах (НИЗКО)
5. **NoteService** — дублирование логики маппинга (НИЗКО)

**Ожидаемый результат:** Чистая архитектура с соблюдением SRP, улучшенная тестируемость, легкость добавления новых интеграций.

---

## Шаги рефакторинга

### Группа 1: DemoContentService — декомпозиция God Service (КРИТИЧНО)

#### Шаг 1.1: Создать DemoDataCleaner

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoDataCleaner.kt`

**Описание:** Выделить логику очистки демо-данных с проверкой безопасности.

```kotlin
package com.notebox.domain.demo

import com.notebox.domain.auth.UserRepository
import com.notebox.domain.database.DatabaseRepository
import com.notebox.domain.note.NoteRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

@Component
class DemoDataCleaner(
    private val userRepository: UserRepository,
    private val databaseRepository: DatabaseRepository,
    private val noteRepository: NoteRepository
) {
    private val logger = LoggerFactory.getLogger(DemoDataCleaner::class.java)

    companion object {
        private const val DEMO_EMAIL = "demo@notebox.app"
    }

    fun clearAllDemoData() {
        logger.info("Clearing demo data...")
        validateOnlyDemoUserExists()
        
        databaseRepository.deleteAllDatabases()
        noteRepository.deleteAll()
        logger.info("Demo data cleared successfully")
    }

    private fun validateOnlyDemoUserExists() {
        val allUsers = userRepository.findAll()
        val nonDemoUsers = allUsers.filter { it.email != DEMO_EMAIL }

        if (nonDemoUsers.isNotEmpty()) {
            val errorMsg = "SECURITY: Cannot clear demo data - system has ${nonDemoUsers.size} non-demo user(s)"
            logger.error(errorMsg)
            throw IllegalStateException(errorMsg)
        }
        logger.info("Safety check passed: only demo user exists")
    }
}
```

---

#### Шаг 1.2: Создать DemoNoteBuilder

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoNoteBuilder.kt`

**Описание:** Выделить логику создания демо-заметок.

```kotlin
package com.notebox.domain.demo

import com.notebox.domain.note.Note
import com.notebox.domain.note.NoteService
import org.springframework.stereotype.Component

@Component
class DemoNoteBuilder(
    private val noteService: NoteService
) {
    data class DemoNotes(
        val dashboard: Note,
        val goals: Note,
        val ideas: Note,
        val workNotes: Note,
        val contacts: Note
    )

    fun createDemoNotes(): DemoNotes {
        val dashboardNote = noteService.createNote(
            title = DemoContentData.DASHBOARD_TITLE,
            content = "{\"type\":\"doc\",\"content\":[]}",
            icon = "🏠"
        )

        val goalsNote = noteService.createNote(
            title = DemoContentData.GOALS_TITLE,
            content = DemoContentData.getGoalsContent(),
            icon = "🎯"
        )

        val ideasNote = noteService.createNote(
            title = DemoContentData.IDEAS_TITLE,
            content = DemoContentData.getIdeasContent(),
            icon = "💡"
        )

        val workNotesNote = noteService.createNote(
            title = DemoContentData.NOTES_TITLE,
            content = "{\"type\":\"doc\",\"content\":[]}",
            icon = "📝"
        )

        val contactsNote = noteService.createNote(
            title = DemoContentData.CONTACTS_TITLE,
            content = DemoContentData.getContactsContent(),
            parentId = workNotesNote.id,
            icon = "📋"
        )

        return DemoNotes(dashboardNote, goalsNote, ideasNote, workNotesNote, contactsNote)
    }

    fun updateNotesWithLinks(notes: DemoNotes, databaseId: String) {
        val dashboardContent = DemoContentData.getDashboardContent()
            .replace("{{GOALS_ID}}", notes.goals.id)
            .replace("{{IDEAS_ID}}", notes.ideas.id)
            .replace("{{NOTES_ID}}", notes.workNotes.id)
            .replace("{{DATABASE_ID}}", databaseId)

        noteService.updateNote(
            id = notes.dashboard.id,
            title = notes.dashboard.title,
            content = dashboardContent,
            icon = notes.dashboard.icon
        )

        val workNotesContent = DemoContentData.getNotesContent()
            .replace("{{CONTACTS_ID}}", notes.contacts.id)

        noteService.updateNote(
            id = notes.workNotes.id,
            title = notes.workNotes.title,
            content = workNotesContent,
            icon = notes.workNotes.icon
        )
    }
}
```

---

#### Шаг 1.3: Создать DemoDatabaseBuilder

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoDatabaseBuilder.kt`

**Описание:** Выделить логику создания демо-базы данных с колонками и записями.

```kotlin
package com.notebox.domain.demo

import com.notebox.domain.database.CustomDatabase
import com.notebox.domain.database.DatabaseService
import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import org.springframework.stereotype.Component

@Component
class DemoDatabaseBuilder(
    private val databaseService: DatabaseService
) {
    fun createDemoDatabase(): CustomDatabase {
        val (database, _) = databaseService.createDatabase(
            name = DemoContentData.DATABASE_NAME,
            folderId = null
        )

        val titleColumn = databaseService.addColumn(
            databaseId = database.id,
            name = "Название",
            type = ColumnType.TEXT,
            options = null,
            position = 0
        )

        val statusColumn = databaseService.addColumn(
            databaseId = database.id,
            name = "Статус",
            type = ColumnType.SELECT,
            options = listOf(
                SelectOptionDto(id = "todo", label = "К выполнению", color = "#93C5FD"),
                SelectOptionDto(id = "in-progress", label = "В процессе", color = "#FDE047"),
                SelectOptionDto(id = "done", label = "Готово", color = "#86EFAC")
            ),
            position = 1
        )

        val priorityColumn = databaseService.addColumn(
            databaseId = database.id,
            name = "Приоритет",
            type = ColumnType.SELECT,
            options = listOf(
                SelectOptionDto(id = "low", label = "Низкий", color = "#D1D5DB"),
                SelectOptionDto(id = "medium", label = "Средний", color = "#FCD34D"),
                SelectOptionDto(id = "high", label = "Высокий", color = "#FCA5A5")
            ),
            position = 2
        )

        createDemoRecords(database.id, titleColumn.id, statusColumn.id, priorityColumn.id)

        return database
    }

    private fun createDemoRecords(
        databaseId: String,
        titleColumnId: String,
        statusColumnId: String,
        priorityColumnId: String
    ) {
        val records = listOf(
            Triple("Подготовить презентацию", "in-progress", "high"),
            Triple("Ответить на письма", "todo", "medium"),
            Triple("Обновить документацию", "done", "low"),
            Triple("Созвон с командой", "todo", "high")
        )

        records.forEach { (title, status, priority) ->
            databaseService.createRecord(
                databaseId = databaseId,
                data = mapOf(
                    titleColumnId to title,
                    statusColumnId to status,
                    priorityColumnId to priority
                )
            )
        }
    }
}
```

---

#### Шаг 1.4: Рефакторинг DemoContentService в DemoContentOrchestrator

**Файл:** `server/src/main/kotlin/com/notebox/domain/demo/DemoContentService.kt`

**Описание:** Упростить до оркестратора, делегирующего работу специализированным компонентам.

```kotlin
package com.notebox.domain.demo

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class DemoContentService(
    private val demoDataCleaner: DemoDataCleaner,
    private val demoNoteBuilder: DemoNoteBuilder,
    private val demoDatabaseBuilder: DemoDatabaseBuilder
) {
    private val logger = LoggerFactory.getLogger(DemoContentService::class.java)

    fun clearDemoData() {
        try {
            demoDataCleaner.clearAllDemoData()
        } catch (e: Exception) {
            logger.error("Error clearing demo data", e)
            throw e
        }
    }

    fun createDemoContent() {
        logger.info("Creating demo content...")
        try {
            // Phase 1: Создаём заметки
            val notes = demoNoteBuilder.createDemoNotes()

            // Phase 2: Создаём базу данных
            val database = demoDatabaseBuilder.createDemoDatabase()

            // Phase 3: Обновляем заметки с правильными ссылками
            demoNoteBuilder.updateNotesWithLinks(notes, database.id)

            logger.info("Demo content created successfully: 5 notes, 1 database with 4 records")
        } catch (e: Exception) {
            logger.error("Error creating demo content", e)
            rollbackDemoContent()
            throw e
        }
    }

    private fun rollbackDemoContent() {
        try {
            logger.warn("Rolling back: clearing partially created demo data")
            demoDataCleaner.clearAllDemoData()
        } catch (cleanupError: Exception) {
            logger.error("Failed to cleanup after demo content creation error", cleanupError)
        }
    }
}
```

---

### Группа 2: DatabaseService — разделение на специализированные сервисы (СРЕДНЕ)

#### Шаг 2.1: Создать ColumnService

**Файл:** `server/src/main/kotlin/com/notebox/domain/database/ColumnService.kt`

**Описание:** Выделить операции с колонками в отдельный сервис.

```kotlin
package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import org.springframework.stereotype.Service

@Service
class ColumnService(
    private val databaseRepository: DatabaseRepository
) {
    fun getColumnsByDatabaseId(databaseId: String): List<Column> {
        return databaseRepository.findColumnsByDatabaseId(databaseId)
    }

    fun addColumn(
        databaseId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column {
        return databaseRepository.createColumn(databaseId, name, type, options, position)
    }

    fun updateColumn(
        id: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column? {
        return databaseRepository.updateColumn(id, name, type, options, position)
    }

    fun deleteColumn(id: String): Boolean {
        return databaseRepository.deleteColumn(id)
    }
}
```

---

#### Шаг 2.2: Создать RecordService

**Файл:** `server/src/main/kotlin/com/notebox/domain/database/RecordService.kt`

**Описание:** Выделить операции с записями в отдельный сервис.

```kotlin
package com.notebox.domain.database

import com.notebox.dto.RecordDto
import org.springframework.stereotype.Service

@Service
class RecordService(
    private val databaseRepository: DatabaseRepository
) {
    fun getRecordsByDatabaseId(databaseId: String): List<RecordDto> {
        return databaseRepository.findRecordsByDatabaseId(databaseId).map { it.toDto() }
    }

    fun getRecordById(id: String): RecordDto? {
        return databaseRepository.findRecordById(id)?.toDto()
    }

    fun createRecord(databaseId: String, data: Map<String, Any?>): RecordDto {
        return databaseRepository.createRecord(databaseId, data).toDto()
    }

    fun updateRecord(id: String, data: Map<String, Any?>): RecordDto? {
        return databaseRepository.updateRecord(id, data)?.toDto()
    }

    fun deleteRecord(id: String): Boolean {
        return databaseRepository.deleteRecord(id)
    }

    private fun Record.toDto() = RecordDto(
        id = id,
        databaseId = databaseId,
        data = data,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli()
    )
}
```

---

#### Шаг 2.3: Упростить DatabaseService

**Файл:** `server/src/main/kotlin/com/notebox/domain/database/DatabaseService.kt`

**Описание:** Оставить только операции с CustomDatabase, делегировать остальное ColumnService и RecordService.

```kotlin
package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.RecordDto
import com.notebox.dto.SelectOptionDto
import org.springframework.stereotype.Service

@Service
class DatabaseService(
    private val databaseRepository: DatabaseRepository,
    private val columnService: ColumnService,
    private val recordService: RecordService
) {
    // CustomDatabase operations
    fun getAllDatabases(): List<CustomDatabase> {
        return databaseRepository.findAllDatabases()
    }

    fun getAllDatabasesWithColumns(): List<Pair<CustomDatabase, List<Column>>> {
        return databaseRepository.findAllDatabasesWithColumns()
    }

    fun getDatabaseById(id: String): Pair<CustomDatabase, List<Column>>? {
        val database = databaseRepository.findDatabaseById(id) ?: return null
        val columns = columnService.getColumnsByDatabaseId(id)
        return database to columns
    }

    fun createDatabase(name: String, folderId: String?): Pair<CustomDatabase, List<Column>> {
        val database = databaseRepository.createDatabase(name, folderId)
        return database to emptyList()
    }

    fun updateDatabase(id: String, name: String, folderId: String?): Pair<CustomDatabase, List<Column>>? {
        val database = databaseRepository.updateDatabase(id, name, folderId) ?: return null
        val columns = columnService.getColumnsByDatabaseId(id)
        return database to columns
    }

    fun deleteDatabase(id: String): Boolean {
        return databaseRepository.deleteDatabase(id)
    }

    // Делегация к ColumnService (для обратной совместимости)
    fun addColumn(
        databaseId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column = columnService.addColumn(databaseId, name, type, options, position)

    fun updateColumn(
        id: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column? = columnService.updateColumn(id, name, type, options, position)

    fun deleteColumn(id: String): Boolean = columnService.deleteColumn(id)

    // Делегация к RecordService (для обратной совместимости)
    fun getRecordsByDatabaseId(databaseId: String): List<RecordDto> = 
        recordService.getRecordsByDatabaseId(databaseId)

    fun getRecordById(id: String): RecordDto? = recordService.getRecordById(id)

    fun createRecord(databaseId: String, data: Map<String, Any?>): RecordDto = 
        recordService.createRecord(databaseId, data)

    fun updateRecord(id: String, data: Map<String, Any?>): RecordDto? = 
        recordService.updateRecord(id, data)

    fun deleteRecord(id: String): Boolean = recordService.deleteRecord(id)
}
```

---

### Группа 3: ReminderService — выделение интеграции с календарём (СРЕДНЕ)

#### Шаг 3.1: Создать ReminderCalendarSyncService

**Файл:** `server/src/main/kotlin/com/notebox/domain/reminder/ReminderCalendarSyncService.kt`

**Описание:** Выделить логику синхронизации с Google Calendar.

```kotlin
package com.notebox.domain.reminder

import com.notebox.domain.calendar.GoogleCalendarService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

@Service
class ReminderCalendarSyncService(
    private val googleCalendarService: GoogleCalendarService,
    private val reminderRepository: ReminderRepository
) {
    private val logger = LoggerFactory.getLogger(ReminderCalendarSyncService::class.java)

    fun syncToCalendar(userId: String, reminder: Reminder): Reminder {
        return try {
            val googleEventId = googleCalendarService.createEvent(userId, reminder)
            if (googleEventId != null) {
                reminderRepository.updateGoogleEventId(reminder.id, googleEventId)
                reminder.copy(googleEventId = googleEventId)
            } else {
                reminder
            }
        } catch (e: Exception) {
            logger.error("Failed to sync reminder to Google Calendar", e)
            reminder
        }
    }

    fun updateInCalendar(userId: String, reminder: Reminder) {
        if (reminder.googleEventId == null) return
        
        try {
            googleCalendarService.updateEvent(userId, reminder)
        } catch (e: Exception) {
            logger.error("Failed to update Google Calendar event", e)
        }
    }

    fun deleteFromCalendar(userId: String, googleEventId: String) {
        try {
            googleCalendarService.deleteEvent(userId, googleEventId)
        } catch (e: Exception) {
            logger.error("Failed to delete Google Calendar event", e)
        }
    }
}
```

---

#### Шаг 3.2: Рефакторинг ReminderService

**Файл:** `server/src/main/kotlin/com/notebox/domain/reminder/ReminderService.kt`

**Описание:** Убрать прямую зависимость от GoogleCalendarService, использовать ReminderCalendarSyncService.

```kotlin
package com.notebox.domain.reminder

import com.notebox.domain.note.NoteRepository
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class ReminderService(
    private val reminderRepository: ReminderRepository,
    private val noteRepository: NoteRepository,
    private val calendarSyncService: ReminderCalendarSyncService
) {
    fun getAllReminders(userId: String): List<Reminder> {
        return reminderRepository.findAll(userId)
    }

    fun getReminderById(id: String, userId: String): Reminder? {
        return reminderRepository.findById(id, userId)
    }

    fun getRemindersByNoteId(noteId: String, userId: String): List<Reminder> {
        return reminderRepository.findByNoteId(noteId, userId)
    }

    fun createReminder(
        noteId: String,
        userId: String,
        title: String?,
        remindAt: Instant,
        repeatType: RepeatType = RepeatType.NONE,
        repeatEndAt: Instant? = null,
        syncToGoogleCalendar: Boolean = false
    ): Reminder {
        val note = noteRepository.findById(noteId)
            ?: throw IllegalArgumentException("Note not found")

        val reminderTitle = title ?: note.title

        var reminder = reminderRepository.create(
            noteId = noteId,
            userId = userId,
            title = reminderTitle,
            remindAt = remindAt,
            repeatType = repeatType,
            repeatEndAt = repeatEndAt
        )

        if (syncToGoogleCalendar) {
            reminder = calendarSyncService.syncToCalendar(userId, reminder)
        }

        return reminder
    }

    fun updateReminder(
        id: String,
        userId: String,
        title: String?,
        remindAt: Instant?,
        repeatType: RepeatType?,
        repeatEndAt: Instant?
    ): Reminder? {
        val reminder = reminderRepository.update(id, userId, title, remindAt, repeatType, repeatEndAt)
            ?: return null

        calendarSyncService.updateInCalendar(userId, reminder)

        return reminder
    }

    fun deleteReminder(id: String, userId: String): Boolean {
        val reminder = reminderRepository.findById(id, userId) ?: return false

        if (reminder.googleEventId != null) {
            calendarSyncService.deleteFromCalendar(userId, reminder.googleEventId)
        }

        return reminderRepository.delete(id, userId)
    }

    fun getUpcomingReminders(userId: String, limit: Int = 10): List<Reminder> {
        return reminderRepository.getUpcoming(userId, limit)
    }
}
```

---

### Группа 4: TagController — перенос бизнес-логики в TagService (НИЗКО)

#### Шаг 4.1: Добавить методы проверки владения в TagService

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagService.kt`

**Описание:** Добавить методы для проверки владения тегом пользователем.

**Изменения:** Добавить методы `getTagByIdForUser`, `verifyTagOwnership`, `verifyTagsOwnership`:

```kotlin
// Добавить в TagService:

fun getTagByIdForUser(id: String, userId: String): Tag? {
    val tag = getTagById(id) ?: return null
    if (tag.userId != userId) {
        throw AccessDeniedException("Access denied to tag: $id")
    }
    return tag
}

fun verifyTagOwnership(tagId: String, userId: String) {
    val tag = getTagById(tagId) 
        ?: throw NotFoundException("Tag not found: $tagId")
    if (tag.userId != userId) {
        throw AccessDeniedException("Access denied to tag: $tagId")
    }
}

fun verifyTagsOwnership(tagIds: List<String>, userId: String) {
    tagIds.forEach { verifyTagOwnership(it, userId) }
}
```

---

#### Шаг 4.2: Создать кастомные исключения

**Файл:** `server/src/main/kotlin/com/notebox/exception/DomainExceptions.kt`

**Описание:** Создать типизированные исключения для домена.

```kotlin
package com.notebox.exception

class NotFoundException(message: String) : RuntimeException(message)
class AccessDeniedException(message: String) : RuntimeException(message)
```

---

#### Шаг 4.3: Упростить TagController

**Файл:** `server/src/main/kotlin/com/notebox/domain/tag/TagController.kt`

**Описание:** Удалить дублирующуюся логику проверки владения, использовать методы из TagService.

**Изменения в методах:**
- `getTagById`: заменить на `tagService.getTagByIdForUser(id, userId)`
- `updateTag`: заменить проверку владения на `tagService.verifyTagOwnership(id, userId)`
- `deleteTag`: заменить проверку владения на `tagService.verifyTagOwnership(id, userId)`
- `setNoteTags`: заменить цикл проверки на `tagService.verifyTagsOwnership(request.tagIds, userId)`

---

### Группа 5: FileController — вынос бизнес-логики в FileService (НИЗКО)

#### Шаг 5.1: Создать FileService

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileService.kt`

**Описание:** Создать сервис для бизнес-логики работы с файлами.

```kotlin
package com.notebox.domain.storage

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.util.*

data class UploadResult(
    val fileId: String,
    val filename: String,
    val key: String,
    val contentType: String?,
    val size: Long
)

@Service
class FileService(
    private val fileStorageService: FileStorageService,
    private val fileValidationService: FileValidationService
) {
    companion object {
        private val KEY_PATTERN = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z]{2,5}$")
    }

    fun uploadFile(file: MultipartFile): UploadResult {
        val validationResult = fileValidationService.validateFile(file)
        if (!validationResult.isValid) {
            throw IllegalArgumentException(validationResult.errorMessage)
        }

        val originalFilename = file.originalFilename ?: "unknown"
        val safeName = originalFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val extension = safeName.substringAfterLast('.', "").lowercase()

        val fileId = UUID.randomUUID().toString()
        val key = "$fileId.$extension"

        fileStorageService.uploadFile(file, key)

        return UploadResult(
            fileId = fileId,
            filename = safeName,
            key = key,
            contentType = file.contentType,
            size = file.size
        )
    }

    fun getFileUrl(key: String): String {
        validateKey(key)
        return fileStorageService.getFileUrl(key)
    }

    fun deleteFile(key: String) {
        validateKey(key)
        fileStorageService.deleteFile(key)
    }

    private fun validateKey(key: String) {
        if (key.contains("..") || key.contains("/") || key.contains("\\")) {
            throw IllegalArgumentException("Invalid file key: path traversal detected")
        }
        if (!KEY_PATTERN.matches(key)) {
            throw IllegalArgumentException("Invalid file key format")
        }
    }
}
```

---

#### Шаг 5.2: Упростить FileController

**Файл:** `server/src/main/kotlin/com/notebox/domain/storage/FileController.kt`

**Описание:** Убрать бизнес-логику, делегировать FileService.

```kotlin
package com.notebox.domain.storage

import com.notebox.dto.ApiResponse
import com.notebox.dto.errorResponse
import com.notebox.dto.successResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

data class UploadFileResponse(
    val fileId: String,
    val filename: String,
    val key: String,
    val contentType: String?,
    val size: Long
)

data class GetFileUrlResponse(val url: String)

@RestController
@RequestMapping("/api/files")
class FileController(
    private val fileService: FileService
) {
    @PostMapping("/upload")
    fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<ApiResponse<UploadFileResponse>> {
        return try {
            val result = fileService.uploadFile(file)
            val response = UploadFileResponse(
                fileId = result.fileId,
                filename = result.filename,
                key = result.key,
                contentType = result.contentType,
                size = result.size
            )
            ResponseEntity.status(HttpStatus.CREATED).body(successResponse(response))
        } catch (e: IllegalArgumentException) {
            ResponseEntity.badRequest().body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid file"))
        }
    }

    @GetMapping("/{key}")
    fun getFileUrl(@PathVariable key: String): ResponseEntity<ApiResponse<GetFileUrlResponse>> {
        return try {
            val url = fileService.getFileUrl(key)
            ResponseEntity.ok(successResponse(GetFileUrlResponse(url)))
        } catch (e: IllegalArgumentException) {
            ResponseEntity.badRequest().body(errorResponse("INVALID_KEY", e.message ?: "Invalid key"))
        }
    }

    @DeleteMapping("/{key}")
    fun deleteFile(@PathVariable key: String): ResponseEntity<ApiResponse<Nothing>> {
        return try {
            fileService.deleteFile(key)
            ResponseEntity.status(HttpStatus.NO_CONTENT).build()
        } catch (e: IllegalArgumentException) {
            ResponseEntity.badRequest().body(errorResponse("INVALID_KEY", e.message ?: "Invalid key"))
        }
    }
}
```

---

### Группа 6: NoteService — устранение дублирования маппинга (НИЗКО)

#### Шаг 6.1: Создать NoteDtoMapper

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteDtoMapper.kt`

**Описание:** Выделить логику маппинга Note -> NoteDto с тегами.

```kotlin
package com.notebox.domain.note

import com.notebox.dto.NoteDto
import org.springframework.stereotype.Component

@Component
class NoteDtoMapper(
    private val noteRepository: NoteRepository
) {
    fun toDto(note: Note): NoteDto {
        val tags = noteRepository.findTagsByNoteId(note.id).map { it.toDto() }
        return note.toDto(tags)
    }

    fun toDtoList(notes: List<Note>): List<NoteDto> {
        if (notes.isEmpty()) return emptyList()
        
        val noteIds = notes.map { it.id }
        val tagsMap = noteRepository.findTagsForNotes(noteIds)
        
        return notes.map { note ->
            val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
            note.toDto(tags)
        }
    }
}
```

---

#### Шаг 6.2: Рефакторинг NoteService для использования NoteDtoMapper

**Файл:** `server/src/main/kotlin/com/notebox/domain/note/NoteService.kt`

**Описание:** Заменить дублирующийся код маппинга вызовами NoteDtoMapper.

**Изменения:**
- Добавить зависимость `NoteDtoMapper` в конструктор
- Упростить методы `getAllNotesWithTags()`, `getRootNotesWithTags()`, `getNoteByIdWithTags()`, `getChildrenWithTags()`, `getAncestorPathWithTags()`

```kotlin
// Было:
fun getAllNotesWithTags(): List<NoteDto> {
    val notes = noteRepository.findAll()
    val noteIds = notes.map { it.id }
    val tagsMap = noteRepository.findTagsForNotes(noteIds)
    return notes.map { note ->
        val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
        note.toDto(tags)
    }
}

// Стало:
fun getAllNotesWithTags(): List<NoteDto> = noteDtoMapper.toDtoList(noteRepository.findAll())
```

---

## Файлы

### Файлы для создания (8 файлов)

| Файл | Назначение |
|------|------------|
| `domain/demo/DemoDataCleaner.kt` | Очистка демо-данных с проверкой безопасности |
| `domain/demo/DemoNoteBuilder.kt` | Создание демо-заметок |
| `domain/demo/DemoDatabaseBuilder.kt` | Создание демо-базы данных |
| `domain/database/ColumnService.kt` | Операции с колонками |
| `domain/database/RecordService.kt` | Операции с записями |
| `domain/reminder/ReminderCalendarSyncService.kt` | Синхронизация напоминаний с Google Calendar |
| `domain/storage/FileService.kt` | Бизнес-логика работы с файлами |
| `domain/note/NoteDtoMapper.kt` | Маппинг Note в NoteDto с тегами |
| `exception/DomainExceptions.kt` | Кастомные исключения домена |

### Файлы для модификации (7 файлов)

| Файл | Изменения |
|------|-----------|
| `domain/demo/DemoContentService.kt` | Упростить до оркестратора, убрать прямые зависимости от репозиториев |
| `domain/database/DatabaseService.kt` | Делегировать операции с колонками и записями новым сервисам |
| `domain/reminder/ReminderService.kt` | Использовать ReminderCalendarSyncService вместо прямой зависимости |
| `domain/tag/TagService.kt` | Добавить методы проверки владения тегами |
| `domain/tag/TagController.kt` | Убрать дублирующуюся логику проверки владения |
| `domain/storage/FileController.kt` | Делегировать бизнес-логику FileService |
| `domain/note/NoteService.kt` | Использовать NoteDtoMapper для устранения дублирования |

### Файлы для удаления

Нет файлов для удаления.

---

## Миграция и совместимость

**API контракт:** Без изменений. Все изменения внутренние, внешние API endpoints остаются прежними.

**Обратная совместимость:** DatabaseService сохраняет методы-делегаты для column и record операций, чтобы существующий код продолжал работать.

---

## Стратегия тестирования

### Ручное тестирование (тесты в проекте отсутствуют)

1. **Демо-режим:**
   - Зайти в демо-режим → проверить создание 5 заметок + 1 база данных
   - Перезайти в демо → проверить сброс данных
   - Проверить ссылки между заметками

2. **База данных:**
   - Создать базу данных
   - Добавить колонки разных типов
   - Создать/обновить/удалить записи

3. **Напоминания с Google Calendar:**
   - Создать напоминание с синхронизацией
   - Обновить напоминание → проверить обновление в календаре
   - Удалить напоминание → проверить удаление из календаря

4. **Теги:**
   - Получить тег другого пользователя → должен быть 403
   - Обновить/удалить чужой тег → должен быть 403

5. **Файлы:**
   - Загрузить файл → проверить генерацию UUID
   - Попытаться path traversal (`../etc/passwd`) → должна быть ошибка

### Компиляция и запуск

```bash
cd server
./gradlew build
./gradlew bootRun
```

---

## Оценка рисков

| Риск | Вероятность | Влияние | Митигация |
|------|-------------|---------|-----------|
| Нарушение демо-режима | Средняя | Среднее | Проверить порядок создания контента после рефакторинга |
| Регрессия синхронизации с Google Calendar | Средняя | Высокое | Тестировать полный цикл CRUD напоминаний |
| Циклические зависимости Spring beans | Низкая | Высокое | ColumnService и RecordService не зависят от DatabaseService |
| Потеря проверки владения тегами | Низкая | Высокое | Убедиться что TagService выбрасывает исключения |

---

## Порядок выполнения

1. **Фаза 1 (Критично):** Шаги 1.1 → 1.4 — декомпозиция DemoContentService
2. **Фаза 2 (Средне):** Шаги 2.1 → 2.3 — разделение DatabaseService
3. **Фаза 3 (Средне):** Шаги 3.1 → 3.2 — выделение ReminderCalendarSyncService
4. **Фаза 4 (Низко):** Шаги 4.1 → 4.3 — рефакторинг TagController
5. **Фаза 5 (Низко):** Шаги 5.1 → 5.2 — создание FileService
6. **Фаза 6 (Низко):** Шаги 6.1 → 6.2 — устранение дублирования в NoteService
7. **Финал:** Компиляция, запуск, ручное тестирование
