package com.notebox.domain.storage

import com.notebox.dto.ApiResponse
import com.notebox.dto.errorResponse
import com.notebox.dto.successResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.io.InputStream
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

    companion object {
        private val ALLOWED_CONTENT_TYPES = setOf(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
            "application/pdf", "text/plain", "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        private val ALLOWED_EXTENSIONS = setOf(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "md", "docx", "xlsx"
        )
    }

    @PostMapping("/upload")
    fun uploadFile(@RequestParam("file") file: MultipartFile): ResponseEntity<ApiResponse<UploadFileResponse>> {
        if (file.isEmpty) {
            return ResponseEntity.badRequest()
                .body(errorResponse("INVALID_FILE", "File is empty"))
        }

        // Validate content type
        val contentType = file.contentType
        if (contentType == null || contentType !in ALLOWED_CONTENT_TYPES) {
            return ResponseEntity.badRequest()
                .body(errorResponse("INVALID_FILE_TYPE", "File type not allowed: $contentType"))
        }

        // Sanitize and validate filename
        val originalFilename = file.originalFilename ?: "unknown"
        val safeName = originalFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val extension = safeName.substringAfterLast('.', "").lowercase()

        // Validate extension
        if (extension.isEmpty() || extension !in ALLOWED_EXTENSIONS) {
            return ResponseEntity.badRequest()
                .body(errorResponse("INVALID_EXTENSION", "File extension not allowed: $extension"))
        }

        // Validate magic bytes (file signature)
        if (!isValidFileType(file.inputStream, extension)) {
            return ResponseEntity.badRequest()
                .body(errorResponse("FILE_TYPE_MISMATCH", "File content doesn't match extension"))
        }

        // Generate unique key for the file
        val fileId = UUID.randomUUID().toString()
        val key = "$fileId.$extension"

        val uploadedKey = fileStorageService.uploadFile(file, key)

        val response = UploadFileResponse(
            fileId = fileId,
            filename = safeName,
            key = uploadedKey,
            contentType = contentType,
            size = file.size
        )

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(successResponse(response))
    }

    private fun isValidFileType(inputStream: InputStream, extension: String): Boolean {
        val buffer = ByteArray(8)
        inputStream.mark(8)
        val bytesRead = inputStream.read(buffer)
        inputStream.reset()

        if (bytesRead < 2) return false

        return when (extension) {
            "jpg", "jpeg" -> buffer[0] == 0xFF.toByte() && buffer[1] == 0xD8.toByte()
            "png" -> buffer[0] == 0x89.toByte() && buffer[1] == 0x50.toByte() &&
                     buffer[2] == 0x4E.toByte() && buffer[3] == 0x47.toByte()
            "gif" -> buffer[0] == 0x47.toByte() && buffer[1] == 0x49.toByte() &&
                     buffer[2] == 0x46.toByte()
            "pdf" -> buffer[0] == 0x25.toByte() && buffer[1] == 0x50.toByte() &&
                     buffer[2] == 0x44.toByte() && buffer[3] == 0x46.toByte()
            "webp" -> String(buffer.sliceArray(8..11), Charsets.US_ASCII) == "WEBP"
            else -> true // For text and office files, trust content-type validation
        }
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
    fun deleteFile(@PathVariable key: String): ResponseEntity<Void> {
        // Validate key format to prevent path traversal
        if (!isValidKey(key)) {
            return ResponseEntity.badRequest().build()
        }

        fileStorageService.deleteFile(key)
        return ResponseEntity.noContent().build()
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
