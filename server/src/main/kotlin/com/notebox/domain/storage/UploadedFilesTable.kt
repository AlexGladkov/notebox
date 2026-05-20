package com.notebox.domain.storage

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object UploadedFilesTable : Table("uploaded_files") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36)
    val s3Key = varchar("s3_key", 500)
    val filename = varchar("filename", 255)
    val contentType = varchar("content_type", 100).nullable()
    val size = long("size")
    val createdAt = timestamp("created_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}

data class UploadedFile(
    val id: String,
    val userId: String,
    val s3Key: String,
    val filename: String,
    val contentType: String?,
    val size: Long,
    val createdAt: Instant
)
