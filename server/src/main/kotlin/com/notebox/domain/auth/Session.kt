package com.notebox.domain.auth

import java.time.Instant

data class Session(
    val id: String,
    val userId: String,
    val createdAt: Instant,
    val expiresAt: Instant
)
