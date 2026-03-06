package com.notebox.dto

data class UpdateUserDto(
    val name: String? = null,
    val avatarUrl: String? = null,
    val themePreference: String? = null
)
