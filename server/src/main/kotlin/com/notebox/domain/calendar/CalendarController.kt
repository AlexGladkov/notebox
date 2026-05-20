package com.notebox.domain.calendar

import com.notebox.dto.ApiResponse
import com.notebox.dto.successResponse
import com.notebox.exception.AuthenticationException
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/calendar")
class CalendarController(
    private val googleCalendarService: GoogleCalendarService
) {

    @GetMapping("/google/status")
    fun getGoogleCalendarStatus(): ResponseEntity<ApiResponse<Map<String, Boolean>>> {
        val userId = getCurrentUserId()
        val isConnected = googleCalendarService.isConnected(userId)
        return ResponseEntity.ok(successResponse(mapOf("connected" to isConnected)))
    }

    private fun getCurrentUserId(): String {
        val authentication = SecurityContextHolder.getContext().authentication
        return authentication?.principal as? String
            ?: throw AuthenticationException("User not authenticated")
    }
}
