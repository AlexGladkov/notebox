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
    fun getAllNotes(@RequestParam(required = false) folderId: String?): ResponseEntity<ApiResponse<List<NoteDto>>> {
        if (folderId != null) {
            ValidationUtils.validateUUID(folderId, "folderId")
        }
        val notes = noteService.getAllNotes(folderId).map { it.toDto() }
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
        ValidationUtils.validateUUID(request.folderId, "folderId")
        val note = noteService.createNote(request.title, request.content, request.folderId)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(note.toDto()))
    }

    @PutMapping("/{id}")
    fun updateNote(
        @PathVariable id: String,
        @Valid @RequestBody request: UpdateNoteRequest
    ): ResponseEntity<ApiResponse<NoteDto>> {
        ValidationUtils.validateUUID(id, "id")
        if (request.folderId != null) {
            ValidationUtils.validateUUID(request.folderId, "folderId")
        }
        val note = noteService.updateNote(id, request.title, request.content, request.folderId)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        return ResponseEntity.ok(successResponse(note.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteNote(@PathVariable id: String): ResponseEntity<Void> {
        ValidationUtils.validateUUID(id, "id")
        noteService.deleteNote(id)
        return ResponseEntity.noContent().build()
    }
}
