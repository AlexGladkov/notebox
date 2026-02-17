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
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        NotesTable.insert {
            it[NotesTable.id] = id
            it[NotesTable.title] = title
            it[NotesTable.content] = content
            it[NotesTable.folderId] = folderId
            it[NotesTable.parentId] = parentId
            it[NotesTable.icon] = icon
            it[NotesTable.backdropType] = backdropType
            it[NotesTable.backdropValue] = backdropValue
            it[NotesTable.backdropPositionY] = backdropPositionY ?: 50
            it[createdAt] = now
            it[updatedAt] = now
        }

        Note(id, title, content, folderId, parentId, icon, backdropType, backdropValue, backdropPositionY, now, now)
    }

    fun update(
        id: String,
        title: String,
        content: String,
        folderId: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50
    ): Note? = transaction {
        val exists = NotesTable.select { NotesTable.id eq id }.count() > 0
        if (!exists) return@transaction null

        val now = Instant.now()
        NotesTable.update({ NotesTable.id eq id }) {
            it[NotesTable.title] = title
            it[NotesTable.content] = content
            it[NotesTable.folderId] = folderId
            it[NotesTable.parentId] = parentId
            it[NotesTable.icon] = icon
            it[NotesTable.backdropType] = backdropType
            it[NotesTable.backdropValue] = backdropValue
            it[NotesTable.backdropPositionY] = backdropPositionY ?: 50
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

    fun findByParentId(parentId: String?): List<Note> = transaction {
        if (parentId == null) {
            NotesTable.select { NotesTable.parentId.isNull() }
                .map { toNote(it) }
        } else {
            NotesTable.select { NotesTable.parentId eq parentId }
                .map { toNote(it) }
        }
    }

    fun findAllDescendants(noteId: String): List<Note> = transaction {
        val descendants = mutableListOf<Note>()
        val queue = mutableListOf(noteId)

        while (queue.isNotEmpty()) {
            val currentId = queue.removeAt(0)
            val children = findByParentId(currentId)
            descendants.addAll(children)
            queue.addAll(children.map { it.id })
        }

        descendants
    }

    fun getDepth(noteId: String): Int = transaction {
        var depth = 0
        var currentId: String? = noteId

        while (currentId != null) {
            val note = findById(currentId) ?: break
            currentId = note.parentId
            if (currentId != null) depth++
        }

        depth
    }

    fun getAncestorPath(noteId: String): List<Note> = transaction {
        val path = mutableListOf<Note>()
        var currentId: String? = noteId

        while (currentId != null) {
            val note = findById(currentId) ?: break
            path.add(0, note)
            currentId = note.parentId
        }

        path
    }

    fun updateParentId(noteId: String, newParentId: String?): Boolean = transaction {
        val exists = NotesTable.select { NotesTable.id eq noteId }.count() > 0
        if (!exists) return@transaction false

        val now = Instant.now()
        NotesTable.update({ NotesTable.id eq noteId }) {
            it[parentId] = newParentId
            it[updatedAt] = now
        }

        true
    }

    fun deleteWithDescendants(noteId: String): Int = transaction {
        val descendants = findAllDescendants(noteId)
        val allIds = listOf(noteId) + descendants.map { it.id }
        NotesTable.deleteWhere { NotesTable.id inList allIds }
    }

    fun orphanChildren(noteId: String): Int = transaction {
        val note = findById(noteId) ?: return@transaction 0
        val children = findByParentId(noteId)

        val now = Instant.now()
        children.forEach { child ->
            NotesTable.update({ NotesTable.id eq child.id }) {
                it[parentId] = note.parentId
                it[updatedAt] = now
            }
        }

        children.size
    }

    private fun toNote(row: ResultRow) = Note(
        id = row[NotesTable.id],
        title = row[NotesTable.title],
        content = row[NotesTable.content],
        folderId = row[NotesTable.folderId],
        parentId = row[NotesTable.parentId],
        icon = row[NotesTable.icon],
        backdropType = row[NotesTable.backdropType],
        backdropValue = row[NotesTable.backdropValue],
        backdropPositionY = row[NotesTable.backdropPositionY],
        createdAt = row[NotesTable.createdAt],
        updatedAt = row[NotesTable.updatedAt]
    )
}
