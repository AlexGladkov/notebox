package com.notebox.domain.database

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object FilesTable : Table("files") {
    val id = varchar("id", 36)
    val recordId = varchar("record_id", 36)
    val columnId = varchar("column_id", 36)
    val filename = varchar("filename", 255)
    val s3Key = varchar("s3_key", 500)
    val contentType = varchar("content_type", 100).nullable()
    val size = long("size")
    val createdAt = timestamp("created_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
