package com.notebox.dto

data class RecordDto(
    val id: String,
    val databaseId: String,
    val data: Map<String, Any?>,
    val createdAt: Long,
    val updatedAt: Long
)

data class CreateRecordRequest(
    val data: Map<String, Any?>
)

data class UpdateRecordRequest(
    val data: Map<String, Any?>
)
