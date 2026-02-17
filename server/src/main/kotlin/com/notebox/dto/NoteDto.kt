package com.notebox.dto

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class NoteDto(
    val id: String,
    val title: String,
    val content: String,
    val folderId: String,
    val parentId: String?,
    val icon: String?,
    val backdropType: String?,
    val backdropValue: String?,
    val backdropPositionY: Int?,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateNoteRequest(
    @field:NotBlank(message = "Title cannot be blank")
    @field:Size(max = 255, message = "Title must be less than 255 characters")
    val title: String,

    @field:Size(max = 1000000, message = "Content must be less than 1000000 characters")
    val content: String,

    @field:NotBlank(message = "FolderId cannot be blank")
    val folderId: String,

    val parentId: String? = null,

    @field:Size(max = 50, message = "Icon must be less than 50 characters")
    val icon: String? = null,

    @field:Size(max = 20, message = "BackdropType must be less than 20 characters")
    val backdropType: String? = null,

    @field:Size(max = 2000, message = "BackdropValue must be less than 2000 characters")
    val backdropValue: String? = null,

    @field:Min(value = 0, message = "BackdropPositionY must be between 0 and 100")
    @field:Max(value = 100, message = "BackdropPositionY must be between 0 and 100")
    val backdropPositionY: Int? = 50
)

data class UpdateNoteRequest(
    @field:NotBlank(message = "Title cannot be blank")
    @field:Size(max = 255, message = "Title must be less than 255 characters")
    val title: String,

    @field:Size(max = 1000000, message = "Content must be less than 1000000 characters")
    val content: String,

    @field:NotBlank(message = "FolderId cannot be blank")
    val folderId: String,

    val parentId: String? = null,

    @field:Size(max = 50, message = "Icon must be less than 50 characters")
    val icon: String? = null,

    @field:Size(max = 20, message = "BackdropType must be less than 20 characters")
    val backdropType: String? = null,

    @field:Size(max = 2000, message = "BackdropValue must be less than 2000 characters")
    val backdropValue: String? = null,

    @field:Min(value = 0, message = "BackdropPositionY must be between 0 and 100")
    @field:Max(value = 100, message = "BackdropPositionY must be between 0 and 100")
    val backdropPositionY: Int? = 50
)

data class MoveNoteRequest(
    val parentId: String? = null
)
