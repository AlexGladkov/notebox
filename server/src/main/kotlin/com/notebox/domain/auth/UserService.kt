package com.notebox.domain.auth

import org.springframework.stereotype.Service

@Service
class UserService(
    private val userRepository: UserRepository,
    private val oauthAccountRepository: UserOAuthAccountRepository
) {

    fun findById(id: String): User? {
        return userRepository.findById(id)
    }

    fun findByEmail(email: String): User? {
        return userRepository.findByEmail(email)
    }

    fun createUser(email: String, name: String, avatarUrl: String?): User {
        return userRepository.create(email, name, avatarUrl)
    }

    fun updateUser(id: String, name: String? = null, avatarUrl: String? = null): User? {
        return userRepository.update(id, name = name, avatarUrl = avatarUrl)
    }

    fun findOrCreateUserFromOAuth(
        provider: String,
        providerUserId: String,
        email: String,
        name: String,
        avatarUrl: String?
    ): User {
        // Check if OAuth account exists
        val existingAccount = oauthAccountRepository.findByProvider(provider, providerUserId)
        if (existingAccount != null) {
            val user = userRepository.findById(existingAccount.userId)
            if (user != null) {
                return user
            }
        }

        // Check if user with this email exists
        val existingUser = userRepository.findByEmail(email)
        return existingUser ?: userRepository.create(email, name, avatarUrl)
    }

    fun linkOAuthAccount(
        userId: String,
        provider: String,
        providerUserId: String,
        accessToken: String,
        refreshToken: String?,
        expiresAt: java.time.Instant?
    ): UserOAuthAccount {
        // Check if this OAuth account is already linked
        val existing = oauthAccountRepository.findByProvider(provider, providerUserId)
        if (existing != null) {
            // Update tokens
            return oauthAccountRepository.updateTokens(
                existing.id,
                accessToken,
                refreshToken,
                expiresAt
            ) ?: throw RuntimeException("Failed to update OAuth account")
        }

        // Create new OAuth account link
        return oauthAccountRepository.create(
            userId,
            provider,
            providerUserId,
            accessToken,
            refreshToken,
            expiresAt
        )
    }
}
