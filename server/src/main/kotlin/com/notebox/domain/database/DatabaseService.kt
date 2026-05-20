package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.RecordDto
import com.notebox.dto.SelectOptionDto
import com.notebox.exception.AccessDeniedException
import org.springframework.stereotype.Service

/**
 * Сервис для управления пользовательскими базами данных.
 * Отвечает только за операции с CustomDatabase, делегирует операции с колонками и записями.
 */
@Service
class DatabaseService(
    private val databaseRepository: DatabaseRepository,
    private val columnService: ColumnService,
    private val recordService: RecordService
) {

    // CustomDatabase operations
    fun getAllDatabases(userId: String): List<CustomDatabase> {
        return databaseRepository.findAllDatabases(userId)
    }

    fun getAllDatabasesWithColumns(userId: String): List<Pair<CustomDatabase, List<Column>>> {
        return databaseRepository.findAllDatabasesWithColumns(userId)
    }

    fun getDatabaseById(id: String, userId: String): Pair<CustomDatabase, List<Column>>? {
        val database = databaseRepository.findDatabaseByIdAndUserId(id, userId) ?: return null
        val columns = columnService.getColumnsByDatabaseId(id, userId)
        return database to columns
    }

    fun createDatabase(userId: String, name: String, folderId: String?): Pair<CustomDatabase, List<Column>> {
        val database = databaseRepository.createDatabase(userId, name, folderId)
        return database to emptyList()
    }

    fun updateDatabase(id: String, userId: String, name: String, folderId: String?): Pair<CustomDatabase, List<Column>>? {
        val database = databaseRepository.updateDatabase(id, userId, name, folderId) ?: return null
        val columns = columnService.getColumnsByDatabaseId(id, userId)
        return database to columns
    }

    fun deleteDatabase(id: String, userId: String): Boolean {
        return databaseRepository.deleteDatabase(id, userId)
    }

    fun verifyDatabaseOwnership(databaseId: String, userId: String) {
        databaseRepository.findDatabaseByIdAndUserId(databaseId, userId)
            ?: throw AccessDeniedException("Access denied to database: $databaseId")
    }

    // Делегация к ColumnService (для обратной совместимости)
    fun addColumn(
        databaseId: String,
        userId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column = columnService.addColumn(databaseId, userId, name, type, options, position)

    fun updateColumn(
        id: String,
        userId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column? = columnService.updateColumn(id, userId, name, type, options, position)

    fun deleteColumn(id: String, userId: String): Boolean = columnService.deleteColumn(id, userId)

    // Делегация к RecordService (для обратной совместимости)
    fun getRecordsByDatabaseId(databaseId: String, userId: String): List<RecordDto> =
        recordService.getRecordsByDatabaseId(databaseId, userId)

    fun getRecordById(id: String, userId: String): RecordDto? = recordService.getRecordById(id, userId)

    fun createRecord(databaseId: String, userId: String, data: Map<String, Any?>): RecordDto =
        recordService.createRecord(databaseId, userId, data)

    fun updateRecord(id: String, userId: String, data: Map<String, Any?>): RecordDto? =
        recordService.updateRecord(id, userId, data)

    fun deleteRecord(id: String, userId: String): Boolean = recordService.deleteRecord(id, userId)
}
