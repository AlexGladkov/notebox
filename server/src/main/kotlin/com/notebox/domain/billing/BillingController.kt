package com.notebox.domain.billing

import com.notebox.domain.auth.SessionService
import com.notebox.dto.ApiResponse
import com.notebox.dto.BillingUsageDto
import com.notebox.dto.UsageStatsDto
import com.notebox.exception.AuthenticationException
import jakarta.servlet.http.HttpServletRequest
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/billing")
class BillingController(
    private val billingService: BillingService,
    private val sessionService: SessionService
) {

    companion object {
        private const val SESSION_COOKIE_NAME = "SESSION_ID"
    }

    @GetMapping
    fun getBillingUsage(request: HttpServletRequest): ResponseEntity<ApiResponse<*>> {
        val sessionId = getSessionIdFromCookies(request)
            ?: throw AuthenticationException("Not authenticated")

        val userId = sessionService.getUserIdFromSession(sessionId)
            ?: throw AuthenticationException("Session expired")

        val plan = billingService.getUserPlan(userId)
        val databasesCount = billingService.countUserDatabases(userId)
        val remindersCount = billingService.countUserReminders(userId)

        val usage = BillingUsageDto(
            planType = plan.type.name,
            databases = UsageStatsDto(
                current = databasesCount,
                limit = plan.maxDatabases
            ),
            reminders = UsageStatsDto(
                current = remindersCount,
                limit = plan.maxReminders
            )
        )

        return ResponseEntity.ok(ApiResponse.success(usage))
    }

    private fun getSessionIdFromCookies(request: HttpServletRequest): String? {
        return request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
    }
}
