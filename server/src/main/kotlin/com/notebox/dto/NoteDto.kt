package com.notebox.dto

data class NoteDto(
    val id: String,
    val title: String,
    val content: String,
    val folderId: String,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateNoteRequest(
    val title: String,
    val content: String,
    val folderId: String
)

data class UpdateNoteRequest(
    val title: String,
    val content: String,
    val folderId: String
)
