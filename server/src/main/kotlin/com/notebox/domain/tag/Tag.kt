package com.notebox.domain.tag

import com.notebox.dto.TagDto
import java.time.Instant

data class Tag(
    val id: String,
    val userId: String,
    val name: String,
    val color: String,
    val createdAt: Instant
) {
    fun toDto() = TagDto(
        id = id,
        name = name,
        color = color
    )
}
