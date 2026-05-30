package com.notebox.domain.note

import com.notebox.config.BaseController
import com.notebox.dto.*
import com.notebox.validation.ValidUuid
import org.springframework.http.ResponseEntity
import org.springframework.validation.annotation.Validated
import org.springframework.web.bind.annotation.*

@Validated
@RestController
@RequestMapping("/api/public/notes")
class PublicController(
    private val noteService: NoteService
) : BaseController() {

    @GetMapping("/{token}")
    fun getPublicNote(@PathVariable @ValidUuid(fieldName = "token") token: String): ResponseEntity<ApiResponse<NoteDto>> {
        val noteDto = noteService.getPublicNote(token)
        return ResponseEntity.ok(successResponse(noteDto))
    }
}
