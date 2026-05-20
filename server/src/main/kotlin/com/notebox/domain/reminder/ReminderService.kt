package com.notebox.domain.reminder

import com.notebox.domain.note.NoteRepository
import com.notebox.exception.NotFoundException
import org.springframework.stereotype.Service
import java.time.Instant

/**
 * Сервис для управления напоминаниями.
 * Отвечает только за CRUD операции, делегирует синхронизацию с календарями.
 */
@Service
class ReminderService(
    private val reminderRepository: ReminderRepository,
    private val noteRepository: NoteRepository,
    private val calendarSyncService: ReminderCalendarSyncService
) {
    fun getAllReminders(userId: String): List<Reminder> {
        return reminderRepository.findAll(userId)
    }

    fun getReminderById(id: String, userId: String): Reminder? {
        return reminderRepository.findById(id, userId)
    }

    fun getRemindersByNoteId(noteId: String, userId: String): List<Reminder> {
        return reminderRepository.findByNoteId(noteId, userId)
    }

    fun createReminder(
        noteId: String,
        userId: String,
        title: String?,
        remindAt: Instant,
        repeatType: RepeatType = RepeatType.NONE,
        repeatEndAt: Instant? = null,
        syncToGoogleCalendar: Boolean = false
    ): Reminder {
        val note = noteRepository.findById(noteId)
            ?: throw NotFoundException("Note with id '$noteId' not found")

        val reminderTitle = title ?: note.title

        var reminder = reminderRepository.create(
            noteId = noteId,
            userId = userId,
            title = reminderTitle,
            remindAt = remindAt,
            repeatType = repeatType,
            repeatEndAt = repeatEndAt
        )

        if (syncToGoogleCalendar) {
            reminder = calendarSyncService.syncToCalendar(userId, reminder)
        }

        return reminder
    }

    fun updateReminder(
        id: String,
        userId: String,
        title: String?,
        remindAt: Instant?,
        repeatType: RepeatType?,
        repeatEndAt: Instant?
    ): Reminder? {
        val reminder = reminderRepository.update(id, userId, title, remindAt, repeatType, repeatEndAt)
            ?: return null

        calendarSyncService.updateInCalendar(userId, reminder)

        return reminder
    }

    fun deleteReminder(id: String, userId: String): Boolean {
        val reminder = reminderRepository.findById(id, userId) ?: return false

        if (reminder.googleEventId != null) {
            calendarSyncService.deleteFromCalendar(userId, reminder.googleEventId)
        }

        return reminderRepository.delete(id, userId)
    }

    fun getUpcomingReminders(userId: String, limit: Int = 10): List<Reminder> {
        return reminderRepository.getUpcoming(userId, limit)
    }
}
