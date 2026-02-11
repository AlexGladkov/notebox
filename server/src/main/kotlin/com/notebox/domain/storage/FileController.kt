package com.notebox.domain.storage

import com.notebox.dto.ApiResponse
import com.notebox.dto.errorResponse
import com.notebox.dto.successResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.util.*

data class UploadFileResponse(
    val fileId: String,
    val filename: String,
    val key: String,
    val contentType: String?,
    val size: Long
)

data class GetFileUrlResponse(
    val url: String
)

@RestController
@RequestMapping("/api/files")
class FileController(
    private val fileStorageService: FileStorageService
) {

    @PostMapping("/upload")
    fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<ApiResponse<UploadFileResponse>> {
        if (file.isEmpty) {
            return ResponseEntity.badRequest()
                .body(errorResponse("INVALID_FILE", "File is empty"))
        }

        // Generate unique key for the file
        val fileId = UUID.randomUUID().toString()
        val extension = file.originalFilename?.substringAfterLast('.', "") ?: ""
        val key = if (extension.isNotEmpty()) "$fileId.$extension" else fileId

        val uploadedKey = fileStorageService.uploadFile(file, key)

        val response = UploadFileResponse(
            fileId = fileId,
            filename = file.originalFilename ?: "unknown",
            key = uploadedKey,
            contentType = file.contentType,
            size = file.size
        )

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(response))
    }

    @GetMapping("/{key}")
    fun getFileUrl(@PathVariable key: String): ResponseEntity<ApiResponse<GetFileUrlResponse>> {
        val url = fileStorageService.getFileUrl(key)
        return ResponseEntity.ok(successResponse(GetFileUrlResponse(url)))
    }

    @DeleteMapping("/{key}")
    fun deleteFile(@PathVariable key: String): ResponseEntity<Void> {
        fileStorageService.deleteFile(key)
        return ResponseEntity.noContent().build()
    }
}
