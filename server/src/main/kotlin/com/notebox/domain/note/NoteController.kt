package com.notebox.domain.note

import com.notebox.dto.*
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
) {

    @GetMapping
    fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val notes = noteService.getAllNotesWithTags()
        return ResponseEntity.ok(successResponse(notes))
    }

    @GetMapping("/root")
    fun getRootNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val notes = noteService.getRootNotesWithTags()
        return ResponseEntity.ok(successResponse(notes))
    }

    @GetMapping("/{id}")
    fun getNoteById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<NoteDto>> {
        val noteDto = noteService.getNoteByIdWithTags(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        return ResponseEntity.ok(successResponse(noteDto))
    }

    @PostMapping
    fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
        try {
            val note = noteService.createNote(
                request.title,
                request.content,
                request.parentId,
                request.icon,
                request.backdropType,
                request.backdropValue,
                request.backdropPositionY,
                request.color
            )
            val noteDto = noteService.getNoteByIdWithTags(note.id)
                ?: return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(errorResponse("INTERNAL_ERROR", "Failed to retrieve created note"))
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(successResponse(noteDto))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }

    @PutMapping("/{id}")
    fun updateNote(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        noteService.updateNote(
            id,
            request.title,
            request.content,
            request.parentId,
            request.icon,
            request.backdropType,
            request.backdropValue,
            request.backdropPositionY,
            request.color
        )
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        val noteDto = noteService.getNoteByIdWithTags(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))
        return ResponseEntity.ok(successResponse(noteDto))
    }

    @DeleteMapping("/{id}")
    fun deleteNote(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @RequestParam(required = false, defaultValue = "cascade") action: String
    ): ResponseEntity<Void> {
        val cascadeDelete = action == "cascade"
        noteService.deleteNote(id, cascadeDelete)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/children")
    fun getChildren(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val children = noteService.getChildrenWithTags(id)
        return ResponseEntity.ok(successResponse(children))
    }

    @GetMapping("/{id}/path")
    fun getPath(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val path = noteService.getAncestorPathWithTags(id)
        return ResponseEntity.ok(successResponse(path))
    }

    @PutMapping("/{id}/move")
    fun moveNote(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: MoveNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        try {
            noteService.moveNote(id, request.parentId)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Note not found"))
            val noteDto = noteService.getNoteByIdWithTags(id)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Note not found"))
            return ResponseEntity.ok(successResponse(noteDto))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }
}
