package com.notebox.dto

import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size

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
    @field:NotBlank(message = "Name cannot be blank")
    @field:Size(max = 255, message = "Name must be less than 255 characters")
    val name: String,

    @field:NotNull(message = "Type cannot be null")
    val type: ColumnType,

    val options: List<SelectOptionDto>?,

    @field:Min(0, message = "Position must be non-negative")
    val position: Int
)

data class UpdateColumnRequest(
    @field:NotBlank(message = "Name cannot be blank")
    @field:Size(max = 255, message = "Name must be less than 255 characters")
    val name: String,

    @field:NotNull(message = "Type cannot be null")
    val type: ColumnType,

    val options: List<SelectOptionDto>?,

    @field:Min(0, message = "Position must be non-negative")
    val position: Int
)
