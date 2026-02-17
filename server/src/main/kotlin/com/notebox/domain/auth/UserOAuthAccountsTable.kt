package com.notebox.domain.auth

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object UserOAuthAccountsTable : Table("user_oauth_accounts") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36).references(UsersTable.id).index()
    val provider = varchar("provider", 50)
    val providerUserId = varchar("provider_user_id", 255)
    val accessToken = text("access_token")
    val refreshToken = text("refresh_token").nullable()
    val expiresAt = timestamp("expires_at").nullable()
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)

    init {
        uniqueIndex(provider, providerUserId)
    }
}
