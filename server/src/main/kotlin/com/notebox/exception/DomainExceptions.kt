package com.notebox.exception

/**
 * Исключение, когда запрашиваемая сущность не найдена.
 */
class NotFoundException(message: String) : RuntimeException(message)

/**
 * Исключение, когда доступ к ресурсу запрещён.
 */
class AccessDeniedException(message: String) : RuntimeException(message)
