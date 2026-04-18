package com.notebox.domain.demo

import com.notebox.domain.database.DatabaseRepository
import com.notebox.domain.database.DatabaseService
import com.notebox.domain.note.NoteRepository
import com.notebox.domain.note.NoteService
import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Сервис для создания и управления демо-контентом.
 * Используется для демонстрации возможностей платформы в демо-режиме.
 */
@Service
class DemoContentService(
    private val noteService: NoteService,
    private val noteRepository: NoteRepository,
    private val databaseService: DatabaseService,
    private val databaseRepository: DatabaseRepository
) {
    private val logger = LoggerFactory.getLogger(DemoContentService::class.java)

    /**
     * Очищает все демо-данные (заметки и базы данных)
     *
     * ВНИМАНИЕ: Этот метод удаляет ВСЕ заметки и базы данных в системе!
     * Это безопасно только если:
     * - Система используется исключительно в демо-режиме, ИЛИ
     * - Система является однопользовательской (self-hosted)
     *
     * Если в системе есть обычные пользователи через OAuth, этот метод удалит их данные!
     */
    fun clearDemoData() {
        logger.info("Clearing demo data...")
        try {
            // Удаляем в правильном порядке: сначала базы данных (с каскадным удалением), потом заметки
            databaseRepository.deleteAllDatabases()
            noteRepository.deleteAll()
            logger.info("Demo data cleared successfully")
        } catch (e: Exception) {
            logger.error("Error clearing demo data", e)
            throw e
        }
    }

    /**
     * Создаёт предустановленный демо-контент
     */
    fun createDemoContent() {
        logger.info("Creating demo content...")
        try {
            // Phase 1: Создаём все заметки с временным контентом
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

            // Phase 2: Создаём базу данных "Мои задачи"
            val (database, _) = databaseService.createDatabase(
                name = DemoContentData.DATABASE_NAME,
                folderId = null
            )

            // Создаём колонки для базы данных
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

            // Создаём записи в базе данных
            databaseService.createRecord(
                databaseId = database.id,
                data = mapOf(
                    titleColumn.id to "Подготовить презентацию",
                    statusColumn.id to "in-progress",
                    priorityColumn.id to "high"
                )
            )

            databaseService.createRecord(
                databaseId = database.id,
                data = mapOf(
                    titleColumn.id to "Ответить на письма",
                    statusColumn.id to "todo",
                    priorityColumn.id to "medium"
                )
            )

            databaseService.createRecord(
                databaseId = database.id,
                data = mapOf(
                    titleColumn.id to "Обновить документацию",
                    statusColumn.id to "done",
                    priorityColumn.id to "low"
                )
            )

            databaseService.createRecord(
                databaseId = database.id,
                data = mapOf(
                    titleColumn.id to "Созвон с командой",
                    statusColumn.id to "todo",
                    priorityColumn.id to "high"
                )
            )

            // Phase 3: Обновляем контент Dashboard и Work Notes с правильными ссылками
            val dashboardContent = DemoContentData.getDashboardContent()
                .replace("{{GOALS_ID}}", goalsNote.id)
                .replace("{{IDEAS_ID}}", ideasNote.id)
                .replace("{{NOTES_ID}}", workNotesNote.id)
                .replace("{{DATABASE_ID}}", database.id)

            noteService.updateNote(
                id = dashboardNote.id,
                title = dashboardNote.title,
                content = dashboardContent,
                icon = dashboardNote.icon
            )

            val workNotesContent = DemoContentData.getNotesContent()
                .replace("{{CONTACTS_ID}}", contactsNote.id)

            noteService.updateNote(
                id = workNotesNote.id,
                title = workNotesNote.title,
                content = workNotesContent,
                icon = workNotesNote.icon
            )

            logger.info("Demo content created successfully: " +
                    "5 notes, 1 database with 4 records")
        } catch (e: Exception) {
            logger.error("Error creating demo content", e)
            // В случае ошибки откатываемся к пустому состоянию
            clearDemoData()
            throw e
        }
    }
}
