package com.notebox.domain.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object ColumnsTable : Table("columns") {
    val id = varchar("id", 36)
    val databaseId = varchar("database_id", 36)
    val name = varchar("name", 255)
    val type = varchar("type", 50)
    val options = text("options").nullable() // JSON string
    val position = integer("position")
    val createdAt = timestamp("created_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
