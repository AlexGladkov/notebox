package com.notebox.dto

import jakarta.validation.constraints.NotNull

data class RecordDto(
    val id: String,
    val databaseId: String,
    val data: Map<String, Any?>,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateRecordRequest(
    @field:NotNull(message = "Data cannot be null")
    val data: Map<String, Any?>
)

data class UpdateRecordRequest(
    @field:NotNull(message = "Data cannot be null")
    val data: Map<String, Any?>
)
