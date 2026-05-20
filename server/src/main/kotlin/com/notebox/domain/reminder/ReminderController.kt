package com.notebox.domain.reminder

import com.notebox.dto.*
import com.notebox.exception.AuthenticationException
import com.notebox.exception.NotFoundException
import com.notebox.validation.ValidUuid
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*
import java.time.Instant

@Validated
@RestController
@RequestMapping("/api/reminders")
class ReminderController(
    private val reminderService: ReminderService
) {

    @GetMapping
    fun getAllReminders(): ResponseEntity<ApiResponse<List<ReminderDto>>> {
        val userId = getCurrentUserId()
        val reminders = reminderService.getAllReminders(userId)
        return ResponseEntity.ok(successResponse(reminders.map { it.toDto() }))
    }

    @GetMapping("/{id}")
    fun getReminderById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<ReminderDto>> {
        val userId = getCurrentUserId()
        val reminder = reminderService.getReminderById(id, userId)
            ?: throw NotFoundException("Reminder with id '$id' not found")

        return ResponseEntity.ok(successResponse(reminder.toDto()))
    }

    @GetMapping("/note/{noteId}")
    fun getRemindersByNoteId(@PathVariable @ValidUuid(fieldName = "noteId") noteId: String): ResponseEntity<ApiResponse<List<ReminderDto>>> {
        val userId = getCurrentUserId()
        val reminders = reminderService.getRemindersByNoteId(noteId, userId)
        return ResponseEntity.ok(successResponse(reminders.map { it.toDto() }))
    }

    @GetMapping("/upcoming")
    fun getUpcomingReminders(
        @RequestParam(required = false, defaultValue = "10") limit: Int
    ): ResponseEntity<ApiResponse<List<ReminderDto>>> {
        val userId = getCurrentUserId()
        val reminders = reminderService.getUpcomingReminders(userId, limit)
        return ResponseEntity.ok(successResponse(reminders.map { it.toDto() }))
    }

    @PostMapping
    fun createReminder(
        @Valid @RequestBody request: CreateReminderRequest
    ): ResponseEntity<ApiResponse<ReminderDto>> {
        val userId = getCurrentUserId()
        val repeatType = RepeatType.valueOf(request.repeatType ?: "NONE")
        val reminder = reminderService.createReminder(
            noteId = request.noteId,
            userId = userId,
            title = request.title,
            remindAt = Instant.ofEpochMilli(request.remindAt),
            repeatType = repeatType,
            repeatEndAt = request.repeatEndAt?.let { Instant.ofEpochMilli(it) },
            syncToGoogleCalendar = request.syncToGoogleCalendar
        )

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(reminder.toDto()))
    }

    @PutMapping("/{id}")
    fun updateReminder(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateReminderRequest
    ): ResponseEntity<ApiResponse<ReminderDto>> {
        val userId = getCurrentUserId()
        val repeatType = request.repeatType?.let { RepeatType.valueOf(it) }
        val reminder = reminderService.updateReminder(
            id = id,
            userId = userId,
            title = request.title,
            remindAt = request.remindAt?.let { Instant.ofEpochMilli(it) },
            repeatType = repeatType,
            repeatEndAt = request.repeatEndAt?.let { Instant.ofEpochMilli(it) }
        ) ?: throw NotFoundException("Reminder with id '$id' not found")

        return ResponseEntity.ok(successResponse(reminder.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteReminder(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<Void> {
        val userId = getCurrentUserId()

        val deleted = reminderService.deleteReminder(id, userId)
        return if (deleted) {
            ResponseEntity.noContent().build()
        } else {
            ResponseEntity.notFound().build()
        }
    }

    private fun getCurrentUserId(): String {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
            ?: throw AuthenticationException("User not authenticated")
    }
}
