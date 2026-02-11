package com.notebox.domain.folder

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object FoldersTable : Table("folders") {
    val id = varchar("id", 36)
    val name = varchar("name", 255)
    val parentId = varchar("parent_id", 36).nullable()
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
