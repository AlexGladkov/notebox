package com.notebox.domain.auth

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object SessionsTable : Table("sessions") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36).references(UsersTable.id).index()
    val createdAt = timestamp("created_at").default(Instant.now())
    val expiresAt = timestamp("expires_at")

    override val primaryKey = PrimaryKey(id)
}
