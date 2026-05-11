package com.notebox.domain.reminder

import com.notebox.domain.calendar.GoogleCalendarService
import com.notebox.domain.note.NoteRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class ReminderService(
    private val reminderRepository: ReminderRepository,
    private val noteRepository: NoteRepository,
    private val googleCalendarService: GoogleCalendarService
) {
    private val logger = LoggerFactory.getLogger(ReminderService::class.java)

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
        // Проверяем, существует ли заметка
        val note = noteRepository.findById(noteId)
            ?: throw IllegalArgumentException("Note not found")

        // Используем title заметки, если не указан кастомный
        val reminderTitle = title ?: note.title

        // Создаем напоминание
        var reminder = reminderRepository.create(
            noteId = noteId,
            userId = userId,
            title = reminderTitle,
            remindAt = remindAt,
            repeatType = repeatType,
            repeatEndAt = repeatEndAt
        )

        // Синхронизация с Google Calendar
        if (syncToGoogleCalendar) {
            try {
                val googleEventId = googleCalendarService.createEvent(userId, reminder)
                if (googleEventId != null) {
                    reminderRepository.updateGoogleEventId(reminder.id, googleEventId)
                    reminder = reminder.copy(googleEventId = googleEventId)
                }
            } catch (e: Exception) {
                logger.error("Failed to sync reminder to Google Calendar", e)
            }
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

        // Обновляем событие в Google Calendar если оно есть
        if (reminder.googleEventId != null) {
            try {
                googleCalendarService.updateEvent(userId, reminder)
            } catch (e: Exception) {
                logger.error("Failed to update Google Calendar event", e)
            }
        }

        return reminder
    }

    fun deleteReminder(id: String, userId: String): Boolean {
        val reminder = reminderRepository.findById(id, userId)
            ?: return false

        // Удаляем событие из Google Calendar если оно есть
        if (reminder.googleEventId != null) {
            try {
                googleCalendarService.deleteEvent(userId, reminder.googleEventId)
            } catch (e: Exception) {
                logger.error("Failed to delete Google Calendar event", e)
            }
        }

        return reminderRepository.delete(id, userId)
    }

    fun getUpcomingReminders(userId: String, limit: Int = 10): List<Reminder> {
        return reminderRepository.getUpcoming(userId, limit)
    }
}
