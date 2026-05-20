package com.notebox.domain.note

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
@RequestMapping("/api/notes")
class NoteController(
    private val noteService: NoteService
) : BaseController() {

    @GetMapping
    fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val userId = getCurrentUserId()
        val notes = noteService.getAllNotesWithTags(userId)
        return ResponseEntity.ok(successResponse(notes))
    }

    @GetMapping("/root")
    fun getRootNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val userId = getCurrentUserId()
        val notes = noteService.getRootNotesWithTags(userId)
        return ResponseEntity.ok(successResponse(notes))
    }

    @GetMapping("/{id}")
    fun getNoteById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<NoteDto>> {
        val userId = getCurrentUserId()
        val noteDto = noteService.getNoteByIdWithTags(id, userId)
            ?: throw NotFoundException("Note with id '$id' not found")

        return ResponseEntity.ok(successResponse(noteDto))
    }

    @PostMapping
    fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
        val userId = getCurrentUserId()
        val note = noteService.createNote(
            userId,
            request.title,
            request.content,
            request.parentId,
            request.icon,
            request.backdropType,
            request.backdropValue,
            request.backdropPositionY,
            request.color
        )
        val noteDto = noteService.getNoteByIdWithTags(note.id, userId)
            ?: throw NotFoundException("Failed to retrieve created note")
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(noteDto))
    }

    @PutMapping("/{id}")
    fun updateNote(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        val userId = getCurrentUserId()
        noteService.updateNote(
            id,
            userId,
            request.title,
            request.content,
            request.parentId,
            request.icon,
            request.backdropType,
            request.backdropValue,
            request.backdropPositionY,
            request.color
        ) ?: throw NotFoundException("Note with id '$id' not found")

        val noteDto = noteService.getNoteByIdWithTags(id, userId)
            ?: throw NotFoundException("Note with id '$id' not found")
        return ResponseEntity.ok(successResponse(noteDto))
    }

    @DeleteMapping("/{id}")
    fun deleteNote(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @RequestParam(required = false, defaultValue = "cascade") action: String
    ): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        val cascadeDelete = action == "cascade"
        noteService.deleteNote(id, userId, cascadeDelete)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/children")
    fun getChildren(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val userId = getCurrentUserId()
        val children = noteService.getChildrenWithTags(id, userId)
        return ResponseEntity.ok(successResponse(children))
    }

    @GetMapping("/{id}/path")
    fun getPath(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val userId = getCurrentUserId()
        val path = noteService.getAncestorPathWithTags(id, userId)
        return ResponseEntity.ok(successResponse(path))
    }

    @PutMapping("/{id}/move")
    fun moveNote(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: MoveNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        val userId = getCurrentUserId()
        noteService.moveNote(id, userId, request.parentId)
            ?: throw NotFoundException("Note with id '$id' not found")
        val noteDto = noteService.getNoteByIdWithTags(id, userId)
            ?: throw NotFoundException("Note with id '$id' not found")
        return ResponseEntity.ok(successResponse(noteDto))
    }
}
