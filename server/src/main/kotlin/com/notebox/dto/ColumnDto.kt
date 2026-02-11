package com.notebox.dto

data class ColumnDto(
    val id: String,
    val databaseId: String,
    val name: String,
    val type: ColumnType,
    val options: List<SelectOptionDto>?,
    val position: Int,
    val createdAt: Long
)

enum class ColumnType {
    TEXT,
    NUMBER,
    BOOLEAN,
    DATE,
    SELECT,
    MULTI_SELECT,
    FILE
}

data class SelectOptionDto(
    val id: String,
    val label: String,
    val color: String?
)

data class CreateColumnRequest(
    val name: String,
    val type: ColumnType,
    val options: List<SelectOptionDto>?,
    val position: Int
)

data class UpdateColumnRequest(
    val name: String,
    val type: ColumnType,
    val options: List<SelectOptionDto>?,
    val position: Int
)
