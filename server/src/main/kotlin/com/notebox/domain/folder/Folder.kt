package com.notebox.domain.folder

import com.notebox.dto.FolderDto
import java.time.Instant

data class Folder(
    val id: String,
    val name: String,
    val parentId: String?,
    val createdAt: Instant,
    val updatedAt: Instant
) {
    fun toDto() = FolderDto(
        id = id,
        name = name,
        parentId = parentId,
        createdAt = createdAt.toEpochMilli(),
        updatedAt = updatedAt.toEpochMilli()
    )
}
