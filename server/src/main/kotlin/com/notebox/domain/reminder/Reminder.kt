package com.notebox.domain.reminder

import com.notebox.dto.ReminderDto
import java.time.Instant

data class Reminder(
    val id: String,
    val noteId: String,
    val userId: String,
    val title: String,
    val remindAt: Instant,
    val repeatType: RepeatType,
    val repeatEndAt: Instant?,
    val notificationSent: Boolean,
    val googleEventId: String?,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun toDto() = ReminderDto(
        id = id,
        noteId = noteId,
        title = title,
        remindAt = remindAt.toEpochMilli(),
        repeatType = repeatType.name,
        repeatEndAt = repeatEndAt?.toEpochMilli(),
        notificationSent = notificationSent,
        googleEventId = googleEventId,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli()
    )
}

enum class RepeatType {
    NONE, DAILY, WEEKLY, MONTHLY, YEARLY
}
