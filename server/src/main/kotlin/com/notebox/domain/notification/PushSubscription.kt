package com.notebox.domain.notification

import com.notebox.dto.PushSubscriptionDto
import java.time.Instant

data class PushSubscription(
    val id: String,
    val userId: String,
    val endpoint: String,
    val p256dh: String,
    val auth: String,
    val createdAt: Instant
) {
    fun toDto() = PushSubscriptionDto(
        id = id,
        userId = userId,
        endpoint = endpoint,
        createdAt = createdAt.toEpochMilli()
    )
}
