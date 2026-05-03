package com.notebox.domain.tag

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object TagsTable : Table("tags") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36).index()
    val name = varchar("name", 100)
    val color = varchar("color", 20).default("#e5e7eb")
    val createdAt = timestamp("created_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
