package com.notebox.domain.notification

import com.google.gson.Gson
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.security.Security

@Service
class PushNotificationService(
    @Value("\${push.vapid.public-key:}") private val publicKey: String,
    @Value("\${push.vapid.private-key:}") private val privateKey: String,
    @Value("\${push.vapid.subject:mailto:admin@notebox.app}") private val subject: String,
    private val subscriptionRepository: PushSubscriptionRepository
) {
    private val logger = LoggerFactory.getLogger(PushNotificationService::class.java)
    private val pushService: PushService? = initPushService()
    private val gson = Gson()

    private fun initPushService(): PushService? {
        return try {
            if (publicKey.isBlank() || privateKey.isBlank()) {
                logger.warn("VAPID keys not configured. Push notifications will be disabled.")
                return null
            }

            // Bouncycastle provider для криптографии
            Security.addProvider(org.bouncycastle.jce.provider.BouncyCastleProvider())

            PushService().apply {
                setPublicKey(publicKey)
                setPrivateKey(privateKey)
                setSubject(subject)
            }
        } catch (e: Exception) {
            logger.error("Failed to initialize PushService", e)
            null
        }
    }

    fun sendNotification(userId: String, title: String, body: String, url: String) {
        if (pushService == null) {
            logger.warn("Push service not initialized. Skipping notification for user $userId")
            return
        }

        val subscriptions = subscriptionRepository.findAll(userId)

        val payloadData = mapOf(
            "title" to title,
            "body" to body,
            "url" to url
        )
        val payload = gson.toJson(payloadData)

        subscriptions.forEach { sub ->
            try {
                val notification = Notification(sub.endpoint, sub.p256dh, sub.auth, payload)
                pushService.send(notification)
                logger.info("Push notification sent to user $userId")
            } catch (e: Exception) {
                logger.error("Failed to send push notification", e)
                // Удалить недействительную подписку при 410 Gone
                if (e.message?.contains("410") == true || e.message?.contains("Gone") == true) {
                    subscriptionRepository.delete(sub.id)
                    logger.info("Removed invalid subscription ${sub.id}")
                }
            }
        }
    }

    fun isConfigured(): Boolean = pushService != null
}
