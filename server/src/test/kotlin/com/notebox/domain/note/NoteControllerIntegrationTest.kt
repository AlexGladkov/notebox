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
     * Regression test для бага: "NoteController.updateNote returns 200 OK even when note doesn't exist"
     *
     * Проверяет, что PUT /api/notes/{id} с несуществующим UUID:
     * - Возвращает HTTP 404 Not Found (не 200 OK)
     * - Возвращает корректную JSON структуру ошибки с кодом "NOT_FOUND"
     * - Включает ID несуществующей заметки в сообщение об ошибке
     *
     * Исправлено в commit 984df85 (20 мая 2026):
     * - Добавлена проактивная проверка существования в NoteService.kt:84-85
     * - Добавлена резервная проверка в NoteController.kt:80
     *
     * @see <a href="specs/bugs/BUG_DIAGNOSTIC_notecontroller_updatenote_returns_200_ok_even_when.md">Bug Diagnostic Report</a>
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
            .andExpect(jsonPath("$.error.message").value(org.hamcrest.Matchers.containsString(nonExistentId)))
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
