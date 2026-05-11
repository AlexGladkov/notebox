package com.notebox.domain.reminder

import com.notebox.domain.notification.PushNotificationService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.time.temporal.ChronoUnit

@Component
class ReminderScheduler(
    @Value("\${server.url}") private val serverUrl: String,
    private val reminderRepository: ReminderRepository,
    private val pushNotificationService: PushNotificationService
) {
    private val logger = LoggerFactory.getLogger(ReminderScheduler::class.java)

    @Scheduled(fixedRate = 60000, initialDelay = 10000) // каждую минуту, первый запуск через 10 секунд
    fun checkReminders() {
        try {
            val now = Instant.now()
            val dueReminders = reminderRepository.getDueReminders(now)

            logger.debug("Checking reminders: found ${dueReminders.size} due reminders")

            dueReminders.forEach { reminder ->
                try {
                    // Отправить push-уведомление
                    pushNotificationService.sendNotification(
                        userId = reminder.userId,
                        title = "Напоминание",
                        body = reminder.title,
                        url = "$serverUrl/notes/${reminder.noteId}"
                    )

                    // Обработать повторение или отметить как отправленное
                    if (reminder.repeatType != RepeatType.NONE) {
                        val nextRemindAt = calculateNextRemindAt(reminder)
                        if (nextRemindAt != null &&
                            (reminder.repeatEndAt == null || nextRemindAt.isBefore(reminder.repeatEndAt))
                        ) {
                            reminderRepository.updateRemindAt(reminder.id, nextRemindAt)
                            logger.info("Reminder ${reminder.id} rescheduled to $nextRemindAt")
                        } else {
                            reminderRepository.markAsSent(reminder.id)
                            logger.info("Reminder ${reminder.id} marked as sent (no more repeats)")
                        }
                    } else {
                        reminderRepository.markAsSent(reminder.id)
                        logger.info("Reminder ${reminder.id} marked as sent")
                    }
                } catch (e: Exception) {
                    logger.error("Failed to process reminder ${reminder.id}", e)
                }
            }
        } catch (e: Exception) {
            logger.error("Error in reminder scheduler", e)
        }
    }

    private fun calculateNextRemindAt(reminder: Reminder): Instant? {
        return when (reminder.repeatType) {
            RepeatType.DAILY -> reminder.remindAt.plus(1, ChronoUnit.DAYS)
            RepeatType.WEEKLY -> reminder.remindAt.plus(7, ChronoUnit.DAYS)
            RepeatType.MONTHLY -> reminder.remindAt.plus(1, ChronoUnit.MONTHS)
            RepeatType.YEARLY -> reminder.remindAt.plus(1, ChronoUnit.YEARS)
            else -> null
        }
    }
}
