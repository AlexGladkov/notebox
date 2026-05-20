package com.notebox.exception

/**
 * Базовый класс для всех доменных исключений.
 */
sealed class DomainException(message: String, cause: Throwable? = null) : RuntimeException(message, cause)

/**
 * Ресурс не найден (HTTP 404).
 */
class NotFoundException(message: String) : DomainException(message)

/**
 * Доступ запрещён (HTTP 403).
 */
class AccessDeniedException(message: String) : DomainException(message)

/**
 * Ошибка валидации входных данных (HTTP 400).
 */
class ValidationException(message: String) : DomainException(message)

/**
 * Пользователь не аутентифицирован (HTTP 401).
 */
class AuthenticationException(message: String) : DomainException(message)

/**
 * Ошибка OAuth провайдера (HTTP 401 или 502).
 */
class OAuthException(message: String, cause: Throwable? = null) : DomainException(message, cause)

/**
 * Циклическая ссылка (HTTP 400).
 */
class CircularReferenceException(message: String) : DomainException(message)

/**
 * Ошибка внешнего сервиса (HTTP 502).
 */
class ExternalServiceException(message: String, cause: Throwable? = null) : DomainException(message, cause)

/**
 * Превышен лимит запросов (HTTP 429).
 */
class RateLimitException(message: String) : DomainException(message)
