package com.notebox.config

import com.notebox.dto.ApiResponse
import com.notebox.dto.errorResponse
import com.notebox.exception.*
import jakarta.validation.ConstraintViolationException
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.multipart.MaxUploadSizeExceededException
import org.springframework.web.servlet.NoHandlerFoundException

@RestControllerAdvice
class GlobalExceptionHandler {
    private val logger = LoggerFactory.getLogger(javaClass)

    @ExceptionHandler(NotFoundException::class)
    fun handleNotFoundException(ex: NotFoundException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("Resource not found: {}", ex.message)
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(errorResponse("NOT_FOUND", ex.message ?: "Resource not found"))
    }

    @ExceptionHandler(AccessDeniedException::class)
    fun handleAccessDeniedException(ex: AccessDeniedException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("Access denied: {}", ex.message)
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(errorResponse("FORBIDDEN", ex.message ?: "Access denied"))
    }

    @ExceptionHandler(ValidationException::class)
    fun handleValidationException(ex: ValidationException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("Validation error: {}", ex.message)
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("VALIDATION_ERROR", ex.message ?: "Validation error"))
    }

    @ExceptionHandler(AuthenticationException::class)
    fun handleAuthenticationException(ex: AuthenticationException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("Authentication error: {}", ex.message)
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(errorResponse("UNAUTHORIZED", ex.message ?: "Not authenticated"))
    }

    @ExceptionHandler(OAuthException::class)
    fun handleOAuthException(ex: OAuthException): ResponseEntity<ApiResponse<Nothing>> {
        logger.error("OAuth error: {}", ex.message, ex.cause)
        return ResponseEntity
            .status(HttpStatus.BAD_GATEWAY)
            .body(errorResponse("OAUTH_ERROR", ex.message ?: "OAuth authentication failed"))
    }

    @ExceptionHandler(ExternalServiceException::class)
    fun handleExternalServiceException(ex: ExternalServiceException): ResponseEntity<ApiResponse<Nothing>> {
        logger.error("External service error: {}", ex.message, ex.cause)
        return ResponseEntity
            .status(HttpStatus.BAD_GATEWAY)
            .body(errorResponse("EXTERNAL_SERVICE_ERROR", ex.message ?: "External service error"))
    }

    @ExceptionHandler(CircularReferenceException::class)
    fun handleCircularReferenceException(ex: CircularReferenceException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("Circular reference detected: {}", ex.message)
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("CIRCULAR_REFERENCE", ex.message ?: "Circular reference detected"))
    }

    @ExceptionHandler(RateLimitException::class)
    fun handleRateLimitException(ex: RateLimitException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("Rate limit exceeded: {}", ex.message)
        return ResponseEntity
            .status(HttpStatus.TOO_MANY_REQUESTS)
            .body(errorResponse("RATE_LIMIT_EXCEEDED", ex.message ?: "Too many requests"))
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidationExceptions(ex: MethodArgumentNotValidException): ResponseEntity<ApiResponse<Nothing>> {
        val errors = ex.bindingResult.fieldErrors
            .joinToString(", ") { "${it.field}: ${it.defaultMessage}" }

        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(errorResponse("VALIDATION_ERROR", errors))
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<ApiResponse<Nothing>> {
        val errors = ex.constraintViolations.joinToString(", ") {
            "${it.propertyPath}: ${it.message}"
        }

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

    @ExceptionHandler(NoHandlerFoundException::class)
    fun handleNoHandlerFound(ex: NoHandlerFoundException): ResponseEntity<ApiResponse<Nothing>> {
        logger.warn("No handler found for {} {}", ex.httpMethod, ex.requestURL)
        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(errorResponse("NOT_FOUND", "Endpoint not found: ${ex.httpMethod} ${ex.requestURL}"))
    }

    @ExceptionHandler(Exception::class)
    fun handleGenericException(ex: Exception): ResponseEntity<ApiResponse<Nothing>> {
        logger.error("Unexpected error occurred", ex)

        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(errorResponse("INTERNAL_ERROR", "An unexpected error occurred"))
    }
}
