package com.notebox.domain.notification

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object PushSubscriptionsTable : Table("push_subscriptions") {
    val id = varchar("id", 36)
    val userId = varchar("user_id", 36).index()
    val endpoint = text("endpoint")
    val p256dh = text("p256dh")
    val auth = text("auth")
    val createdAt = timestamp("created_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
