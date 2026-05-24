package com.notebox.config

import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.module.kotlin.KotlinFeature
import com.fasterxml.jackson.module.kotlin.KotlinModule
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder

/**
 * Jackson configuration для корректной работы с Kotlin data classes.
 *
 * Обеспечивает:
 * - Правильную обработку nullable полей и значений по умолчанию Kotlin
 * - Сериализацию дат в ISO-8601 формате (для Instant/LocalDateTime типов)
 * - Строгую проверку null значений (StrictNullChecks)
 *
 * Примечание: для timestamp полей используйте Long (миллисекунды) в DTO,
 * как в существующих NoteDto, ReminderDto и т.д.
 */
@Configuration
class JacksonConfig {

    @Bean
    fun objectMapper(builder: Jackson2ObjectMapperBuilder): ObjectMapper {
        return builder
            .modules(
                KotlinModule.Builder()
                    .withReflectionCacheSize(512)
                    .configure(KotlinFeature.NullToEmptyCollection, false)
                    .configure(KotlinFeature.NullToEmptyMap, false)
                    .configure(KotlinFeature.NullIsSameAsDefault, false)
                    .configure(KotlinFeature.SingletonSupport, true)
                    .configure(KotlinFeature.StrictNullChecks, true)
                    .build()
            )
            // Сериализация дат в ISO-8601 формате (не влияет на Long поля)
            .featuresToDisable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            // Игнорировать null поля при сериализации
            .serializationInclusion(JsonInclude.Include.NON_NULL)
            // Не падать на неизвестные свойства (совместимость вперед)
            .featuresToDisable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .build()
    }
}
