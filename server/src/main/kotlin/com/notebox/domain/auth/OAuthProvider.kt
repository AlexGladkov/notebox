package com.notebox.domain.auth

data class OAuthUserInfo(
    val id: String,
    val email: String,
    val name: String,
    val avatarUrl: String?
)

data class OAuthTokens(
    val accessToken: String,
    val refreshToken: String?,
    val expiresIn: Long?
)

interface OAuthProvider {
    fun getAuthorizationUrl(redirectUri: String, state: String): String
    suspend fun exchangeCode(code: String, redirectUri: String): OAuthTokens
    suspend fun getUserInfo(accessToken: String): OAuthUserInfo
    fun getProviderName(): String
}
