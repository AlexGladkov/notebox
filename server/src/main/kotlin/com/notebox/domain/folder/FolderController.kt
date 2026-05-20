package com.notebox.domain.folder

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
@RequestMapping("/api/folders")
class FolderController(
    private val folderService: FolderService
) {

    @GetMapping
    fun getAllFolders(): ResponseEntity<ApiResponse<List<FolderDto>>> {
        val folders = folderService.getAllFolders().map { it.toDto() }
        return ResponseEntity.ok(successResponse(folders))
    }

    @GetMapping("/{id}")
    fun getFolderById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<FolderDto>> {
        val folder = folderService.getFolderById(id)
            ?: throw NotFoundException("Folder with id '$id' not found")

        return ResponseEntity.ok(successResponse(folder.toDto()))
    }

    @PostMapping
    fun createFolder(@Valid @RequestBody request: CreateFolderRequest): ResponseEntity<ApiResponse<FolderDto>> {
        val folder = folderService.createFolder(request.name, request.parentId)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(folder.toDto()))
    }

    @PutMapping("/{id}")
    fun updateFolder(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateFolderRequest
    ): ResponseEntity<ApiResponse<FolderDto>> {
        val folder = folderService.updateFolder(id, request.name, request.parentId)
            ?: throw NotFoundException("Folder with id '$id' not found")

        return ResponseEntity.ok(successResponse(folder.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteFolder(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<Void> {
        folderService.deleteFolder(id)
        return ResponseEntity.noContent().build()
    }
}
