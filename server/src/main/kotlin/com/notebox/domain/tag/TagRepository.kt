package com.notebox.domain.tag

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class TagRepository {

    fun findAllByUserId(userId: String): List<Tag> = transaction {
        TagsTable.select { TagsTable.userId eq userId }
            .map { toTag(it) }
    }

    fun findById(id: String): Tag? = transaction {
        TagsTable.select { TagsTable.id eq id }
            .mapNotNull { toTag(it) }
            .singleOrNull()
    }

    fun findByUserIdAndName(userId: String, name: String): Tag? = transaction {
        TagsTable.select {
            (TagsTable.userId eq userId) and (TagsTable.name.lowerCase() eq name.lowercase())
        }
            .mapNotNull { toTag(it) }
            .singleOrNull()
    }

    fun create(userId: String, name: String, color: String): Tag = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        TagsTable.insert {
            it[TagsTable.id] = id
            it[TagsTable.userId] = userId
            it[TagsTable.name] = name
            it[TagsTable.color] = color
            it[createdAt] = now
        }

        Tag(id, userId, name, color, now)
    }

    fun update(id: String, name: String?, color: String?): Tag? = transaction {
        val exists = TagsTable.select { TagsTable.id eq id }.any()
        if (!exists) return@transaction null

        TagsTable.update({ TagsTable.id eq id }) {
            if (name != null) it[TagsTable.name] = name
            if (color != null) it[TagsTable.color] = color
        }

        findById(id)
    }

    fun delete(id: String): Boolean = transaction {
        TagsTable.deleteWhere { TagsTable.id eq id } > 0
    }

    fun findTagsByNoteId(noteId: String): List<Tag> = transaction {
        (TagsTable innerJoin NoteTagsTable)
            .select { NoteTagsTable.noteId eq noteId }
            .map { toTag(it) }
    }

    fun setNoteTags(noteId: String, tagIds: List<String>): Unit = transaction {
        // Удаляем существующие связи
        NoteTagsTable.deleteWhere { NoteTagsTable.noteId eq noteId }

        // Добавляем новые связи
        tagIds.forEach { tagId ->
            NoteTagsTable.insert {
                it[NoteTagsTable.noteId] = noteId
                it[NoteTagsTable.tagId] = tagId
            }
        }
    }

    fun removeTagFromNote(noteId: String, tagId: String): Boolean = transaction {
        NoteTagsTable.deleteWhere {
            (NoteTagsTable.noteId eq noteId) and (NoteTagsTable.tagId eq tagId)
        } > 0
    }

    private fun toTag(row: ResultRow) = Tag(
        id = row[TagsTable.id],
        userId = row[TagsTable.userId],
        name = row[TagsTable.name],
        color = row[TagsTable.color],
        createdAt = row[TagsTable.createdAt]
    )
}
