package com.notebox.domain.auth

import org.springframework.stereotype.Service
import java.time.Instant
import java.time.temporal.ChronoUnit

@Service
class SessionService(
    private val sessionRepository: SessionRepository
) {
    companion object {
        private const val SESSION_DURATION_DAYS = 30L
    }

    fun createSession(userId: String): Session {
        val expiresAt = Instant.now().plus(SESSION_DURATION_DAYS, ChronoUnit.DAYS)
        return sessionRepository.create(userId, expiresAt)
    }

    fun getSession(sessionId: String): Session? {
        return sessionRepository.findById(sessionId)
    }

    fun validateSession(sessionId: String): Boolean {
        return sessionRepository.isValid(sessionId)
    }

    fun invalidateSession(sessionId: String): Boolean {
        return sessionRepository.delete(sessionId)
    }

    fun invalidateAllUserSessions(userId: String): Int {
        return sessionRepository.deleteByUserId(userId)
    }

    fun cleanupExpiredSessions(): Int {
        return sessionRepository.deleteExpired()
    }

    fun getUserIdFromSession(sessionId: String): String? {
        val session = sessionRepository.findById(sessionId) ?: return null
        return if (session.expiresAt.isAfter(Instant.now())) {
            session.userId
        } else {
            null
        }
    }
}
