package com.notebox.domain.reminder

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.SqlExpressionBuilder.lessEq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class ReminderRepository {

    fun findAll(userId: String): List<Reminder> = transaction {
        RemindersTable.select { RemindersTable.userId eq userId }
            .map { toReminder(it) }
    }

    fun findById(id: String, userId: String): Reminder? = transaction {
        RemindersTable.select {
            (RemindersTable.id eq id) and (RemindersTable.userId eq userId)
        }
            .mapNotNull { toReminder(it) }
            .singleOrNull()
    }

    fun findByNoteId(noteId: String, userId: String): List<Reminder> = transaction {
        RemindersTable.select {
            (RemindersTable.noteId eq noteId) and (RemindersTable.userId eq userId)
        }
            .map { toReminder(it) }
    }

    fun create(
        noteId: String,
        userId: String,
        title: String,
        remindAt: Instant,
        repeatType: RepeatType = RepeatType.NONE,
        repeatEndAt: Instant? = null,
        googleEventId: String? = null
    ): Reminder = transaction {
        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        RemindersTable.insert {
            it[RemindersTable.id] = id
            it[RemindersTable.noteId] = noteId
            it[RemindersTable.userId] = userId
            it[RemindersTable.title] = title
            it[RemindersTable.remindAt] = remindAt
            it[RemindersTable.repeatType] = repeatType.name
            it[RemindersTable.repeatEndAt] = repeatEndAt
            it[RemindersTable.notificationSent] = false
            it[RemindersTable.googleEventId] = googleEventId
            it[createdAt] = now
            it[updatedAt] = now
        }

        Reminder(
            id, noteId, userId, title, remindAt, repeatType,
            repeatEndAt, false, googleEventId, now, now
        )
    }

    fun update(
        id: String,
        userId: String,
        title: String?,
        remindAt: Instant?,
        repeatType: RepeatType?,
        repeatEndAt: Instant?
    ): Reminder? = transaction {
        val exists = RemindersTable.select {
            (RemindersTable.id eq id) and (RemindersTable.userId eq userId)
        }.any()

        if (!exists) return@transaction null

        val now = Instant.now()
        RemindersTable.update({
            (RemindersTable.id eq id) and (RemindersTable.userId eq userId)
        }) {
            if (title != null) it[RemindersTable.title] = title
            if (remindAt != null) it[RemindersTable.remindAt] = remindAt
            if (repeatType != null) it[RemindersTable.repeatType] = repeatType.name
            it[RemindersTable.repeatEndAt] = repeatEndAt
            it[updatedAt] = now
        }

        findById(id, userId)
    }

    fun delete(id: String, userId: String): Boolean = transaction {
        RemindersTable.deleteWhere {
            (RemindersTable.id eq id) and (RemindersTable.userId eq userId)
        } > 0
    }

    fun deleteByNoteId(noteId: String): Int = transaction {
        RemindersTable.deleteWhere { RemindersTable.noteId eq noteId }
    }

    fun getDueReminders(now: Instant): List<Reminder> = transaction {
        RemindersTable.select {
            (RemindersTable.remindAt lessEq now) and
            (RemindersTable.notificationSent eq false)
        }
            .map { toReminder(it) }
    }

    fun markAsSent(id: String): Boolean = transaction {
        RemindersTable.update({ RemindersTable.id eq id }) {
            it[notificationSent] = true
            it[updatedAt] = Instant.now()
        } > 0
    }

    fun updateRemindAt(id: String, newRemindAt: Instant): Boolean = transaction {
        RemindersTable.update({ RemindersTable.id eq id }) {
            it[remindAt] = newRemindAt
            it[notificationSent] = false
            it[updatedAt] = Instant.now()
        } > 0
    }

    fun updateGoogleEventId(id: String, googleEventId: String?): Boolean = transaction {
        RemindersTable.update({ RemindersTable.id eq id }) {
            it[RemindersTable.googleEventId] = googleEventId
            it[updatedAt] = Instant.now()
        } > 0
    }

    fun getUpcoming(userId: String, limit: Int = 10): List<Reminder> = transaction {
        val now = Instant.now()
        RemindersTable.select {
            (RemindersTable.userId eq userId) and
            (RemindersTable.remindAt greater now) and
            (RemindersTable.notificationSent eq false)
        }
            .orderBy(RemindersTable.remindAt to SortOrder.ASC)
            .limit(limit)
            .map { toReminder(it) }
    }

    fun deleteAllByUserId(userId: String): Int = transaction {
        RemindersTable.deleteWhere { RemindersTable.userId eq userId }
    }

    private fun toReminder(row: ResultRow) = Reminder(
        id = row[RemindersTable.id],
        noteId = row[RemindersTable.noteId],
        userId = row[RemindersTable.userId],
        title = row[RemindersTable.title],
        remindAt = row[RemindersTable.remindAt],
        repeatType = RepeatType.valueOf(row[RemindersTable.repeatType]),
        repeatEndAt = row[RemindersTable.repeatEndAt],
        notificationSent = row[RemindersTable.notificationSent],
        googleEventId = row[RemindersTable.googleEventId],
        createdAt = row[RemindersTable.createdAt],
        updatedAt = row[RemindersTable.updatedAt]
    )
}
