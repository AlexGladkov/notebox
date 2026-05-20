package com.notebox.util

import java.util.UUID

@Deprecated(
    message = "Use @ValidUuid annotation instead for declarative validation",
    replaceWith = ReplaceWith("@ValidUuid", "com.notebox.validation.ValidUuid")
)
object ValidationUtils {
    private val UUID_PATTERN = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

    @Deprecated("Use @ValidUuid annotation on path variables and request body fields")
    fun isValidUUID(id: String): Boolean {
        if (!UUID_PATTERN.matches(id)) {
            return false
        }
        return try {
            UUID.fromString(id)
            true
        } catch (e: IllegalArgumentException) {
            false
        }
    }

    @Deprecated("Use @ValidUuid annotation on path variables and request body fields")
    fun validateUUID(id: String, fieldName: String = "id") {
        if (!isValidUUID(id)) {
            throw IllegalArgumentException("Invalid $fieldName format: must be a valid UUID")
        }
    }
}
