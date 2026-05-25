package com.notebox.domain.demo

import com.notebox.domain.database.CustomDatabase
import com.notebox.domain.database.DatabaseService
import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import org.springframework.stereotype.Component

/**
 * Компонент для создания демо-базы данных с колонками и записями.
 * Отвечает только за создание структуры базы данных.
 */
@Component
class DemoDatabaseBuilder(
    private val databaseService: DatabaseService
) {
    fun createDemoDatabase(userId: String): CustomDatabase {
        val existingDatabases = databaseService.getAllDatabases(userId)
        val existingDemoDatabase = existingDatabases.find { it.name == DemoContentData.DATABASE_NAME }

        if (existingDemoDatabase != null) {
            return existingDemoDatabase
        }

        val (database, _) = databaseService.createDatabase(
            userId = userId,
            name = DemoContentData.DATABASE_NAME,
            folderId = null
        )

        val titleColumn = databaseService.addColumn(
            databaseId = database.id,
            userId = userId,
            name = "Название",
            type = ColumnType.TEXT,
            options = null,
            position = 0
        )

        val statusColumn = databaseService.addColumn(
            databaseId = database.id,
            userId = userId,
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
            userId = userId,
            name = "Приоритет",
            type = ColumnType.SELECT,
            options = listOf(
                SelectOptionDto(id = "low", label = "Низкий", color = "#D1D5DB"),
                SelectOptionDto(id = "medium", label = "Средний", color = "#FCD34D"),
                SelectOptionDto(id = "high", label = "Высокий", color = "#FCA5A5")
            ),
            position = 2
        )

        createDemoRecords(database.id, userId, titleColumn.id, statusColumn.id, priorityColumn.id)

        return database
    }

    private fun createDemoRecords(
        databaseId: String,
        userId: String,
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
                userId = userId,
                data = mapOf(
                    titleColumnId to title,
                    statusColumnId to status,
                    priorityColumnId to priority
                )
            )
        }
    }
}
