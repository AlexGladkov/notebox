package com.notebox.dto

data class FolderDto(
    val id: String,
    val name: String,
    val parentId: String?,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateFolderRequest(
    val name: String,
    val parentId: String?
)

data class UpdateFolderRequest(
    val name: String,
    val parentId: String?
)
