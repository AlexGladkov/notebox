package com.notebox.domain.note

import com.notebox.dto.NoteDto
import java.time.Instant

data class Note(
    val id: String,
    val title: String,
    val content: String,
    val folderId: String,
    val icon: String?,
    val backdropType: String?,
    val backdropValue: String?,
    val backdropPositionY: Int,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun toDto() = NoteDto(
        id = id,
        title = title,
        content = content,
        folderId = folderId,
        icon = icon,
        backdropType = backdropType,
        backdropValue = backdropValue,
        backdropPositionY = backdropPositionY,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli()
    )
}
