package com.notebox.domain.note

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object NotesTable : Table("notes") {
    val id = varchar("id", 36)
    val title = varchar("title", 500)
    val content = text("content")
    val folderId = varchar("folder_id", 36).index()
    val icon = varchar("icon", 50).nullable()
    val backdropType = varchar("backdrop_type", 20).nullable()
    val backdropValue = text("backdrop_value").nullable()
    val backdropPositionY = integer("backdrop_position_y").default(50)
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
