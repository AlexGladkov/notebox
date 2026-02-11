package com.notebox.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class FolderDto(
    val id: String,
    val name: String,
    val parentId: String?,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateFolderRequest(
    @field:NotBlank(message = "Name cannot be blank")
    @field:Size(max = 255, message = "Name must be less than 255 characters")
    val name: String,

    val parentId: String?
)

data class UpdateFolderRequest(
    @field:NotBlank(message = "Name cannot be blank")
    @field:Size(max = 255, message = "Name must be less than 255 characters")
    val name: String,

    val parentId: String?
)
