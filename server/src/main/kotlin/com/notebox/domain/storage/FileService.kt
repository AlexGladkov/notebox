package com.notebox.domain.storage

import org.springframework.stereotype.Service
import org.springframework.web.multipart.MultipartFile
import java.util.*

data class UploadResult(
    val fileId: String,
    val filename: String,
    val key: String,
    val contentType: String?,
    val size: Long
)

/**
 * Сервис для бизнес-логики работы с файлами.
 * Отвечает за генерацию ключей, валидацию и координацию загрузки.
 */
@Service
class FileService(
    private val fileStorageService: FileStorageService,
    private val fileValidationService: FileValidationService
) {
    companion object {
        private val KEY_PATTERN = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z]{2,5}$")
    }

    fun uploadFile(file: MultipartFile): UploadResult {
        val validationResult = fileValidationService.validateFile(file)
        if (!validationResult.isValid) {
            throw IllegalArgumentException(validationResult.errorMessage)
        }

        val originalFilename = file.originalFilename ?: "unknown"
        val safeName = originalFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val extension = safeName.substringAfterLast('.', "").lowercase()

        val fileId = UUID.randomUUID().toString()
        val key = "$fileId.$extension"

        fileStorageService.uploadFile(file, key)

        return UploadResult(
            fileId = fileId,
            filename = safeName,
            key = key,
            contentType = file.contentType,
            size = file.size
        )
    }

    fun getFileUrl(key: String): String {
        validateKey(key)
        return fileStorageService.getFileUrl(key)
    }

    fun deleteFile(key: String) {
        validateKey(key)
        fileStorageService.deleteFile(key)
    }

    private fun validateKey(key: String) {
        if (key.contains("..") || key.contains("/") || key.contains("\\")) {
            throw IllegalArgumentException("Invalid file key: path traversal detected")
        }
        if (!KEY_PATTERN.matches(key)) {
            throw IllegalArgumentException("Invalid file key format")
        }
    }
}
