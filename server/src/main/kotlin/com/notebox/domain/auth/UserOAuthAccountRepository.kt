package com.notebox.domain.auth

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class UserOAuthAccountRepository {

    fun findById(id: String): UserOAuthAccount? = transaction {
        UserOAuthAccountsTable.select { UserOAuthAccountsTable.id eq id }
            .mapNotNull { toUserOAuthAccount(it) }
            .singleOrNull()
    }

    fun findByUserId(userId: String): List<UserOAuthAccount> = transaction {
        UserOAuthAccountsTable.select { UserOAuthAccountsTable.userId eq userId }
            .map { toUserOAuthAccount(it) }
    }

    fun findByProvider(provider: String, providerUserId: String): UserOAuthAccount? = transaction {
        UserOAuthAccountsTable.select {
            (UserOAuthAccountsTable.provider eq provider) and
            (UserOAuthAccountsTable.providerUserId eq providerUserId)
        }
            .mapNotNull { toUserOAuthAccount(it) }
            .singleOrNull()
    }

    fun create(
        userId: String,
        provider: String,
        providerUserId: String,
        accessToken: String,
        refreshToken: String?,
        expiresAt: Instant?
    ): UserOAuthAccount = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        UserOAuthAccountsTable.insert {
            it[UserOAuthAccountsTable.id] = id
            it[UserOAuthAccountsTable.userId] = userId
            it[UserOAuthAccountsTable.provider] = provider
            it[UserOAuthAccountsTable.providerUserId] = providerUserId
            it[UserOAuthAccountsTable.accessToken] = accessToken
            it[UserOAuthAccountsTable.refreshToken] = refreshToken
            it[UserOAuthAccountsTable.expiresAt] = expiresAt
            it[createdAt] = now
            it[updatedAt] = now
        }

        UserOAuthAccount(id, userId, provider, providerUserId, accessToken, refreshToken, expiresAt, now, now)
    }

    fun updateTokens(
        id: String,
        accessToken: String,
        refreshToken: String?,
        expiresAt: Instant?
    ): UserOAuthAccount? = transaction {
        val exists = UserOAuthAccountsTable.select { UserOAuthAccountsTable.id eq id }.any()
        if (!exists) return@transaction null

        val now = Instant.now()
        UserOAuthAccountsTable.update({ UserOAuthAccountsTable.id eq id }) {
            it[UserOAuthAccountsTable.accessToken] = accessToken
            if (refreshToken != null) it[UserOAuthAccountsTable.refreshToken] = refreshToken
            it[UserOAuthAccountsTable.expiresAt] = expiresAt
            it[updatedAt] = now
        }

        findById(id)
    }

    fun delete(id: String): Boolean = transaction {
        UserOAuthAccountsTable.deleteWhere { UserOAuthAccountsTable.id eq id } > 0
    }

    fun deleteByUserId(userId: String): Int = transaction {
        UserOAuthAccountsTable.deleteWhere { UserOAuthAccountsTable.userId eq userId }
    }

    private fun toUserOAuthAccount(row: ResultRow) = UserOAuthAccount(
        id = row[UserOAuthAccountsTable.id],
        userId = row[UserOAuthAccountsTable.userId],
        provider = row[UserOAuthAccountsTable.provider],
        providerUserId = row[UserOAuthAccountsTable.providerUserId],
        accessToken = row[UserOAuthAccountsTable.accessToken],
        refreshToken = row[UserOAuthAccountsTable.refreshToken],
        expiresAt = row[UserOAuthAccountsTable.expiresAt],
        createdAt = row[UserOAuthAccountsTable.createdAt],
        updatedAt = row[UserOAuthAccountsTable.updatedAt]
    )
}
