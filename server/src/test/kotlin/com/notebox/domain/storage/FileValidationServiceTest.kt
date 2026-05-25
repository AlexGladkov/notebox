package com.notebox.domain.storage

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockMultipartFile

/**
 * Unit-тесты для FileValidationService.
 *
 * Проверяют корректную валидацию файлов, включая проверку размера,
 * типа контента, расширения и magic bytes.
 */
class FileValidationServiceTest {

    private val fileValidationService = FileValidationService()

    /**
     * Regression test для бага: S3StorageService.uploadFile doesn't validate file size limit
     *
     * Проверяет, что файлы превышающие MAX_FILE_SIZE (10MB) отклоняются
     * с корректным errorCode "FILE_TOO_LARGE".
     */
    @Test
    fun `validateFile rejects files exceeding MAX_FILE_SIZE`() {
        // Arrange: создаём файл размером 11MB (больше лимита 10MB)
        val largeFile = MockMultipartFile(
            "file",
            "large-image.png",
            "image/png",
            ByteArray(11 * 1024 * 1024) // 11MB > 10MB limit
        )

        // Act: валидируем файл
        val result = fileValidationService.validateFile(largeFile)

        // Assert: файл должен быть отклонён с правильным errorCode
        assertFalse(result.isValid, "Файл размером 11MB должен быть отклонён")
        assertEquals("FILE_TOO_LARGE", result.errorCode, "errorCode должен быть FILE_TOO_LARGE")
        assertNotNull(result.errorMessage, "Должно быть сообщение об ошибке")
        assertTrue(
            result.errorMessage!!.contains("exceeds maximum allowed size"),
            "Сообщение об ошибке должно содержать информацию о превышении лимита"
        )
    }

    /**
     * Проверяет, что файлы размером точно 10MB (граничное значение) отклоняются.
     */
    @Test
    fun `validateFile rejects files exactly at MAX_FILE_SIZE`() {
        // Arrange: создаём файл размером ровно 10MB
        val exactLimitFile = MockMultipartFile(
            "file",
            "exact-limit.png",
            "image/png",
            ByteArray(10 * 1024 * 1024) // Ровно 10MB
        )

        // Act
        val result = fileValidationService.validateFile(exactLimitFile)

        // Assert: файл должен быть отклонён (так как size > MAX_FILE_SIZE, не >=)
        assertFalse(result.isValid, "Файл размером ровно 10MB должен быть отклонён")
        assertEquals("FILE_TOO_LARGE", result.errorCode)
    }

    /**
     * Проверяет, что валидные файлы размером меньше MAX_FILE_SIZE принимаются.
     */
    @Test
    fun `validateFile accepts valid files under MAX_FILE_SIZE`() {
        // Arrange: создаём валидный PNG файл размером 5MB (меньше лимита)
        // PNG magic bytes: 89 50 4E 47
        val pngHeader = byteArrayOf(
            0x89.toByte(), 0x50.toByte(), 0x4E.toByte(), 0x47.toByte(),
            0x0D.toByte(), 0x0A.toByte(), 0x1A.toByte(), 0x0A.toByte()
        )
        val fileContent = pngHeader + ByteArray(5 * 1024 * 1024 - pngHeader.size) // 5MB total

        val validFile = MockMultipartFile(
            "file",
            "valid-image.png",
            "image/png",
            fileContent
        )

        // Act
        val result = fileValidationService.validateFile(validFile)

        // Assert: файл должен пройти валидацию
        assertTrue(result.isValid, "Валидный PNG файл размером 5MB должен быть принят")
        assertNull(result.errorCode, "errorCode должен быть null для валидного файла")
        assertNull(result.errorMessage, "errorMessage должен быть null для валидного файла")
    }

    /**
     * Проверяет, что файлы размером чуть меньше лимита (9.9MB) принимаются.
     */
    @Test
    fun `validateFile accepts files just under MAX_FILE_SIZE`() {
        // Arrange: создаём файл размером 9.9MB
        val pngHeader = byteArrayOf(
            0x89.toByte(), 0x50.toByte(), 0x4E.toByte(), 0x47.toByte(),
            0x0D.toByte(), 0x0A.toByte(), 0x1A.toByte(), 0x0A.toByte()
        )
        val fileSize = (9.9 * 1024 * 1024).toInt()
        val fileContent = pngHeader + ByteArray(fileSize - pngHeader.size)

        val nearLimitFile = MockMultipartFile(
            "file",
            "near-limit.png",
            "image/png",
            fileContent
        )

        // Act
        val result = fileValidationService.validateFile(nearLimitFile)

        // Assert
        assertTrue(result.isValid, "Файл размером 9.9MB должен быть принят")
        assertNull(result.errorCode)
    }

    /**
     * Проверяет, что проверка размера происходит ДО других валидаций
     * (не читается содержимое файла для больших файлов).
     */
    @Test
    fun `validateFile checks size before content validation`() {
        // Arrange: создаём большой файл с НЕПРАВИЛЬНЫМ content-type
        val largeInvalidFile = MockMultipartFile(
            "file",
            "large.exe",
            "application/x-executable", // Неразрешённый тип
            ByteArray(15 * 1024 * 1024) // 15MB
        )

        // Act
        val result = fileValidationService.validateFile(largeInvalidFile)

        // Assert: должна сработать проверка размера, а не типа файла
        assertFalse(result.isValid)
        assertEquals(
            "FILE_TOO_LARGE",
            result.errorCode,
            "Проверка размера должна сработать до проверки content-type"
        )
    }

    /**
     * Проверяет, что пустые файлы всё ещё корректно отклоняются.
     */
    @Test
    fun `validateFile rejects empty files`() {
        // Arrange
        val emptyFile = MockMultipartFile(
            "file",
            "empty.png",
            "image/png",
            ByteArray(0)
        )

        // Act
        val result = fileValidationService.validateFile(emptyFile)

        // Assert
        assertFalse(result.isValid)
        assertEquals("INVALID_FILE", result.errorCode)
    }
}
