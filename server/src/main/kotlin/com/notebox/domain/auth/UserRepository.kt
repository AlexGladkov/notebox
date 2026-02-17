package com.notebox.domain.auth

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class UserRepository {

    fun findAll(): List<User> = transaction {
        UsersTable.selectAll().map { toUser(it) }
    }

    fun findById(id: String): User? = transaction {
        UsersTable.select { UsersTable.id eq id }
            .mapNotNull { toUser(it) }
            .singleOrNull()
    }

    fun findByEmail(email: String): User? = transaction {
        UsersTable.select { UsersTable.email eq email }
            .mapNotNull { toUser(it) }
            .singleOrNull()
    }

    fun create(
        email: String,
        name: String,
        avatarUrl: String?
    ): User = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        UsersTable.insert {
            it[UsersTable.id] = id
            it[UsersTable.email] = email
            it[UsersTable.name] = name
            it[UsersTable.avatarUrl] = avatarUrl
            it[createdAt] = now
            it[updatedAt] = now
        }

        User(id, email, name, avatarUrl, now, now)
    }

    fun update(
        id: String,
        email: String? = null,
        name: String? = null,
        avatarUrl: String? = null
    ): User? = transaction {
        val existing = findById(id) ?: return@transaction null
        val now = Instant.now()

        UsersTable.update({ UsersTable.id eq id }) {
            if (email != null) it[UsersTable.email] = email
            if (name != null) it[UsersTable.name] = name
            if (avatarUrl != null) it[UsersTable.avatarUrl] = avatarUrl
            it[updatedAt] = now
        }

        findById(id)
    }

    fun delete(id: String): Boolean = transaction {
        UsersTable.deleteWhere { UsersTable.id eq id } > 0
    }

    private fun toUser(row: ResultRow) = User(
        id = row[UsersTable.id],
        email = row[UsersTable.email],
        name = row[UsersTable.name],
        avatarUrl = row[UsersTable.avatarUrl],
        createdAt = row[UsersTable.createdAt],
        updatedAt = row[UsersTable.updatedAt]
    )
}
