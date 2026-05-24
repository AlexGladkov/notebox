package com.notebox.domain.note

import com.fasterxml.jackson.databind.ObjectMapper
import com.notebox.dto.UpdateNoteRequest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.hamcrest.Matchers.containsString
import java.util.*

/**
 * Интеграционные тесты для NoteController.
 *
 * Эти тесты проверяют корректное поведение API endpoints,
 * особенно обработку edge cases и ошибочных сценариев.
 */
@SpringBootTest
@AutoConfigureMockMvc
class NoteControllerIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    /**
     * Regression test: проверяет, что PUT /api/notes/{id} с несуществующим UUID
     * возвращает HTTP 404 Not Found с корректной структурой ошибки.
     */
    @Test
    fun `updateNote with non-existent ID returns 404 Not Found`() {
        // Arrange: создаём несуществующий UUID и mock authentication
        val testUserId = "test-user-${UUID.randomUUID()}"
        val nonExistentId = UUID.randomUUID().toString()
        val updateRequest = UpdateNoteRequest(
            title = "Test Title",
            content = "Test Content"
        )
        val requestBody = objectMapper.writeValueAsString(updateRequest)

        // Создаём authentication token с userId в качестве principal
        val auth = UsernamePasswordAuthenticationToken(testUserId, null, emptyList())

        // Act & Assert: проверяем, что API возвращает 404
        mockMvc.perform(
            put("/api/notes/$nonExistentId")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody)
        )
            .andExpect(status().isNotFound)
            .andExpect(content().contentType(MediaType.APPLICATION_JSON))
            .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
            .andExpect(jsonPath("$.error.message").value(containsString(nonExistentId)))
    }

    /**
     * Дополнительный тест для проверки различных несуществующих UUID форматов
     */
    @Test
    fun `updateNote with multiple non-existent IDs returns 404 Not Found`() {
        val testUserId = "test-user-${UUID.randomUUID()}"
        val testCases = listOf(
            "00000000-0000-0000-0000-000000000000",
            "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            "ffffffff-ffff-ffff-ffff-ffffffffffff"
        )

        val updateRequest = UpdateNoteRequest(
            title = "Test",
            content = "Test"
        )
        val requestBody = objectMapper.writeValueAsString(updateRequest)
        val auth = UsernamePasswordAuthenticationToken(testUserId, null, emptyList())

        testCases.forEach { testId ->
            mockMvc.perform(
                put("/api/notes/$testId")
                    .with(authentication(auth))
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestBody)
            )
                .andExpect(status().isNotFound)
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"))
        }
    }
}
