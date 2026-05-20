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
    private val fileStorageService: FileStorageService,
    private val fileValidationService: FileValidationService
) {

    @PostMapping("/upload")
    fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<ApiResponse<UploadFileResponse>> {
        val validationResult = fileValidationService.validateFile(file)
        if (!validationResult.isValid) {
            return ResponseEntity.badRequest()
                .body(errorResponse(validationResult.errorCode!!, validationResult.errorMessage!!))
        }

        val originalFilename = file.originalFilename ?: "unknown"
        val safeName = originalFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val extension = safeName.substringAfterLast('.', "").lowercase()

        val fileId = UUID.randomUUID().toString()
        val key = "$fileId.$extension"

        val uploadedKey = fileStorageService.uploadFile(file, key)

        val response = UploadFileResponse(
            fileId = fileId,
            filename = safeName,
            key = uploadedKey,
            contentType = file.contentType,
            size = file.size
        )

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(response))
    }

    @GetMapping("/{key}")
    fun getFileUrl(@PathVariable key: String): ResponseEntity<ApiResponse<GetFileUrlResponse>> {
        // Validate key format to prevent path traversal
        if (!isValidKey(key)) {
            return ResponseEntity.badRequest()
                .body(errorResponse("INVALID_KEY", "Invalid file key format"))
        }

        val url = fileStorageService.getFileUrl(key)
        return ResponseEntity.ok(successResponse(GetFileUrlResponse(url)))
    }

    @DeleteMapping("/{key}")
    fun deleteFile(@PathVariable key: String): ResponseEntity<ApiResponse<Nothing>> {
        if (!isValidKey(key)) {
            return ResponseEntity.badRequest()
                .body(errorResponse("INVALID_KEY", "Invalid file key format"))
        }

        fileStorageService.deleteFile(key)
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build()
    }

    private fun isValidKey(key: String): Boolean {
        // Key must match UUID.extension pattern
        // No path separators, no parent directory references
        if (key.contains("..") || key.contains("/") || key.contains("\\")) {
            return false
        }

        // Must match pattern: uuid.extension
        val pattern = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z]{2,5}$")
        return pattern.matches(key)
    }
}
