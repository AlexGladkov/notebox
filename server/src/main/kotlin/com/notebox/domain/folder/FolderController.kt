package com.notebox.domain.folder

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
@RequestMapping("/api/folders")
class FolderController(
    private val folderService: FolderService
) : BaseController() {

    @GetMapping
    fun getAllFolders(): ResponseEntity<ApiResponse<List<FolderDto>>> {
        val userId = getCurrentUserId()
        val folders = folderService.getAllFolders(userId).map { it.toDto() }
        return ResponseEntity.ok(successResponse(folders))
    }

    @GetMapping("/{id}")
    fun getFolderById(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<ApiResponse<FolderDto>> {
        val userId = getCurrentUserId()
        val folder = folderService.getFolderById(id, userId)
            ?: throw NotFoundException("Folder with id '$id' not found")

        return ResponseEntity.ok(successResponse(folder.toDto()))
    }

    @PostMapping
    fun createFolder(@Valid @RequestBody request: CreateFolderRequest): ResponseEntity<ApiResponse<FolderDto>> {
        val userId = getCurrentUserId()
        val folder = folderService.createFolder(userId, request.name, request.parentId)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(folder.toDto()))
    }

    @PutMapping("/{id}")
    fun updateFolder(
        @PathVariable @ValidUuid(fieldName = "id") id: String,
        @Valid @RequestBody request: UpdateFolderRequest
    ): ResponseEntity<ApiResponse<FolderDto>> {
        val userId = getCurrentUserId()
        val folder = folderService.updateFolder(id, userId, request.name, request.parentId)
            ?: throw NotFoundException("Folder with id '$id' not found")

        return ResponseEntity.ok(successResponse(folder.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteFolder(@PathVariable @ValidUuid(fieldName = "id") id: String): ResponseEntity<Void> {
        val userId = getCurrentUserId()
        folderService.deleteFolder(id, userId)
        return ResponseEntity.noContent().build()
    }
}
