package com.notebox.domain.auth

import com.notebox.dto.UserDto
import java.time.Instant

data class User(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String?,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun toDto() = UserDto(
        id = id,
        email = email,
        name = name,
        avatarUrl = avatarUrl
    )
}
