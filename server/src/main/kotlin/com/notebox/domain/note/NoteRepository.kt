package com.notebox.domain.note

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class NoteRepository {

    fun findAll(): List<Note> = transaction {
        NotesTable.selectAll().map { toNote(it) }
    }

    fun findById(id: String): Note? = transaction {
        NotesTable.select { NotesTable.id eq id }
            .mapNotNull { toNote(it) }
            .singleOrNull()
    }

    fun findByFolderId(folderId: String): List<Note> = transaction {
        NotesTable.select { NotesTable.folderId eq folderId }
            .map { toNote(it) }
    }

    fun create(
        title: String,
        content: String,
        folderId: String,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int = 50
    ): Note = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        NotesTable.insert {
            it[NotesTable.id] = id
            it[NotesTable.title] = title
            it[NotesTable.content] = content
            it[NotesTable.folderId] = folderId
            it[NotesTable.icon] = icon
            it[NotesTable.backdropType] = backdropType
            it[NotesTable.backdropValue] = backdropValue
            it[NotesTable.backdropPositionY] = backdropPositionY
            it[createdAt] = now
            it[updatedAt] = now
        }

        Note(id, title, content, folderId, icon, backdropType, backdropValue, backdropPositionY, now, now)
    }

    fun update(
        id: String,
        title: String,
        content: String,
        folderId: String,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int = 50
    ): Note? = transaction {
        val exists = NotesTable.select { NotesTable.id eq id }.count() > 0
        if (!exists) return@transaction null

        val now = Instant.now()
        NotesTable.update({ NotesTable.id eq id }) {
            it[NotesTable.title] = title
            it[NotesTable.content] = content
            it[NotesTable.folderId] = folderId
            it[NotesTable.icon] = icon
            it[NotesTable.backdropType] = backdropType
            it[NotesTable.backdropValue] = backdropValue
            it[NotesTable.backdropPositionY] = backdropPositionY
            it[updatedAt] = now
        }

        findById(id)
    }

    fun delete(id: String): Boolean = transaction {
        NotesTable.deleteWhere { NotesTable.id eq id } > 0
    }

    fun deleteByFolderId(folderId: String) = transaction {
        NotesTable.deleteWhere { NotesTable.folderId eq folderId }
    }

    private fun toNote(row: ResultRow) = Note(
        id = row[NotesTable.id],
        title = row[NotesTable.title],
        content = row[NotesTable.content],
        folderId = row[NotesTable.folderId],
        icon = row[NotesTable.icon],
        backdropType = row[NotesTable.backdropType],
        backdropValue = row[NotesTable.backdropValue],
        backdropPositionY = row[NotesTable.backdropPositionY],
        createdAt = row[NotesTable.createdAt],
        updatedAt = row[NotesTable.updatedAt]
    )
}
