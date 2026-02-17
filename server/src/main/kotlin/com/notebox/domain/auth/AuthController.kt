package com.notebox.domain.auth

import com.notebox.dto.ApiResponse
import jakarta.servlet.http.Cookie
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import java.util.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val oauthService: OAuthService,
    private val sessionService: SessionService,
    private val userService: UserService,
    @Value("\${frontend.url}") private val frontendUrl: String,
    @Value("\${server.url}") private val serverUrl: String
) {

    companion object {
        private const val SESSION_COOKIE_NAME = "SESSION_ID"
        private const val SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
    }

    @GetMapping("/login/{provider}")
    fun initiateOAuthLogin(
        @PathVariable provider: String,
        response: HttpServletResponse
    ): ResponseEntity<Void> {
        val state = UUID.randomUUID().toString()
        val redirectUri = "$serverUrl/api/auth/callback/$provider"

        val authUrl = oauthService.getAuthorizationUrl(provider, redirectUri, state)

        // Redirect to OAuth provider
        response.sendRedirect(authUrl)
        return ResponseEntity.status(HttpStatus.FOUND).build()
    }

    @GetMapping("/callback/{provider}")
    fun handleOAuthCallback(
        @PathVariable provider: String,
        @RequestParam code: String,
        @RequestParam(required = false) state: String?,
        response: HttpServletResponse
    ): ResponseEntity<Void> {
        try {
            val redirectUri = "$serverUrl/api/auth/callback/$provider"

            val (user, session) = oauthService.handleCallback(provider, code, redirectUri)

            // Set session cookie
            val cookie = Cookie(SESSION_COOKIE_NAME, session.id).apply {
                isHttpOnly = true
                secure = true // Set to true in production with HTTPS
                path = "/"
                maxAge = SESSION_COOKIE_MAX_AGE
            }
            response.addCookie(cookie)

            // Redirect to frontend
            response.sendRedirect(frontendUrl)
            return ResponseEntity.status(HttpStatus.FOUND).build()
        } catch (e: Exception) {
            e.printStackTrace()
            response.sendRedirect("$frontendUrl/login?error=auth_failed")
            return ResponseEntity.status(HttpStatus.FOUND).build()
        }
    }

    @PostMapping("/callback/{provider}")
    fun handleOAuthCallbackPost(
        @PathVariable provider: String,
        @RequestParam code: String,
        @RequestParam(required = false) id_token: String?,
        @RequestParam(required = false) state: String?,
        response: HttpServletResponse
    ): ResponseEntity<Void> {
        // Handle POST callback (for Apple Sign In)
        try {
            val redirectUri = "$serverUrl/api/auth/callback/$provider"

            val (user, session) = if (provider == "apple" && id_token != null) {
                oauthService.handleAppleCallback(code, id_token, redirectUri)
            } else {
                oauthService.handleCallback(provider, code, redirectUri)
            }

            // Set session cookie
            val cookie = Cookie(SESSION_COOKIE_NAME, session.id).apply {
                isHttpOnly = true
                secure = true
                path = "/"
                maxAge = SESSION_COOKIE_MAX_AGE
            }
            response.addCookie(cookie)

            // Redirect to frontend
            response.sendRedirect(frontendUrl)
            return ResponseEntity.status(HttpStatus.FOUND).build()
        } catch (e: Exception) {
            e.printStackTrace()
            response.sendRedirect("$frontendUrl/login?error=auth_failed")
            return ResponseEntity.status(HttpStatus.FOUND).build()
        }
    }

    @GetMapping("/me")
    fun getCurrentUser(request: HttpServletRequest): ResponseEntity<ApiResponse<*>> {
        val sessionId = getSessionIdFromCookies(request)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("UNAUTHORIZED", "Not authenticated"))

        val userId = sessionService.getUserIdFromSession(sessionId)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("SESSION_EXPIRED", "Session expired"))

        val user = userService.findById(userId)
            ?: return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error("USER_NOT_FOUND", "User not found"))

        return ResponseEntity.ok(ApiResponse.success(user.toDto()))
    }

    @PostMapping("/logout")
    fun logout(
        request: HttpServletRequest,
        response: HttpServletResponse
    ): ResponseEntity<ApiResponse<*>> {
        val sessionId = getSessionIdFromCookies(request)

        if (sessionId != null) {
            sessionService.invalidateSession(sessionId)
        }

        // Clear session cookie
        val cookie = Cookie(SESSION_COOKIE_NAME, "").apply {
            isHttpOnly = true
            secure = true
            path = "/"
            maxAge = 0
        }
        response.addCookie(cookie)

        return ResponseEntity.ok(ApiResponse.success(mapOf("message" to "Logged out successfully")))
    }

    private fun getSessionIdFromCookies(request: HttpServletRequest): String? {
        return request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
    }
}
