package com.notebox.dto

data class ApiResponse<T>(
    val data: T?,
    val error: ErrorDto? = null
)

data class ErrorDto(
    val code: String,
    val message: String
)

fun <T> successResponse(data: T) = ApiResponse(data = data, error = null)

fun <T> errorResponse(code: String, message: String) = ApiResponse<T>(
    data = null,
    error = ErrorDto(code, message)
)
