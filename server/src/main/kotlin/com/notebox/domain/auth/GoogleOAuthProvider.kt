package com.notebox.domain.auth

import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.ObjectMapper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

data class GoogleTokenResponse(
    @JsonProperty("access_token") val accessToken: String,
    @JsonProperty("refresh_token") val refreshToken: String?,
    @JsonProperty("expires_in") val expiresIn: Long?,
    @JsonProperty("token_type") val tokenType: String
)

data class GoogleUserInfoResponse(
    val sub: String,
    val email: String,
    val name: String,
    val picture: String?
)

@Component
class GoogleOAuthProvider(
    @Value("\${oauth.google.client-id}") private val clientId: String,
    @Value("\${oauth.google.client-secret}") private val clientSecret: String
) : OAuthProvider {

    private val httpClient = OkHttpClient()
    private val objectMapper = ObjectMapper()

    companion object {
        private const val AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth"
        private const val TOKEN_URL = "https://oauth2.googleapis.com/token"
        private const val USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
        private const val SCOPE = "openid email profile"
    }

    override fun getAuthorizationUrl(redirectUri: String, state: String): String {
        return "$AUTHORIZATION_URL?" +
                "client_id=$clientId&" +
                "redirect_uri=$redirectUri&" +
                "response_type=code&" +
                "scope=$SCOPE&" +
                "state=$state&" +
                "access_type=offline&" +
                "prompt=consent"
    }

    override suspend fun exchangeCode(code: String, redirectUri: String): OAuthTokens = withContext(Dispatchers.IO) {
        val requestBody = FormBody.Builder()
            .add("code", code)
            .add("client_id", clientId)
            .add("client_secret", clientSecret)
            .add("redirect_uri", redirectUri)
            .add("grant_type", "authorization_code")
            .build()

        val request = Request.Builder()
            .url(TOKEN_URL)
            .post(requestBody)
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw RuntimeException("Failed to exchange code: ${response.code}")
            }

            val responseBody = response.body?.string()
                ?: throw RuntimeException("Empty response body")

            val tokenResponse = objectMapper.readValue(responseBody, GoogleTokenResponse::class.java)

            OAuthTokens(
                accessToken = tokenResponse.accessToken,
                refreshToken = tokenResponse.refreshToken,
                expiresIn = tokenResponse.expiresIn
            )
        }
    }

    override suspend fun getUserInfo(accessToken: String): OAuthUserInfo = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(USER_INFO_URL)
            .header("Authorization", "Bearer $accessToken")
            .get()
            .build()

        httpClient.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw RuntimeException("Failed to get user info: ${response.code}")
            }

            val responseBody = response.body?.string()
                ?: throw RuntimeException("Empty response body")

            val userInfo = objectMapper.readValue(responseBody, GoogleUserInfoResponse::class.java)

            OAuthUserInfo(
                id = userInfo.sub,
                email = userInfo.email,
                name = userInfo.name,
                avatarUrl = userInfo.picture
            )
        }
    }

    override fun getProviderName(): String = "google"
}
