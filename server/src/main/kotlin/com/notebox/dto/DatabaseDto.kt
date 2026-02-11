package com.notebox.dto

data class CustomDatabaseDto(
    val id: String,
    val name: String,
    val folderId: String?,
    val columns: List<ColumnDto>,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateDatabaseRequest(
    val name: String,
    val folderId: String?
)

data class UpdateDatabaseRequest(
    val name: String,
    val folderId: String?
)
