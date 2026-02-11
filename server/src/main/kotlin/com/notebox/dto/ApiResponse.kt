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

fun errorResponse(code: String, message: String) = ApiResponse<Any>(
    data = null,
    error = ErrorDto(code, message)
)
