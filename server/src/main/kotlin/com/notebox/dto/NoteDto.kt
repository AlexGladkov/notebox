package com.notebox.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class NoteDto(
    val id: String,
    val title: String,
    val content: String,
    val folderId: String,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateNoteRequest(
    @field:NotBlank(message = "Title cannot be blank")
    @field:Size(max = 255, message = "Title must be less than 255 characters")
    val title: String,

    val content: String,

    @field:NotBlank(message = "FolderId cannot be blank")
    val folderId: String
)

data class UpdateNoteRequest(
    @field:NotBlank(message = "Title cannot be blank")
    @field:Size(max = 255, message = "Title must be less than 255 characters")
    val title: String,

    val content: String,

    @field:NotBlank(message = "FolderId cannot be blank")
    val folderId: String
)
