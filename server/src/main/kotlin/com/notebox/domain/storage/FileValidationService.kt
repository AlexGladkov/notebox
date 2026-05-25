package com.notebox.domain.storage

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.io.InputStream

@Service
class FileValidationService {

    companion object {
        const val MAX_FILE_SIZE = 10 * 1024 * 1024L // 10MB

        val ALLOWED_CONTENT_TYPES = setOf(
            "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
            "application/pdf", "text/plain", "text/markdown",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        val ALLOWED_EXTENSIONS = setOf(
            "jpg", "jpeg", "png", "gif", "webp", "pdf", "txt", "md", "docx", "xlsx"
        )
    }

    fun validateFile(file: MultipartFile): FileValidationResult {
        // Проверка размера ПЕРВОЙ (до чтения содержимого файла)
        if (file.size >= MAX_FILE_SIZE) {
            return FileValidationResult(
                isValid = false,
                errorCode = "FILE_TOO_LARGE",
                errorMessage = "File size ${file.size} bytes exceeds or equals maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB"
            )
        }

        if (file.isEmpty) {
            return FileValidationResult(
                isValid = false,
                errorCode = "INVALID_FILE",
                errorMessage = "File is empty"
            )
        }

        val contentType = file.contentType
        if (contentType == null || contentType !in ALLOWED_CONTENT_TYPES) {
            return FileValidationResult(
                isValid = false,
                errorCode = "INVALID_FILE_TYPE",
                errorMessage = "File type not allowed: $contentType"
            )
        }

        val originalFilename = file.originalFilename ?: "unknown"
        val safeName = originalFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val extension = safeName.substringAfterLast('.', "").lowercase()

        if (extension.isEmpty() || extension !in ALLOWED_EXTENSIONS) {
            return FileValidationResult(
                isValid = false,
                errorCode = "INVALID_EXTENSION",
                errorMessage = "File extension not allowed: $extension"
            )
        }

        if (!isValidFileType(file.inputStream.buffered(), extension)) {
            return FileValidationResult(
                isValid = false,
                errorCode = "FILE_TYPE_MISMATCH",
                errorMessage = "File content doesn't match extension"
            )
        }

        return FileValidationResult(isValid = true)
    }

    fun isValidFileType(inputStream: InputStream, extension: String): Boolean {
        val buffer = ByteArray(12)
        inputStream.mark(12)
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
            "webp" -> bytesRead >= 12 &&
                     buffer[0] == 0x52.toByte() && buffer[1] == 0x49.toByte() &&
                     buffer[2] == 0x46.toByte() && buffer[3] == 0x46.toByte() &&
                     buffer[8] == 0x57.toByte() && buffer[9] == 0x45.toByte() &&
                     buffer[10] == 0x42.toByte() && buffer[11] == 0x50.toByte()
            else -> true
        }
    }

    fun isValidExtension(extension: String): Boolean {
        return extension.lowercase() in ALLOWED_EXTENSIONS
    }
}

data class FileValidationResult(
    val isValid: Boolean,
    val errorCode: String? = null,
    val errorMessage: String? = null
)
