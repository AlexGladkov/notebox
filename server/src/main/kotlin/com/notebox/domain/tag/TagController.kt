package com.notebox.domain.tag

import com.notebox.domain.auth.SessionService
import com.notebox.dto.*
import com.notebox.util.ValidationUtils
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/tags")
class TagController(
    private val tagService: TagService,
    private val sessionService: SessionService
) {

    companion object {
        private const val SESSION_COOKIE_NAME = "SESSION_ID"
    }

    @GetMapping
    fun getAllTags(request: HttpServletRequest): ResponseEntity<ApiResponse<List<TagDto>>> {
        val userId = getUserIdFromRequest(request)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        val tags = tagService.getAllTags(userId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    @GetMapping("/{id}")
    fun getTagById(
        @PathVariable id: String,
        request: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        ValidationUtils.validateUUID(id, "id")

        val userId = getUserIdFromRequest(request)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        val tag = tagService.getTagById(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Tag not found"))

        // Verify tag belongs to the user
        if (tag.userId != userId) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponse("FORBIDDEN", "Access denied"))
        }

        return ResponseEntity.ok(successResponse(tag.toDto()))
    }

    @PostMapping
    fun createTag(
        @Valid @RequestBody request: CreateTagRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        try {
            val tag = tagService.createTag(userId, request.name, request.color)
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(successResponse(tag.toDto()))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }

    @PutMapping("/{id}")
    fun updateTag(
        @PathVariable id: String,
        @Valid @RequestBody request: UpdateTagRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        ValidationUtils.validateUUID(id, "id")

        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        try {
            val tag = tagService.getTagById(id)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Tag not found"))

            // Verify tag belongs to the user
            if (tag.userId != userId) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(errorResponse("FORBIDDEN", "Access denied"))
            }

            val updatedTag = tagService.updateTag(id, request.name, request.color)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Tag not found"))

            return ResponseEntity.ok(successResponse(updatedTag.toDto()))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }

    @DeleteMapping("/{id}")
    fun deleteTag(
        @PathVariable id: String,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<*>> {
        ValidationUtils.validateUUID(id, "id")

        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse<Nothing>("UNAUTHORIZED", "Not authenticated"))

        val tag = tagService.getTagById(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse<Nothing>("NOT_FOUND", "Tag not found"))

        // Verify tag belongs to the user
        if (tag.userId != userId) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponse<Nothing>("FORBIDDEN", "Access denied"))
        }

        tagService.deleteTag(id)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/notes/{noteId}/tags")
    fun setNoteTags(
        @PathVariable noteId: String,
        @Valid @RequestBody request: SetNoteTagsRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<List<TagDto>>> {
        ValidationUtils.validateUUID(noteId, "noteId")
        request.tagIds.forEach { ValidationUtils.validateUUID(it, "tagId") }

        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        // Verify all tags belong to the user
        request.tagIds.forEach { tagId ->
            val tag = tagService.getTagById(tagId)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Tag not found: $tagId"))

            if (tag.userId != userId) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(errorResponse("FORBIDDEN", "Access denied to tag: $tagId"))
            }
        }

        tagService.setNoteTags(noteId, request.tagIds)
        val tags = tagService.getNoteTags(noteId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    @GetMapping("/notes/{noteId}/tags")
    fun getNoteTags(@PathVariable noteId: String): ResponseEntity<ApiResponse<List<TagDto>>> {
        ValidationUtils.validateUUID(noteId, "noteId")
        val tags = tagService.getNoteTags(noteId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    private fun getUserIdFromRequest(request: HttpServletRequest): String? {
        val sessionId = request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
            ?: return null
        return sessionService.getUserIdFromSession(sessionId)
    }
}
