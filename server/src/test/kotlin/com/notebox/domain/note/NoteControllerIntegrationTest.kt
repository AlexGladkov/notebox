package com.notebox.domain.note

import com.fasterxml.jackson.databind.ObjectMapper
import com.notebox.dto.CreateNoteRequest
import com.notebox.dto.UpdateNoteRequest
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.hasSize
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

    /**
     * Regression test: проверяет, что GET /api/notes?folderId={uuid}
     * возвращает только дочерние заметки указанной папки
     */
    @Test
    fun `getAllNotes with folderId returns only children of that folder`() {
        // Arrange: создаём родительскую заметку (папку) и дочернюю заметку
        val testUserId = "test-user-${UUID.randomUUID()}"
        val auth = UsernamePasswordAuthenticationToken(testUserId, null, emptyList())

        // Создаём родительскую заметку (папку)
        val parentRequest = CreateNoteRequest(
            title = "Parent Folder",
            content = "Parent content"
        )
        val parentResponse = mockMvc.perform(
            post("/api/notes")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(parentRequest))
        )
            .andExpect(status().isCreated)
            .andReturn()

        val parentId = objectMapper.readTree(parentResponse.response.contentAsString)
            .get("data").get("id").asText()

        // Создаём дочернюю заметку
        val childRequest = CreateNoteRequest(
            title = "Child Note",
            content = "Child content",
            parentId = parentId
        )
        mockMvc.perform(
            post("/api/notes")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(childRequest))
        )
            .andExpect(status().isCreated)

        // Создаём ещё одну заметку без parentId
        val otherRequest = CreateNoteRequest(
            title = "Other Note",
            content = "Other content"
        )
        mockMvc.perform(
            post("/api/notes")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(otherRequest))
        )
            .andExpect(status().isCreated)

        // Act & Assert: проверяем, что GET /api/notes?folderId={parentId} возвращает только дочернюю заметку
        mockMvc.perform(
            get("/api/notes")
                .param("folderId", parentId)
                .with(authentication(auth))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data", hasSize<Int>(1)))
            .andExpect(jsonPath("$.data[0].title").value("Child Note"))
            .andExpect(jsonPath("$.data[0].parentId").value(parentId))
    }

    /**
     * Regression test: проверяет, что GET /api/notes без folderId
     * возвращает все заметки пользователя
     */
    @Test
    fun `getAllNotes without folderId returns all user notes`() {
        // Arrange: создаём несколько заметок
        val testUserId = "test-user-${UUID.randomUUID()}"
        val auth = UsernamePasswordAuthenticationToken(testUserId, null, emptyList())

        val note1 = CreateNoteRequest(title = "Note 1", content = "Content 1")
        val note2 = CreateNoteRequest(title = "Note 2", content = "Content 2")

        mockMvc.perform(
            post("/api/notes")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(note1))
        ).andExpect(status().isCreated)

        mockMvc.perform(
            post("/api/notes")
                .with(authentication(auth))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(note2))
        ).andExpect(status().isCreated)

        // Act & Assert: проверяем, что GET /api/notes возвращает все заметки
        mockMvc.perform(
            get("/api/notes")
                .with(authentication(auth))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data", hasSize<Int>(2)))
    }

    /**
     * Edge case test: проверяет, что GET /api/notes?folderId={nonExistentUuid}
     * возвращает пустой список
     */
    @Test
    fun `getAllNotes with non-existent folderId returns empty list`() {
        // Arrange
        val testUserId = "test-user-${UUID.randomUUID()}"
        val auth = UsernamePasswordAuthenticationToken(testUserId, null, emptyList())
        val nonExistentFolderId = UUID.randomUUID().toString()

        // Act & Assert
        mockMvc.perform(
            get("/api/notes")
                .param("folderId", nonExistentFolderId)
                .with(authentication(auth))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.data", hasSize<Int>(0)))
    }

    /**
     * Validation test: проверяет, что GET /api/notes?folderId=invalid
     * возвращает 400 Bad Request с ошибкой валидации
     */
    @Test
    fun `getAllNotes with invalid folderId UUID returns 400 Bad Request`() {
        // Arrange
        val testUserId = "test-user-${UUID.randomUUID()}"
        val auth = UsernamePasswordAuthenticationToken(testUserId, null, emptyList())

        // Act & Assert
        mockMvc.perform(
            get("/api/notes")
                .param("folderId", "invalid-uuid")
                .with(authentication(auth))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
    }
}
