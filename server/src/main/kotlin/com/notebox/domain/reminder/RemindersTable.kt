package com.notebox.domain.reminder

import org.jetbrains.exposed.sql.Table
import org.jetbrains.exposed.sql.javatime.timestamp
import java.time.Instant

object RemindersTable : Table("reminders") {
    val id = varchar("id", 36)
    val noteId = varchar("note_id", 36).index()
    val userId = varchar("user_id", 36).index()
    val title = varchar("title", 500)
    val remindAt = timestamp("remind_at").index()
    val repeatType = varchar("repeat_type", 20).default("NONE")
    val repeatEndAt = timestamp("repeat_end_at").nullable()
    val notificationSent = bool("notification_sent").default(false).index()
    val googleEventId = varchar("google_event_id", 255).nullable()
    val createdAt = timestamp("created_at").default(Instant.now())
    val updatedAt = timestamp("updated_at").default(Instant.now())

    override val primaryKey = PrimaryKey(id)
}
