package com.notebox.domain.note

import com.notebox.dto.*
import com.notebox.util.ValidationUtils
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/notes")
class NoteController(
    private val noteService: NoteService
) {

    @GetMapping
    fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val notes = noteService.getAllNotes().map { it.toDto() }
        return ResponseEntity.ok(successResponse(notes))
    }

    @GetMapping("/root")
    fun getRootNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val notes = noteService.getRootNotes().map { it.toDto() }
        return ResponseEntity.ok(successResponse(notes))
    }

    @GetMapping("/{id}")
    fun getNoteById(@PathVariable id: String): ResponseEntity<ApiResponse<NoteDto>> {
        ValidationUtils.validateUUID(id, "id")
        val note = noteService.getNoteById(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        return ResponseEntity.ok(successResponse(note.toDto()))
    }

    @PostMapping
    fun createNote(@Valid @RequestBody request: CreateNoteRequest): ResponseEntity<ApiResponse<NoteDto>> {
        if (request.parentId != null) {
            ValidationUtils.validateUUID(request.parentId, "parentId")
        }
        try {
            val note = noteService.createNote(
                request.title,
                request.content,
                request.parentId,
                request.icon,
                request.backdropType,
                request.backdropValue,
                request.backdropPositionY
            )
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(successResponse(note.toDto()))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }

    @PutMapping("/{id}")
    fun updateNote(
        @PathVariable id: String,
        @Valid @RequestBody request: UpdateNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        ValidationUtils.validateUUID(id, "id")
        if (request.parentId != null) {
            ValidationUtils.validateUUID(request.parentId, "parentId")
        }
        val note = noteService.updateNote(
            id,
            request.title,
            request.content,
            request.parentId,
            request.icon,
            request.backdropType,
            request.backdropValue,
            request.backdropPositionY
        )
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        return ResponseEntity.ok(successResponse(note.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteNote(
        @PathVariable id: String,
        @RequestParam(required = false, defaultValue = "cascade") action: String
    ): ResponseEntity<Void> {
        ValidationUtils.validateUUID(id, "id")
        val cascadeDelete = action == "cascade"
        noteService.deleteNote(id, cascadeDelete)
        return ResponseEntity.noContent().build()
    }

    @GetMapping("/{id}/children")
    fun getChildren(@PathVariable id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        ValidationUtils.validateUUID(id, "id")
        val children = noteService.getChildren(id).map { it.toDto() }
        return ResponseEntity.ok(successResponse(children))
    }

    @GetMapping("/{id}/path")
    fun getPath(@PathVariable id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        ValidationUtils.validateUUID(id, "id")
        val path = noteService.getAncestorPath(id).map { it.toDto() }
        return ResponseEntity.ok(successResponse(path))
    }

    @PutMapping("/{id}/move")
    fun moveNote(
        @PathVariable id: String,
        @RequestBody request: MoveNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        ValidationUtils.validateUUID(id, "id")
        if (request.parentId != null) {
            ValidationUtils.validateUUID(request.parentId, "parentId")
        }
        try {
            val note = noteService.moveNote(id, request.parentId)
                ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(errorResponse("NOT_FOUND", "Note not found"))
            return ResponseEntity.ok(successResponse(note.toDto()))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }
}
