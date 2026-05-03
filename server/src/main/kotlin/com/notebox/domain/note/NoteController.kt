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
    private val noteService: NoteService,
    private val noteRepository: NoteRepository
) {

    @GetMapping
    fun getAllNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val notes = noteService.getAllNotes()
        val noteIds = notes.map { it.id }
        val tagsMap = noteRepository.findTagsForNotes(noteIds)

        val notesWithTags = notes.map { note ->
            val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
            note.toDto(tags)
        }

        return ResponseEntity.ok(successResponse(notesWithTags))
    }

    @GetMapping("/root")
    fun getRootNotes(): ResponseEntity<ApiResponse<List<NoteDto>>> {
        val notes = noteService.getRootNotes()
        val noteIds = notes.map { it.id }
        val tagsMap = noteRepository.findTagsForNotes(noteIds)

        val notesWithTags = notes.map { note ->
            val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
            note.toDto(tags)
        }

        return ResponseEntity.ok(successResponse(notesWithTags))
    }

    @GetMapping("/{id}")
    fun getNoteById(@PathVariable id: String): ResponseEntity<ApiResponse<NoteDto>> {
        ValidationUtils.validateUUID(id, "id")
        val note = noteService.getNoteById(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        val tags = noteRepository.findTagsByNoteId(id).map { it.toDto() }
        return ResponseEntity.ok(successResponse(note.toDto(tags)))
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
                request.backdropPositionY,
                request.color
            )
            val tags = noteRepository.findTagsByNoteId(note.id).map { it.toDto() }
            return ResponseEntity.status(HttpStatus.CREATED)
                .body(successResponse(note.toDto(tags)))
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
            request.backdropPositionY,
            request.color
        )
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Note not found"))

        val tags = noteRepository.findTagsByNoteId(id).map { it.toDto() }
        return ResponseEntity.ok(successResponse(note.toDto(tags)))
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
        val children = noteService.getChildren(id)
        val noteIds = children.map { it.id }
        val tagsMap = noteRepository.findTagsForNotes(noteIds)

        val childrenWithTags = children.map { note ->
            val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
            note.toDto(tags)
        }

        return ResponseEntity.ok(successResponse(childrenWithTags))
    }

    @GetMapping("/{id}/path")
    fun getPath(@PathVariable id: String): ResponseEntity<ApiResponse<List<NoteDto>>> {
        ValidationUtils.validateUUID(id, "id")
        val path = noteService.getAncestorPath(id)
        val noteIds = path.map { it.id }
        val tagsMap = noteRepository.findTagsForNotes(noteIds)

        val pathWithTags = path.map { note ->
            val tags = tagsMap[note.id]?.map { it.toDto() } ?: emptyList()
            note.toDto(tags)
        }

        return ResponseEntity.ok(successResponse(pathWithTags))
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
            val tags = noteRepository.findTagsByNoteId(id).map { it.toDto() }
            return ResponseEntity.ok(successResponse(note.toDto(tags)))
        } catch (e: IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(errorResponse("VALIDATION_ERROR", e.message ?: "Invalid request"))
        }
    }
}
