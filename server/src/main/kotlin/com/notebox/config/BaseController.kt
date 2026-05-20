package com.notebox.config

import com.notebox.exception.AuthenticationException
import org.springframework.security.core.context.SecurityContextHolder

/**
 * Базовый контроллер с унифицированным методом получения userId.
 * Все контроллеры, требующие аутентификации, должны наследоваться от этого класса.
 */
abstract class BaseController {
    protected fun getCurrentUserId(): String {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
            ?: throw AuthenticationException("User not authenticated")
    }
}
