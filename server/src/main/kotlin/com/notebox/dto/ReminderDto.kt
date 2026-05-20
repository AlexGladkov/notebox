package com.notebox.dto

import com.notebox.validation.ValidUuid
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Size

data class ReminderDto(
    val id: String,
    val noteId: String,
    val title: String,
    val remindAt: Long,
    val repeatType: String,
    val repeatEndAt: Long?,
    val notificationSent: Boolean,
    val googleEventId: String?,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateReminderRequest(
    @field:NotBlank(message = "Note ID cannot be blank")
    @field:ValidUuid(fieldName = "noteId")
    val noteId: String,

    @field:Size(max = 500, message = "Title must be less than 500 characters")
    val title: String?,

    val remindAt: Long,

    @field:Pattern(regexp = "^(NONE|DAILY|WEEKLY|MONTHLY|YEARLY)$", message = "Invalid repeat type")
    val repeatType: String? = "NONE",

    val repeatEndAt: Long? = null,

    val syncToGoogleCalendar: Boolean = false
)

data class UpdateReminderRequest(
    @field:Size(max = 500, message = "Title must be less than 500 characters")
    val title: String?,

    val remindAt: Long?,

    @field:Pattern(regexp = "^(NONE|DAILY|WEEKLY|MONTHLY|YEARLY)$", message = "Invalid repeat type")
    val repeatType: String?,

    val repeatEndAt: Long?
)

data class PushSubscriptionDto(
    val id: String,
    val userId: String,
    val endpoint: String,
    val createdAt: Long
)

data class SubscribePushRequest(
    @field:NotBlank(message = "Endpoint cannot be blank")
    val endpoint: String,

    @field:NotBlank(message = "p256dh key cannot be blank")
    val p256dh: String,

    @field:NotBlank(message = "auth key cannot be blank")
    val auth: String
)

data class UnsubscribePushRequest(
    @field:NotBlank(message = "Endpoint cannot be blank")
    val endpoint: String
)
