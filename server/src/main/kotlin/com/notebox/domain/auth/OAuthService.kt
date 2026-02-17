package com.notebox.domain.auth

import kotlinx.coroutines.runBlocking
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class OAuthService(
    private val googleProvider: GoogleOAuthProvider,
    private val appleProvider: AppleOAuthProvider,
    private val userService: UserService,
    private val sessionService: SessionService
) {

    fun getProvider(providerName: String): OAuthProvider {
        return when (providerName.lowercase()) {
            "google" -> googleProvider
            "apple" -> appleProvider
            else -> throw IllegalArgumentException("Unknown OAuth provider: $providerName")
        }
    }

    fun getAuthorizationUrl(provider: String, redirectUri: String, state: String): String {
        return getProvider(provider).getAuthorizationUrl(redirectUri, state)
    }

    fun handleCallback(
        provider: String,
        code: String,
        redirectUri: String
    ): Pair<User, Session> = runBlocking {
        val oauthProvider = getProvider(provider)

        // Exchange code for tokens
        val tokens = oauthProvider.exchangeCode(code, redirectUri)

        // Get user info
        val userInfo = oauthProvider.getUserInfo(tokens.accessToken)

        // Find or create user
        val user = userService.findOrCreateUserFromOAuth(
            provider = provider,
            providerUserId = userInfo.id,
            email = userInfo.email,
            name = userInfo.name,
            avatarUrl = userInfo.avatarUrl
        )

        // Link OAuth account
        val expiresAt = tokens.expiresIn?.let { Instant.now().plusSeconds(it) }
        userService.linkOAuthAccount(
            userId = user.id,
            provider = provider,
            providerUserId = userInfo.id,
            accessToken = tokens.accessToken,
            refreshToken = tokens.refreshToken,
            expiresAt = expiresAt
        )

        // Create session
        user to sessionService.createSession(user.id)
    }

    fun handleAppleCallback(
        code: String,
        idToken: String,
        redirectUri: String
    ): Pair<User, Session> = runBlocking {
        val provider = "apple"

        // Exchange code for tokens
        val tokens = appleProvider.exchangeCode(code, redirectUri)

        // Extract user info from ID token
        val userInfo = appleProvider.getUserInfoFromIdToken(idToken)

        // Find or create user
        val user = userService.findOrCreateUserFromOAuth(
            provider = provider,
            providerUserId = userInfo.id,
            email = userInfo.email,
            name = userInfo.name,
            avatarUrl = userInfo.avatarUrl
        )

        // Link OAuth account
        val expiresAt = tokens.expiresIn?.let { Instant.now().plusSeconds(it) }
        userService.linkOAuthAccount(
            userId = user.id,
            provider = provider,
            providerUserId = userInfo.id,
            accessToken = tokens.accessToken,
            refreshToken = tokens.refreshToken,
            expiresAt = expiresAt
        )

        // Create session
        user to sessionService.createSession(user.id)
    }
}
