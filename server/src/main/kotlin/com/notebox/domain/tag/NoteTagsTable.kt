package com.notebox.domain.tag

import com.notebox.domain.note.NotesTable
import org.jetbrains.exposed.sql.Table

object NoteTagsTable : Table("note_tags") {
    val noteId = varchar("note_id", 36).references(NotesTable.id).index()
    val tagId = varchar("tag_id", 36).references(TagsTable.id).index()

    override val primaryKey = PrimaryKey(noteId, tagId)
}
