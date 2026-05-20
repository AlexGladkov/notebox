package com.notebox.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import java.util.UUID

class UuidListValidator : ConstraintValidator<ValidUuidList, List<String>?> {
    override fun isValid(value: List<String>?, context: ConstraintValidatorContext): Boolean {
        if (value == null) return true

        return value.all { item ->
            try {
                UUID.fromString(item)
                true
            } catch (e: IllegalArgumentException) {
                false
            }
        }
    }
}
