package com.notebox.util

import java.util.UUID

object ValidationUtils {
    private val UUID_PATTERN = Regex("^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

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

    fun validateUUID(id: String, fieldName: String = "id") {
        if (!isValidUUID(id)) {
            throw IllegalArgumentException("Invalid $fieldName format: must be a valid UUID")
        }
    }
}
