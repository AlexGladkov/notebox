package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.RecordDto
import com.notebox.dto.SelectOptionDto
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
