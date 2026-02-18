package com.notebox.domain.auth

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class DemoAuthProvider(
    private val userService: UserService,
    private val sessionService: SessionService,
    @Value("\${demo.mode.enabled}") private val demoModeEnabled: Boolean
) {
    companion object {
        private const val DEMO_EMAIL = "demo@notebox.app"
        private const val DEMO_NAME = "Demo User"
    }

    fun isDemoModeEnabled(): Boolean {
        return demoModeEnabled
    }

    fun createDemoSession(): Pair<User, Session> {
        if (!demoModeEnabled) {
            throw IllegalStateException("Demo mode is not enabled")
        }

        // Get or create demo user
        val demoUser = userService.findByEmail(DEMO_EMAIL)
            ?: userService.createUser(DEMO_EMAIL, DEMO_NAME, null)

        // Create session for demo user
        val session = sessionService.createSession(demoUser.id)

        return Pair(demoUser, session)
    }
}
