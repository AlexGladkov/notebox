package com.notebox.config

import com.notebox.dto.ApiResponse
import com.notebox.dto.errorResponse
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationExceptions(ex: MethodArgumentNotValidException): ResponseEntity<ApiResponse<Nothing>> {
        val errors = ex.bindingResult.fieldErrors
            .joinToString(", ") { "${it.field}: ${it.defaultMessage}" }

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("VALIDATION_ERROR", errors))
    }

    @ExceptionHandler(MaxUploadSizeExceededException::class)
    fun handleMaxUploadSizeExceeded(ex: MaxUploadSizeExceededException): ResponseEntity<ApiResponse<Nothing>> {
        return ResponseEntity
            .status(HttpStatus.PAYLOAD_TOO_LARGE)
            .body(errorResponse("FILE_TOO_LARGE", "File size exceeds maximum allowed limit"))
    }

    @ExceptionHandler(IllegalArgumentException::class)
    fun handleIllegalArgumentException(ex: IllegalArgumentException): ResponseEntity<ApiResponse<Nothing>> {
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("INVALID_ARGUMENT", ex.message ?: "Invalid argument"))
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(ex: Exception): ResponseEntity<ApiResponse<Nothing>> {
        // Log the exception here
        ex.printStackTrace()

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
    }
}
