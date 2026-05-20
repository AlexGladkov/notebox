package com.notebox.validation

import jakarta.validation.Constraint
import jakarta.validation.Payload
import kotlin.reflect.KClass

@Target(AnnotationTarget.FIELD, AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
@Constraint(validatedBy = [ThemePreferenceValidator::class])
annotation class ValidThemePreference(
    val message: String = "Invalid theme preference. Allowed values: light, dark, system",
    val groups: Array<KClass<*>> = [],
    val payload: Array<KClass<out Payload>> = []
)
