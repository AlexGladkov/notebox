package com.notebox.domain.auth

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object UsersTable : Table("users") {
    val id = varchar("id", 36)
    val email = varchar("email", 255).uniqueIndex()
    val name = varchar("name", 255)
    val avatarUrl = text("avatar_url").nullable()
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
