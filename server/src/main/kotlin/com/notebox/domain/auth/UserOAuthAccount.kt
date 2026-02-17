package com.notebox.domain.auth

import java.time.Instant

data class UserOAuthAccount(
    val id: String,
    val userId: String,
    val provider: String,
    val providerUserId: String,
    val accessToken: String,
    val refreshToken: String?,
    val expiresAt: Instant?,
    val createdAt: Instant,
    val updatedAt: Instant
)
