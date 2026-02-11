package com.notebox.domain.database

import com.notebox.dto.ColumnType
import com.notebox.dto.SelectOptionDto
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class DatabaseRepository {

    // CustomDatabase operations
    fun findAllDatabases(): List<CustomDatabase> = transaction {
        CustomDatabasesTable.selectAll().map { toDatabase(it) }
    }

    fun findDatabaseById(id: String): CustomDatabase? = transaction {
        CustomDatabasesTable.select { CustomDatabasesTable.id eq id }
            .mapNotNull { toDatabase(it) }
            .singleOrNull()
    }

    fun createDatabase(name: String, folderId: String?): CustomDatabase = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        CustomDatabasesTable.insert {
            it[CustomDatabasesTable.id] = id
            it[CustomDatabasesTable.name] = name
            it[CustomDatabasesTable.folderId] = folderId
            it[createdAt] = now
            it[updatedAt] = now
        }

        CustomDatabase(id, name, folderId, now, now)
    }

    fun updateDatabase(id: String, name: String, folderId: String?): CustomDatabase? = transaction {
        val exists = CustomDatabasesTable.select { CustomDatabasesTable.id eq id }.count() > 0
        if (!exists) return@transaction null

        val now = Instant.now()
        CustomDatabasesTable.update({ CustomDatabasesTable.id eq id }) {
            it[CustomDatabasesTable.name] = name
            it[CustomDatabasesTable.folderId] = folderId
            it[updatedAt] = now
        }

        findDatabaseById(id)
    }

    fun deleteDatabase(id: String): Boolean = transaction {
        CustomDatabasesTable.deleteWhere { CustomDatabasesTable.id eq id } > 0
    }

    // Column operations
    fun findColumnsByDatabaseId(databaseId: String): List<Column> = transaction {
        ColumnsTable.select { ColumnsTable.databaseId eq databaseId }
            .orderBy(ColumnsTable.position)
            .map { toColumn(it) }
    }

    fun findColumnById(id: String): Column? = transaction {
        ColumnsTable.select { ColumnsTable.id eq id }
            .mapNotNull { toColumn(it) }
            .singleOrNull()
    }

    fun createColumn(
        databaseId: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        ColumnsTable.insert {
            it[ColumnsTable.id] = id
            it[ColumnsTable.databaseId] = databaseId
            it[ColumnsTable.name] = name
            it[ColumnsTable.type] = type.name
            it[ColumnsTable.options] = serializeOptions(options)
            it[ColumnsTable.position] = position
            it[createdAt] = now
        }

        Column(id, databaseId, name, type, options, position, now)
    }

    fun updateColumn(
        id: String,
        name: String,
        type: ColumnType,
        options: List<SelectOptionDto>?,
        position: Int
    ): Column? = transaction {
        val exists = ColumnsTable.select { ColumnsTable.id eq id }.count() > 0
        if (!exists) return@transaction null

        ColumnsTable.update({ ColumnsTable.id eq id }) {
            it[ColumnsTable.name] = name
            it[ColumnsTable.type] = type.name
            it[ColumnsTable.options] = serializeOptions(options)
            it[ColumnsTable.position] = position
        }

        findColumnById(id)
    }

    fun deleteColumn(id: String): Boolean = transaction {
        ColumnsTable.deleteWhere { ColumnsTable.id eq id } > 0
    }

    // Record operations
    fun findRecordsByDatabaseId(databaseId: String): List<Record> = transaction {
        RecordsTable.select { RecordsTable.databaseId eq databaseId }
            .map { toRecord(it) }
    }

    fun findRecordById(id: String): Record? = transaction {
        RecordsTable.select { RecordsTable.id eq id }
            .mapNotNull { toRecord(it) }
            .singleOrNull()
    }

    fun createRecord(databaseId: String, data: Map<String, Any?>): Record = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        RecordsTable.insert {
            it[RecordsTable.id] = id
            it[RecordsTable.databaseId] = databaseId
            it[RecordsTable.data] = serializeData(data)
            it[createdAt] = now
            it[updatedAt] = now
        }

        Record(id, databaseId, data, now, now)
    }

    fun updateRecord(id: String, data: Map<String, Any?>): Record? = transaction {
        val exists = RecordsTable.select { RecordsTable.id eq id }.count() > 0
        if (!exists) return@transaction null

        val now = Instant.now()
        RecordsTable.update({ RecordsTable.id eq id }) {
            it[RecordsTable.data] = serializeData(data)
            it[updatedAt] = now
        }

        findRecordById(id)
    }

    fun deleteRecord(id: String): Boolean = transaction {
        RecordsTable.deleteWhere { RecordsTable.id eq id } > 0
    }

    // Helper methods
    private fun toDatabase(row: ResultRow) = CustomDatabase(
        id = row[CustomDatabasesTable.id],
        name = row[CustomDatabasesTable.name],
        folderId = row[CustomDatabasesTable.folderId],
        createdAt = row[CustomDatabasesTable.createdAt],
        updatedAt = row[CustomDatabasesTable.updatedAt]
    )

    private fun toColumn(row: ResultRow) = Column(
        id = row[ColumnsTable.id],
        databaseId = row[ColumnsTable.databaseId],
        name = row[ColumnsTable.name],
        type = ColumnType.valueOf(row[ColumnsTable.type]),
        options = deserializeOptions(row[ColumnsTable.options]),
        position = row[ColumnsTable.position],
        createdAt = row[ColumnsTable.createdAt]
    )

    private fun toRecord(row: ResultRow) = Record(
        id = row[RecordsTable.id],
        databaseId = row[RecordsTable.databaseId],
        data = deserializeData(row[RecordsTable.data]),
        createdAt = row[RecordsTable.createdAt],
        updatedAt = row[RecordsTable.updatedAt]
    )
}
