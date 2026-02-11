package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.RecordDto
import com.notebox.dto.SelectOptionDto
import org.springframework.stereotype.Service

@Service
class DatabaseService(
    private val databaseRepository: DatabaseRepository
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
        val columns = databaseRepository.findColumnsByDatabaseId(id)
        return database to columns
    }

    fun createDatabase(name: String, folderId: String?): Pair<CustomDatabase, List<Column>> {
        val database = databaseRepository.createDatabase(name, folderId)
        return database to emptyList()
    }

    fun updateDatabase(id: String, name: String, folderId: String?): Pair<CustomDatabase, List<Column>>? {
        val database = databaseRepository.updateDatabase(id, name, folderId) ?: return null
        val columns = databaseRepository.findColumnsByDatabaseId(id)
        return database to columns
    }

    fun deleteDatabase(id: String): Boolean {
        return databaseRepository.deleteDatabase(id)
    }

    // Column operations
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

    // Record operations
    fun getRecordsByDatabaseId(databaseId: String): List<RecordDto> {
        return databaseRepository.findRecordsByDatabaseId(databaseId).map { record ->
            RecordDto(
                id = record.id,
                databaseId = record.databaseId,
                data = record.data,
                createdAt = record.createdAt.toEpochMilli(),
                updatedAt = record.updatedAt.toEpochMilli()
            )
        }
    }

    fun getRecordById(id: String): RecordDto? {
        val record = databaseRepository.findRecordById(id) ?: return null
        return RecordDto(
            id = record.id,
            databaseId = record.databaseId,
            data = record.data,
            createdAt = record.createdAt.toEpochMilli(),
            updatedAt = record.updatedAt.toEpochMilli()
        )
    }

    fun createRecord(databaseId: String, data: Map<String, Any?>): RecordDto {
        val record = databaseRepository.createRecord(databaseId, data)
        return RecordDto(
            id = record.id,
            databaseId = record.databaseId,
            data = record.data,
            createdAt = record.createdAt.toEpochMilli(),
            updatedAt = record.updatedAt.toEpochMilli()
        )
    }

    fun updateRecord(id: String, data: Map<String, Any?>): RecordDto? {
        val record = databaseRepository.updateRecord(id, data) ?: return null
        return RecordDto(
            id = record.id,
            databaseId = record.databaseId,
            data = record.data,
            createdAt = record.createdAt.toEpochMilli(),
            updatedAt = record.updatedAt.toEpochMilli()
        )
    }

    fun deleteRecord(id: String): Boolean {
        return databaseRepository.deleteRecord(id)
    }
}
