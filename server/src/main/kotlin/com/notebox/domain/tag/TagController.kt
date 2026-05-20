package com.notebox.domain.tag

import com.notebox.domain.auth.SessionService
import com.notebox.dto.*
import com.notebox.exception.AuthenticationException
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
        val tags = tagService.getAllTags(userId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(tags))
    }

    @GetMapping("/{id}")
    fun getTagById(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        request: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getUserIdFromRequest(request)
        val tag = tagService.getTagByIdForUser(id, userId)
        return ResponseEntity.ok(successResponse(tag.toDto()))
    }

    @PostMapping
    fun createTag(
        @Valid @RequestBody request: CreateTagRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getUserIdFromRequest(httpRequest)
        val tag = tagService.createTag(userId, request.name, request.color)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(tag.toDto()))
    }

    @PutMapping("/{id}")
    fun updateTag(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateTagRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<TagDto>> {
        val userId = getUserIdFromRequest(httpRequest)
        tagService.verifyTagOwnership(id, userId)
        val updatedTag = tagService.updateTag(id, request.name, request.color)
            ?: throw NotFoundException("Tag with id '$id' not found")
        return ResponseEntity.ok(successResponse(updatedTag.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteTag(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        httpRequest: HttpServletRequest
    ): ResponseEntity<Void> {
        val userId = getUserIdFromRequest(httpRequest)
        tagService.verifyTagOwnership(id, userId)
        tagService.deleteTag(id)
        return ResponseEntity.noContent().build()
    }

    @PutMapping("/notes/{noteId}/tags")
    fun setNoteTags(
        @PathVariable @ValidUuid(fieldName = "noteId") noteId: String,
        @Valid @RequestBody request: SetNoteTagsRequest,
        httpRequest: HttpServletRequest
    ): ResponseEntity<ApiResponse<List<TagDto>>> {
        val userId = getUserIdFromRequest(httpRequest)
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

    private fun getUserIdFromRequest(request: HttpServletRequest): String {
        val sessionId = request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
            ?: throw AuthenticationException("Session cookie not found")
        return sessionService.getUserIdFromSession(sessionId)
            ?: throw AuthenticationException("Invalid or expired session")
    }
}
