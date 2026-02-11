package com.notebox.domain.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object RecordsTable : Table("records") {
    val id = varchar("id", 36)
    val databaseId = varchar("database_id", 36).index()
    val data = text("data") // JSON string
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
