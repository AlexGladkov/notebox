package com.notebox.domain.note

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.inList
import org.jetbrains.exposed.sql.transactions.transaction
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class NoteRepository {

    companion object {
        private val UTC_CALENDAR = Calendar.getInstance(TimeZone.getTimeZone("UTC"))
    }

    fun findAll(userId: String): List<Note> = transaction {
        NotesTable.select { NotesTable.userId eq userId }.map { toNote(it) }
    }

    fun findById(id: String): Note? = transaction {
        NotesTable.select { NotesTable.id eq id }
            .mapNotNull { toNote(it) }
            .singleOrNull()
    }

    fun findByIdAndUserId(id: String, userId: String): Note? = transaction {
        NotesTable.select { (NotesTable.id eq id) and (NotesTable.userId eq userId) }
            .mapNotNull { toNote(it) }
            .singleOrNull()
    }

    fun findRootNotes(userId: String): List<Note> = transaction {
        NotesTable.select { (NotesTable.parentId.isNull()) and (NotesTable.userId eq userId) }
            .map { toNote(it) }
    }

    fun create(
        userId: String,
        title: String,
        content: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50,
        color: String? = null
    ): Note = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        NotesTable.insert {
            it[NotesTable.id] = id
            it[NotesTable.userId] = userId
            it[NotesTable.title] = title
            it[NotesTable.content] = content
            it[NotesTable.parentId] = parentId
            it[NotesTable.icon] = icon
            it[NotesTable.backdropType] = backdropType
            it[NotesTable.backdropValue] = backdropValue
            it[NotesTable.backdropPositionY] = backdropPositionY ?: 50
            it[NotesTable.color] = color
            it[createdAt] = now
            it[updatedAt] = now
        }

        Note(id, userId, title, content, parentId, icon, backdropType, backdropValue, backdropPositionY, color, now, now)
    }

    fun update(
        id: String,
        userId: String,
        title: String,
        content: String,
        parentId: String? = null,
        icon: String? = null,
        backdropType: String? = null,
        backdropValue: String? = null,
        backdropPositionY: Int? = 50,
        color: String? = null
    ): Note? = transaction {
        val exists = NotesTable.select { (NotesTable.id eq id) and (NotesTable.userId eq userId) }.any()
        if (!exists) return@transaction null

        val now = Instant.now()
        NotesTable.update({ (NotesTable.id eq id) and (NotesTable.userId eq userId) }) {
            it[NotesTable.title] = title
            it[NotesTable.content] = content
            it[NotesTable.parentId] = parentId
            it[NotesTable.icon] = icon
            it[NotesTable.backdropType] = backdropType
            it[NotesTable.backdropValue] = backdropValue
            it[NotesTable.backdropPositionY] = backdropPositionY ?: 50
            it[NotesTable.color] = color
            it[updatedAt] = now
        }

        findById(id)
    }

    fun delete(id: String, userId: String): Boolean = transaction {
        NotesTable.deleteWhere { (NotesTable.id eq id) and (NotesTable.userId eq userId) } > 0
    }

    fun findByIds(ids: List<String>, userId: String): List<Note> = transaction {
        if (ids.isEmpty()) return@transaction emptyList()

        NotesTable.select { (NotesTable.id inList ids) and (NotesTable.userId eq userId) }
            .map { toNote(it) }
    }

    fun deleteByIds(ids: List<String>, userId: String): Int = transaction {
        if (ids.isEmpty()) return@transaction 0

        NotesTable.deleteWhere { (NotesTable.id inList ids) and (NotesTable.userId eq userId) }
    }

    fun findByParentId(parentId: String?, userId: String): List<Note> = transaction {
        if (parentId == null) {
            NotesTable.select { (NotesTable.parentId.isNull()) and (NotesTable.userId eq userId) }
                .map { toNote(it) }
        } else {
            NotesTable.select { (NotesTable.parentId eq parentId) and (NotesTable.userId eq userId) }
                .map { toNote(it) }
        }
    }

    fun findAllDescendants(noteId: String, userId: String): List<Note> = transaction {
        // Валидация UUID для предотвращения SQL injection
        UUID.fromString(noteId) // Throws IllegalArgumentException if invalid
        UUID.fromString(userId)

        val sql = """
            WITH RECURSIVE descendants AS (
                SELECT id, user_id, title, content, parent_id, icon, backdrop_type, backdrop_value,
                       backdrop_position_y, color, created_at, updated_at
                FROM notes
                WHERE parent_id = '$noteId' AND user_id = '$userId'

                UNION ALL

                SELECT n.id, n.user_id, n.title, n.content, n.parent_id, n.icon, n.backdrop_type,
                       n.backdrop_value, n.backdrop_position_y, n.color, n.created_at, n.updated_at
                FROM notes n
                INNER JOIN descendants d ON n.parent_id = d.id
                WHERE n.user_id = '$userId'
            )
            SELECT * FROM descendants
        """.trimIndent()

        val result = mutableListOf<Note>()
        val connection = TransactionManager.current().connection
        val statement = connection.prepareStatement(sql, false)
        val rs = statement.executeQuery()
        while (rs.next()) {
            result.add(toNoteFromResultSet(rs))
        }
        result
    }

    fun getDepth(noteId: String, userId: String): Int = transaction {
        // Валидация UUID для предотвращения SQL injection
        UUID.fromString(noteId) // Throws IllegalArgumentException if invalid
        UUID.fromString(userId)

        val sql = """
            WITH RECURSIVE ancestors AS (
                SELECT id, parent_id, user_id, 0 as depth
                FROM notes
                WHERE id = '$noteId' AND user_id = '$userId'

                UNION ALL

                SELECT n.id, n.parent_id, n.user_id, a.depth + 1
                FROM notes n
                INNER JOIN ancestors a ON n.id = a.parent_id
                WHERE n.user_id = '$userId'
            )
            SELECT MAX(depth) as max_depth FROM ancestors
        """.trimIndent()

        var result = 0
        val connection = TransactionManager.current().connection
        val statement = connection.prepareStatement(sql, false)
        val rs = statement.executeQuery()
        if (rs.next()) {
            result = rs.getInt("max_depth")
        }
        result
    }

    fun getAncestorPath(noteId: String, userId: String): List<Note> = transaction {
        // Валидация UUID для предотвращения SQL injection
        UUID.fromString(noteId) // Throws IllegalArgumentException if invalid
        UUID.fromString(userId)

        val sql = """
            WITH RECURSIVE ancestors AS (
                SELECT id, user_id, title, content, parent_id, icon, backdrop_type, backdrop_value,
                       backdrop_position_y, color, created_at, updated_at, 0 as depth
                FROM notes
                WHERE id = '$noteId' AND user_id = '$userId'

                UNION ALL

                SELECT n.id, n.user_id, n.title, n.content, n.parent_id, n.icon, n.backdrop_type,
                       n.backdrop_value, n.backdrop_position_y, n.color, n.created_at, n.updated_at,
                       a.depth + 1
                FROM notes n
                INNER JOIN ancestors a ON n.id = a.parent_id
                WHERE n.user_id = '$userId'
            )
            SELECT id, user_id, title, content, parent_id, icon, backdrop_type, backdrop_value,
                   backdrop_position_y, color, created_at, updated_at
            FROM ancestors ORDER BY depth DESC
        """.trimIndent()

        val result = mutableListOf<Note>()
        val connection = TransactionManager.current().connection
        val statement = connection.prepareStatement(sql, false)
        val rs = statement.executeQuery()
        while (rs.next()) {
            result.add(toNoteFromResultSet(rs))
        }
        result
    }

    fun updateParentId(noteId: String, userId: String, newParentId: String?): Boolean = transaction {
        val exists = NotesTable.select { (NotesTable.id eq noteId) and (NotesTable.userId eq userId) }.any()
        if (!exists) return@transaction false

        val now = Instant.now()
        NotesTable.update({ (NotesTable.id eq noteId) and (NotesTable.userId eq userId) }) {
            it[parentId] = newParentId
            it[updatedAt] = now
        }

        true
    }

    fun deleteByParentId(parentId: String, userId: String): Int = transaction {
        NotesTable.deleteWhere { (NotesTable.parentId eq parentId) and (NotesTable.userId eq userId) }
    }

    fun deleteWithDescendants(noteId: String, userId: String): Int = transaction {
        val descendants = findAllDescendants(noteId, userId)
        val allIds = listOf(noteId) + descendants.map { it.id }

        if (allIds.isEmpty()) return@transaction 0

        NotesTable.deleteWhere { (NotesTable.id inList allIds) and (NotesTable.userId eq userId) }
    }

    fun orphanChildren(noteId: String, userId: String): Int = transaction {
        val note = findByIdAndUserId(noteId, userId) ?: return@transaction 0
        val now = Instant.now()

        NotesTable.update({ (NotesTable.parentId eq noteId) and (NotesTable.userId eq userId) }) {
            it[parentId] = note.parentId
            it[updatedAt] = now
        }
    }

    /**
     * Удаляет ВСЕ заметки в системе.
     *
     * ВНИМАНИЕ: Используется только для сброса демо-данных!
     * Вызывается из DemoContentService.clearDemoData(), который содержит проверку безопасности:
     * - Убеждается, что в системе есть только демо-пользователь
     * - Выбрасывает исключение, если обнаружены реальные пользователи
     */
    fun deleteAll(): Int = transaction {
        NotesTable.deleteAll()
    }

    private fun toNote(row: ResultRow) = Note(
        id = row[NotesTable.id],
        userId = row[NotesTable.userId],
        title = row[NotesTable.title],
        content = row[NotesTable.content],
        parentId = row[NotesTable.parentId],
        icon = row[NotesTable.icon],
        backdropType = row[NotesTable.backdropType],
        backdropValue = row[NotesTable.backdropValue],
        backdropPositionY = row[NotesTable.backdropPositionY],
        color = row[NotesTable.color],
        createdAt = row[NotesTable.createdAt],
        updatedAt = row[NotesTable.updatedAt]
    )

    private fun toNoteFromResultSet(rs: java.sql.ResultSet) = Note(
        id = rs.getString("id"),
        userId = rs.getString("user_id"),
        title = rs.getString("title"),
        content = rs.getString("content"),
        parentId = rs.getString("parent_id"),  // getString возвращает null для SQL NULL
        icon = rs.getString("icon"),
        backdropType = rs.getString("backdrop_type"),
        backdropValue = rs.getString("backdrop_value"),
        backdropPositionY = rs.getObject("backdrop_position_y") as? Int,
        color = rs.getString("color"),
        createdAt = rs.getTimestamp("created_at", UTC_CALENDAR)?.toInstant() ?: Instant.now(),
        updatedAt = rs.getTimestamp("updated_at", UTC_CALENDAR)?.toInstant() ?: Instant.now()
    )
}
