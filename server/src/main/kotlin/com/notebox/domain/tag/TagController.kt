package com.notebox.domain.tag

import com.notebox.config.BaseController
import com.notebox.dto.*
import com.notebox.exception.NotFoundException
import com.notebox.validation.ValidUuid
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*

@Validated
@RestController
@RequestMapping("/api/tags")
class TagController(
    private val tagService: TagService
) : BaseController() {

    @GetMapping
    fun getAllTags(): ResponseEntity<ApiResponse<List<TagDto>>> {
        val userId = getCurrentUserId()
        val tags = tagService.getAllTags(userId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    @GetMapping("/{id}")
    fun getTagById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getCurrentUserId()
        val tag = tagService.getTagByIdForUser(id, userId)
        return ResponseEntity.ok(successResponse(tag.toDto()))
    }

    @PostMapping
    fun createTag(@Valid @RequestBody request: CreateTagRequest): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getCurrentUserId()
        val tag = tagService.createTag(userId, request.name, request.color)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(tag.toDto()))
    }

    @PutMapping("/{id}")
    fun updateTag(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateTagRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getCurrentUserId()
        tagService.verifyTagOwnership(id, userId)
        val updatedTag = tagService.updateTag(id, request.name, request.color)
            ?: throw NotFoundException("Tag with id '$id' not found")
        return ResponseEntity.ok(successResponse(updatedTag.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteTag(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        tagService.verifyTagOwnership(id, userId)
        tagService.deleteTag(id)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/notes/{noteId}/tags")
    fun setNoteTags(
        @PathVariable @ValidUuid(fieldName = "noteId") noteId: String,
        @Valid @RequestBody request: SetNoteTagsRequest
    ): ResponseEntity<ApiResponse<List<TagDto>>> {
        val userId = getCurrentUserId()
        tagService.verifyTagsOwnership(request.tagIds, userId)
        tagService.setNoteTags(noteId, request.tagIds)
        val tags = tagService.getNoteTags(noteId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    @GetMapping("/notes/{noteId}/tags")
    fun getNoteTags(@PathVariable @ValidUuid(fieldName = "noteId") noteId: String): ResponseEntity<ApiResponse<List<TagDto>>> {
        val tags = tagService.getNoteTags(noteId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }
}
