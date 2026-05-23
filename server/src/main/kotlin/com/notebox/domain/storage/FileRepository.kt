package com.notebox.domain.storage

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class FileRepository {

    fun create(
        id: String,
        userId: String,
        s3Key: String,
        filename: String,
        contentType: String?,
        size: Long
    ): UploadedFile = transaction {
        val now = Instant.now()

        UploadedFilesTable.insert {
            it[UploadedFilesTable.id] = id
            it[UploadedFilesTable.userId] = userId
            it[UploadedFilesTable.s3Key] = s3Key
            it[UploadedFilesTable.filename] = filename
            it[UploadedFilesTable.contentType] = contentType
            it[UploadedFilesTable.size] = size
            it[createdAt] = now
        }

        UploadedFile(id, userId, s3Key, filename, contentType, size, now)
    }

    fun findByS3Key(s3Key: String): UploadedFile? = transaction {
        UploadedFilesTable
            .select { UploadedFilesTable.s3Key eq s3Key }
            .mapNotNull { toUploadedFile(it) }
            .singleOrNull()
    }

    fun findByS3KeyAndUserId(s3Key: String, userId: String): UploadedFile? = transaction {
        UploadedFilesTable
            .select { (UploadedFilesTable.s3Key eq s3Key) and (UploadedFilesTable.userId eq userId) }
            .mapNotNull { toUploadedFile(it) }
            .singleOrNull()
    }

    fun deleteByS3Key(s3Key: String, userId: String): Boolean = transaction {
        UploadedFilesTable.deleteWhere {
            (UploadedFilesTable.s3Key eq s3Key) and (UploadedFilesTable.userId eq userId)
        } > 0
    }

    fun deleteAllByUserId(userId: String): Int = transaction {
        UploadedFilesTable.deleteWhere { UploadedFilesTable.userId eq userId }
    }

    private fun toUploadedFile(row: ResultRow): UploadedFile {
        return UploadedFile(
            id = row[UploadedFilesTable.id],
            userId = row[UploadedFilesTable.userId],
            s3Key = row[UploadedFilesTable.s3Key],
            filename = row[UploadedFilesTable.filename],
            contentType = row[UploadedFilesTable.contentType],
            size = row[UploadedFilesTable.size],
            createdAt = row[UploadedFilesTable.createdAt]
        )
    }
}
