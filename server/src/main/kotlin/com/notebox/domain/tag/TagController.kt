package com.notebox.domain.tag

import com.notebox.domain.auth.SessionService
import com.notebox.dto.*
import com.notebox.exception.AccessDeniedException
import com.notebox.exception.NotFoundException
import com.notebox.validation.ValidUuid
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*

@Validated
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
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        request: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getUserIdFromRequest(request)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        return try {
            val tag = tagService.getTagByIdForUser(id, userId)
            ResponseEntity.ok(successResponse(tag.toDto()))
        } catch (e: NotFoundException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", e.message ?: "Tag not found"))
        } catch (e: AccessDeniedException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponse("FORBIDDEN", e.message ?: "Access denied"))
        }
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
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateTagRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        return try {
            tagService.verifyTagOwnership(id, userId)
            val updatedTag = tagService.updateTag(id, request.name, request.color)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Tag not found"))
            ResponseEntity.ok(successResponse(updatedTag.toDto()))
        } catch (e: NotFoundException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", e.message ?: "Tag not found"))
        } catch (e: AccessDeniedException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponse("FORBIDDEN", e.message ?: "Access denied"))
        } catch (e: IllegalArgumentException) {
            ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }

    @DeleteMapping("/{id}")
    fun deleteTag(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<*>> {
        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse<Nothing>("UNAUTHORIZED", "Not authenticated"))

        return try {
            tagService.verifyTagOwnership(id, userId)
            tagService.deleteTag(id)
            ResponseEntity.noContent().build()
        } catch (e: NotFoundException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse<Nothing>("NOT_FOUND", e.message ?: "Tag not found"))
        } catch (e: AccessDeniedException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponse<Nothing>("FORBIDDEN", e.message ?: "Access denied"))
        }
    }

    @PutMapping("/notes/{noteId}/tags")
    fun setNoteTags(
        @PathVariable @ValidUuid(fieldName = "noteId") noteId: String,
        @Valid @RequestBody request: SetNoteTagsRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<List<TagDto>>> {
        val userId = getUserIdFromRequest(httpRequest)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(errorResponse("UNAUTHORIZED", "Not authenticated"))

        return try {
            tagService.verifyTagsOwnership(request.tagIds, userId)
            tagService.setNoteTags(noteId, request.tagIds)
            val tags = tagService.getNoteTags(noteId).map { it.toDto() }
            ResponseEntity.ok(successResponse(tags))
        } catch (e: NotFoundException) {
            ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", e.message ?: "Tag not found"))
        } catch (e: AccessDeniedException) {
            ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(errorResponse("FORBIDDEN", e.message ?: "Access denied"))
        }
    }

    @GetMapping("/notes/{noteId}/tags")
    fun getNoteTags(@PathVariable @ValidUuid(fieldName = "noteId") noteId: String): ResponseEntity<ApiResponse<List<TagDto>>> {
        val tags = tagService.getNoteTags(noteId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    private fun getUserIdFromRequest(request: HttpServletRequest): String? {
        val sessionId = request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
            ?: return null
        return sessionService.getUserIdFromSession(sessionId)
    }
}
