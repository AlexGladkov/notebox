package com.notebox.domain.notification

import com.notebox.dto.*
import com.notebox.exception.AuthenticationException
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

data class VapidKeyResponse(
    val configured: Boolean,
    val publicKey: String? = null
)

@RestController
@RequestMapping("/api/notifications")
class NotificationController(
    private val subscriptionRepository: PushSubscriptionRepository,
    private val pushNotificationService: PushNotificationService
) {

    @GetMapping("/vapid-public-key")
    fun getVapidPublicKey(): ResponseEntity<ApiResponse<VapidKeyResponse>> {
        if (!pushNotificationService.isConfigured()) {
            return ResponseEntity.ok(successResponse(VapidKeyResponse(configured = false)))
        }

        val response = VapidKeyResponse(
            configured = true,
            publicKey = System.getenv("VAPID_PUBLIC_KEY") ?: ""
        )
        return ResponseEntity.ok(successResponse(response))
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
        val subscription = subscriptionRepository.create(
            userId = userId,
            endpoint = request.endpoint,
            p256dh = request.p256dh,
            auth = request.auth
        )

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(subscription.toDto()))
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
            ?: throw AuthenticationException("User not authenticated")
    }
}
