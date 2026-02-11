package com.notebox.domain.database

import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.fasterxml.jackson.module.kotlin.readValue
import com.notebox.dto.ColumnDto
import com.notebox.dto.ColumnType
import com.notebox.dto.CustomDatabaseDto
import com.notebox.dto.SelectOptionDto
import java.time.Instant

data class CustomDatabase(
    val id: String,
    val name: String,
    val folderId: String?,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class Column(
    val id: String,
    val databaseId: String,
    val name: String,
    val type: ColumnType,
    val options: List<SelectOptionDto>?,
    val position: Int,
    val createdAt: Instant
) {
    fun toDto() = ColumnDto(
        id = id,
        databaseId = databaseId,
        name = name,
        type = type,
        options = options,
        position = position,
        createdAt = createdAt.toEpochMilli()
    )
}

data class Record(
    val id: String,
    val databaseId: String,
    val data: Map<String, Any?>,
    val createdAt: Instant,
    val updatedAt: Instant
)

data class FileAttachment(
    val id: String,
    val recordId: String,
    val columnId: String,
    val filename: String,
    val s3Key: String,
    val contentType: String?,
    val size: Long,
    val createdAt: Instant
)

fun CustomDatabase.toDto(columns: List<Column>) = CustomDatabaseDto(
    id = id,
    name = name,
    folderId = folderId,
    columns = columns.map { it.toDto() },
    createdAt = createdAt.toEpochMilli(),
    updatedAt = updatedAt.toEpochMilli()
)

private val objectMapper = jacksonObjectMapper()

fun serializeOptions(options: List<SelectOptionDto>?): String? {
    return options?.let { objectMapper.writeValueAsString(it) }
}

fun deserializeOptions(json: String?): List<SelectOptionDto>? {
    return json?.let { objectMapper.readValue(it) }
}

fun serializeData(data: Map<String, Any?>): String {
    return objectMapper.writeValueAsString(data)
}

fun deserializeData(json: String): Map<String, Any?> {
    return objectMapper.readValue(json)
}
