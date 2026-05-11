package com.notebox.domain.calendar

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport
import com.google.api.client.json.gson.GsonFactory
import com.google.api.services.calendar.Calendar
import com.google.api.services.calendar.model.Event
import com.google.api.services.calendar.model.EventDateTime
import com.google.auth.http.HttpCredentialsAdapter
import com.google.auth.oauth2.AccessToken
import com.google.auth.oauth2.GoogleCredentials
import com.notebox.domain.auth.UserOAuthAccountRepository
import com.notebox.domain.reminder.Reminder
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.util.Date

@Service
class GoogleCalendarService(
    private val oauthAccountRepository: UserOAuthAccountRepository
) {
    private val logger = LoggerFactory.getLogger(GoogleCalendarService::class.java)

    fun createEvent(userId: String, reminder: Reminder): String? {
        return try {
            val account = oauthAccountRepository.getByUserIdAndProvider(userId, "google")
                ?: return null

            val calendar = getCalendarService(account.accessToken)

            val event = Event().apply {
                summary = reminder.title
                description = "Напоминание из NoteBox"
                start = EventDateTime().setDateTime(
                    com.google.api.client.util.DateTime(Date.from(reminder.remindAt))
                )
                end = EventDateTime().setDateTime(
                    com.google.api.client.util.DateTime(Date.from(reminder.remindAt.plusSeconds(3600)))
                )
            }

            val createdEvent = calendar.events()
                .insert("primary", event)
                .execute()

            createdEvent.id
        } catch (e: Exception) {
            logger.error("Failed to create Google Calendar event", e)
            null
        }
    }

    fun updateEvent(userId: String, reminder: Reminder) {
        try {
            if (reminder.googleEventId == null) return

            val account = oauthAccountRepository.getByUserIdAndProvider(userId, "google")
                ?: return

            val calendar = getCalendarService(account.accessToken)

            val event = Event().apply {
                summary = reminder.title
                description = "Напоминание из NoteBox"
                start = EventDateTime().setDateTime(
                    com.google.api.client.util.DateTime(Date.from(reminder.remindAt))
                )
                end = EventDateTime().setDateTime(
                    com.google.api.client.util.DateTime(Date.from(reminder.remindAt.plusSeconds(3600)))
                )
            }

            calendar.events()
                .update("primary", reminder.googleEventId, event)
                .execute()
        } catch (e: Exception) {
            logger.error("Failed to update Google Calendar event", e)
        }
    }

    fun deleteEvent(userId: String, googleEventId: String) {
        try {
            val account = oauthAccountRepository.getByUserIdAndProvider(userId, "google")
                ?: return

            val calendar = getCalendarService(account.accessToken)
            calendar.events().delete("primary", googleEventId).execute()
        } catch (e: Exception) {
            logger.error("Failed to delete Google Calendar event", e)
        }
    }

    fun isConnected(userId: String): Boolean {
        return oauthAccountRepository.getByUserIdAndProvider(userId, "google") != null
    }

    private fun getCalendarService(accessToken: String): Calendar {
        val credentials = GoogleCredentials.create(AccessToken(accessToken, null))
        val httpTransport = GoogleNetHttpTransport.newTrustedTransport()

        return Calendar.Builder(
            httpTransport,
            GsonFactory.getDefaultInstance(),
            HttpCredentialsAdapter(credentials)
        )
            .setApplicationName("NoteBox")
            .build()
    }
}
