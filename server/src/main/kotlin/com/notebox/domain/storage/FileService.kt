package com.notebox.domain.storage

import com.notebox.exception.ValidationException
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
    private val fileValidationService: FileValidationService,
    private val fileRepository: FileRepository
) {
    companion object {
        private val KEY_PATTERN = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.[a-z]{2,5}$")
    }

    fun uploadFile(file: MultipartFile, userId: String): UploadResult {
        val validationResult = fileValidationService.validateFile(file)
        if (!validationResult.isValid) {
            throw ValidationException(validationResult.errorMessage ?: "File validation failed")
        }

        val originalFilename = file.originalFilename ?: "unknown"
        val safeName = originalFilename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val extension = safeName.substringAfterLast('.', "").lowercase()

        val fileId = UUID.randomUUID().toString()
        val key = "$fileId.$extension"

        fileStorageService.uploadFile(file, key)

        // Сохраняем метаданные файла в БД
        fileRepository.create(
            id = fileId,
            userId = userId,
            s3Key = key,
            filename = safeName,
            contentType = file.contentType,
            size = file.size
        )

        return UploadResult(
            fileId = fileId,
            filename = safeName,
            key = key,
            contentType = file.contentType,
            size = file.size
        )
    }

    fun getFileUrl(key: String, userId: String): String {
        validateKey(key)
        // Проверяем ownership файла
        fileRepository.findByS3KeyAndUserId(key, userId)
            ?: throw com.notebox.exception.AccessDeniedException("Access denied to file: $key")
        return fileStorageService.getFileUrl(key)
    }

    fun deleteFile(key: String, userId: String) {
        validateKey(key)
        // Проверяем и удаляем из БД (это также проверяет ownership)
        val deleted = fileRepository.deleteByS3Key(key, userId)
        if (!deleted) {
            throw com.notebox.exception.NotFoundException("File not found: $key")
        }
        // Удаляем из S3
        fileStorageService.deleteFile(key)
    }

    private fun validateKey(key: String) {
        if (key.contains("..") || key.contains("/") || key.contains("\\")) {
            throw ValidationException("Invalid file key: path traversal detected")
        }
        if (!KEY_PATTERN.matches(key)) {
            throw ValidationException("Invalid file key format")
        }
    }
}
