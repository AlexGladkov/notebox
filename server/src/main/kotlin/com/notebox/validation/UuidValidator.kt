package com.notebox.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext
import java.util.UUID

class UuidValidator : ConstraintValidator<ValidUuid, String?> {
    private lateinit var fieldName: String

    override fun initialize(constraintAnnotation: ValidUuid) {
        fieldName = constraintAnnotation.fieldName
    }

    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        if (value == null) return true
        return try {
            UUID.fromString(value)
            true
        } catch (e: IllegalArgumentException) {
            context.disableDefaultConstraintViolation()
            context.buildConstraintViolationWithTemplate("Invalid UUID format for field: $fieldName")
                .addConstraintViolation()
            false
        }
    }
}
