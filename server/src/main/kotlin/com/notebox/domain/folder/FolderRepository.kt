package com.notebox.domain.folder

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class FolderRepository {

    fun findAll(): List<Folder> = transaction {
        FoldersTable.selectAll().map { toFolder(it) }
    }

    fun findById(id: String): Folder? = transaction {
        FoldersTable.select { FoldersTable.id eq id }
            .mapNotNull { toFolder(it) }
            .singleOrNull()
    }

    fun findByParentId(parentId: String?): List<Folder> = transaction {
        if (parentId == null) {
            FoldersTable.select { FoldersTable.parentId.isNull() }
        } else {
            FoldersTable.select { FoldersTable.parentId eq parentId }
        }.map { toFolder(it) }
    }

    fun create(name: String, parentId: String?): Folder = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        FoldersTable.insert {
            it[FoldersTable.id] = id
            it[FoldersTable.name] = name
            it[FoldersTable.parentId] = parentId
            it[createdAt] = now
            it[updatedAt] = now
        }

        Folder(id, name, parentId, now, now)
    }

    fun update(id: String, name: String, parentId: String?): Folder? = transaction {
        val exists = FoldersTable.select { FoldersTable.id eq id }.count() > 0
        if (!exists) return@transaction null

        val now = Instant.now()
        FoldersTable.update({ FoldersTable.id eq id }) {
            it[FoldersTable.name] = name
            it[FoldersTable.parentId] = parentId
            it[updatedAt] = now
        }

        findById(id)
    }

    fun delete(id: String): Boolean = transaction {
        FoldersTable.deleteWhere { FoldersTable.id eq id } > 0
    }

    fun deleteByParentId(parentId: String) = transaction {
        FoldersTable.deleteWhere { FoldersTable.parentId eq parentId }
    }

    private fun toFolder(row: ResultRow) = Folder(
        id = row[FoldersTable.id],
        name = row[FoldersTable.name],
        parentId = row[FoldersTable.parentId],
        createdAt = row[FoldersTable.createdAt],
        updatedAt = row[FoldersTable.updatedAt]
    )
}
