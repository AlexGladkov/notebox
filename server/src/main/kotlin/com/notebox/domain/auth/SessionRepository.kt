package com.notebox.domain.auth

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.less
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class SessionRepository {

    fun findById(id: String): Session? = transaction {
        SessionsTable.select { SessionsTable.id eq id }
            .mapNotNull { toSession(it) }
            .singleOrNull()
    }

    fun findByUserId(userId: String): List<Session> = transaction {
        SessionsTable.select { SessionsTable.userId eq userId }
            .map { toSession(it) }
    }

    fun create(userId: String, expiresAt: Instant): Session = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        SessionsTable.insert {
            it[SessionsTable.id] = id
            it[SessionsTable.userId] = userId
            it[createdAt] = now
            it[SessionsTable.expiresAt] = expiresAt
        }

        Session(id, userId, now, expiresAt)
    }

    fun delete(id: String): Boolean = transaction {
        SessionsTable.deleteWhere { SessionsTable.id eq id } > 0
    }

    fun deleteByUserId(userId: String): Int = transaction {
        SessionsTable.deleteWhere { SessionsTable.userId eq userId }
    }

    fun deleteExpired(): Int = transaction {
        val now = Instant.now()
        SessionsTable.deleteWhere { expiresAt less now }
    }

    fun isValid(id: String): Boolean = transaction {
        val session = findById(id) ?: return@transaction false
        session.expiresAt.isAfter(Instant.now())
    }

    private fun toSession(row: ResultRow) = Session(
        id = row[SessionsTable.id],
        userId = row[SessionsTable.userId],
        createdAt = row[SessionsTable.createdAt],
        expiresAt = row[SessionsTable.expiresAt]
    )
}
