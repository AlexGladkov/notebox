package com.notebox.domain.folder

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class FolderRepository {

    fun findAll(userId: String): List<Folder> = transaction {
        FoldersTable.select { FoldersTable.userId eq userId }.map { toFolder(it) }
    }

    fun findById(id: String): Folder? = transaction {
        FoldersTable.select { FoldersTable.id eq id }
            .mapNotNull { toFolder(it) }
            .singleOrNull()
    }

    fun findByIdAndUserId(id: String, userId: String): Folder? = transaction {
        FoldersTable.select { (FoldersTable.id eq id) and (FoldersTable.userId eq userId) }
            .mapNotNull { toFolder(it) }
            .singleOrNull()
    }

    fun findByParentId(parentId: String?, userId: String): List<Folder> = transaction {
        if (parentId == null) {
            FoldersTable.select { (FoldersTable.parentId.isNull()) and (FoldersTable.userId eq userId) }
        } else {
            FoldersTable.select { (FoldersTable.parentId eq parentId) and (FoldersTable.userId eq userId) }
        }.map { toFolder(it) }
    }

    fun create(userId: String, name: String, parentId: String?): Folder = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        FoldersTable.insert {
            it[FoldersTable.id] = id
            it[FoldersTable.userId] = userId
            it[FoldersTable.name] = name
            it[FoldersTable.parentId] = parentId
            it[createdAt] = now
            it[updatedAt] = now
        }

        Folder(id, userId, name, parentId, now, now)
    }

    fun update(id: String, userId: String, name: String, parentId: String?): Folder? = transaction {
        val exists = FoldersTable.select { (FoldersTable.id eq id) and (FoldersTable.userId eq userId) }.any()
        if (!exists) return@transaction null

        val now = Instant.now()
        FoldersTable.update({ (FoldersTable.id eq id) and (FoldersTable.userId eq userId) }) {
            it[FoldersTable.name] = name
            it[FoldersTable.parentId] = parentId
            it[updatedAt] = now
        }

        findById(id)
    }

    fun delete(id: String, userId: String): Boolean = transaction {
        FoldersTable.deleteWhere { (FoldersTable.id eq id) and (FoldersTable.userId eq userId) } > 0
    }

    fun deleteByParentId(parentId: String, userId: String) = transaction {
        FoldersTable.deleteWhere { (FoldersTable.parentId eq parentId) and (FoldersTable.userId eq userId) }
    }

    private fun toFolder(row: ResultRow) = Folder(
        id = row[FoldersTable.id],
        userId = row[FoldersTable.userId],
        name = row[FoldersTable.name],
        parentId = row[FoldersTable.parentId],
        createdAt = row[FoldersTable.createdAt],
        updatedAt = row[FoldersTable.updatedAt]
    )
}
