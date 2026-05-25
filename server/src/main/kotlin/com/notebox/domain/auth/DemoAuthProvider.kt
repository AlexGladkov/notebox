package com.notebox.domain.auth

import com.notebox.domain.demo.DemoContentService
import com.notebox.exception.ValidationException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service

@Service
class DemoAuthProvider(
    private val userService: UserService,
    private val sessionService: SessionService,
    private val demoContentService: DemoContentService,
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
            throw ValidationException("Demo mode is not enabled")
        }

        // Get or create demo user
        val demoUser = userService.findByEmail(DEMO_EMAIL)
            ?: userService.createUser(DEMO_EMAIL, DEMO_NAME, null)

        // Сбросить демо-данные к начальному состоянию
        demoContentService.clearDemoData()

        // Создать свежий демо-контент
        demoContentService.createDemoContent(demoUser.id)

        // Инвалидировать все существующие сессии перед созданием новой
        sessionService.invalidateAllUserSessions(demoUser.id)

        // Создать сессию для демо-пользователя
        val session = sessionService.createSession(demoUser.id)

        return Pair(demoUser, session)
    }
}
