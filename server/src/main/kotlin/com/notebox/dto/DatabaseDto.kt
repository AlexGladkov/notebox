package com.notebox.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class CustomDatabaseDto(
    val id: String,
    val name: String,
    val folderId: String?,
    val columns: List<ColumnDto>,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateDatabaseRequest(
    @field:NotBlank(message = "Name cannot be blank")
    @field:Size(max = 255, message = "Name must be less than 255 characters")
    val name: String,

    val folderId: String?
)

data class UpdateDatabaseRequest(
    @field:NotBlank(message = "Name cannot be blank")
    @field:Size(max = 255, message = "Name must be less than 255 characters")
    val name: String,

    val folderId: String?
)
