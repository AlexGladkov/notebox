package com.notebox.domain.reminder

import com.notebox.domain.calendar.GoogleCalendarService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service

/**
 * Сервис для синхронизации напоминаний с внешними календарями.
 * Отвечает только за интеграцию с календарными сервисами.
 */
@Service
class ReminderCalendarSyncService(
    private val googleCalendarService: GoogleCalendarService,
    private val reminderRepository: ReminderRepository
) {
    private val logger = LoggerFactory.getLogger(ReminderCalendarSyncService::class.java)

    fun syncToCalendar(userId: String, reminder: Reminder): Reminder {
        return try {
            val googleEventId = googleCalendarService.createEvent(userId, reminder)
            if (googleEventId != null) {
                reminderRepository.updateGoogleEventId(reminder.id, googleEventId)
                reminder.copy(googleEventId = googleEventId)
            } else {
                reminder
            }
        } catch (e: Exception) {
            logger.error("Failed to sync reminder to Google Calendar", e)
            reminder
        }
    }

    fun updateInCalendar(userId: String, reminder: Reminder) {
        if (reminder.googleEventId == null) return

        try {
            googleCalendarService.updateEvent(userId, reminder)
        } catch (e: Exception) {
            logger.error("Failed to update Google Calendar event", e)
        }
    }

    fun deleteFromCalendar(userId: String, googleEventId: String) {
        try {
            googleCalendarService.deleteEvent(userId, googleEventId)
        } catch (e: Exception) {
            logger.error("Failed to delete Google Calendar event", e)
        }
    }
}
