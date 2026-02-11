package com.notebox.domain.folder

import com.notebox.dto.*
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

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
    fun getFolderById(@PathVariable id: String): ResponseEntity<ApiResponse<FolderDto>> {
        val folder = folderService.getFolderById(id)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Folder not found"))

        return ResponseEntity.ok(successResponse(folder.toDto()))
    }

    @PostMapping
    fun createFolder(@RequestBody request: CreateFolderRequest): ResponseEntity<ApiResponse<FolderDto>> {
        val folder = folderService.createFolder(request.name, request.parentId)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(folder.toDto()))
    }

    @PutMapping("/{id}")
    fun updateFolder(
        @PathVariable id: String,
        @RequestBody request: UpdateFolderRequest
    ): ResponseEntity<ApiResponse<FolderDto>> {
        val folder = folderService.updateFolder(id, request.name, request.parentId)
            ?: return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(errorResponse("NOT_FOUND", "Folder not found"))

        return ResponseEntity.ok(successResponse(folder.toDto()))
    }

    @DeleteMapping("/{id}")
    fun deleteFolder(@PathVariable id: String): ResponseEntity<Void> {
        folderService.deleteFolder(id)
        return ResponseEntity.noContent().build()
    }
}
