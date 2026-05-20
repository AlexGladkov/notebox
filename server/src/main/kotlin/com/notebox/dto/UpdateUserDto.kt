package com.notebox.dto

import com.notebox.validation.ValidThemePreference
import jakarta.validation.constraints.Size

data class UpdateUserDto(
    @field:Size(max = 255, message = "Name must be at most 255 characters")
    val name: String? = null,

    @field:Size(max = 2048, message = "Avatar URL must be at most 2048 characters")
    val avatarUrl: String? = null,

    @field:ValidThemePreference
    val themePreference: String? = null
)
