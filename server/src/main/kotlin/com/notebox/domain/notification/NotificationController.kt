package com.notebox.domain.notification

import com.notebox.dto.*
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/notifications")
class NotificationController(
    private val subscriptionRepository: PushSubscriptionRepository,
    private val pushNotificationService: PushNotificationService
) {

    @GetMapping("/vapid-public-key")
    fun getVapidPublicKey(): ResponseEntity<Map<String, Any>> {
        if (!pushNotificationService.isConfigured()) {
            return ResponseEntity.ok(mapOf<String, Any>("configured" to false))
        }

        return ResponseEntity.ok(mapOf<String, Any>(
            "configured" to true,
            "publicKey" to (System.getenv("VAPID_PUBLIC_KEY") ?: "")
        ))
    }

    @GetMapping("/subscriptions")
    fun getSubscriptions(): ResponseEntity<ApiResponse<List<PushSubscriptionDto>>> {
        val userId = getCurrentUserId()
        val subscriptions = subscriptionRepository.findAll(userId)
        return ResponseEntity.ok(successResponse(subscriptions.map { it.toDto() }))
    }

    @PostMapping("/subscribe")
    fun subscribe(
        @Valid @RequestBody request: SubscribePushRequest
    ): ResponseEntity<ApiResponse<PushSubscriptionDto>> {
        val userId = getCurrentUserId()

        try {
            val subscription = subscriptionRepository.create(
                userId = userId,
                endpoint = request.endpoint,
                p256dh = request.p256dh,
                auth = request.auth
            )

            return ResponseEntity.status(HttpStatus.CREATED)
                .body(successResponse(subscription.toDto()))
        } catch (e: Exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(errorResponse("SUBSCRIPTION_ERROR", e.message ?: "Failed to create subscription"))
        }
    }

    @PostMapping("/unsubscribe")
    fun unsubscribe(
        @Valid @RequestBody request: UnsubscribePushRequest
    ): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        subscriptionRepository.deleteByEndpoint(request.endpoint, userId)
        return ResponseEntity.noContent().build()
    }

    private fun getCurrentUserId(): String {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
            ?: throw IllegalStateException("User not authenticated")
    }
}
