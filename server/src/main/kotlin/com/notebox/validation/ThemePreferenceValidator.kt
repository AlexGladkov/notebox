package com.notebox.validation

import jakarta.validation.ConstraintValidator
import jakarta.validation.ConstraintValidatorContext

class ThemePreferenceValidator : ConstraintValidator<ValidThemePreference, String?> {
    companion object {
        val VALID_THEMES = setOf("light", "dark", "system")
    }

    override fun isValid(value: String?, context: ConstraintValidatorContext): Boolean {
        if (value == null) return true
        return value in VALID_THEMES
    }
}
