package com.notebox.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class TagDto(
    val id: String,
    val name: String,
    val color: String
)

data class CreateTagRequest(
    @field:NotBlank(message = "Tag name cannot be blank")
    @field:Size(max = 100, message = "Tag name must be less than 100 characters")
    val name: String,

    @field:Size(max = 20, message = "Color must be less than 20 characters")
    val color: String? = null
)

data class UpdateTagRequest(
    @field:Size(max = 100, message = "Tag name must be less than 100 characters")
    val name: String? = null,

    @field:Size(max = 20, message = "Color must be less than 20 characters")
    val color: String? = null
)

data class SetNoteTagsRequest(
    val tagIds: List<String>
)
