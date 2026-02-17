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
import java.util.Base64

data class AppleTokenResponse(
    @JsonProperty("access_token") val accessToken: String,
    @JsonProperty("refresh_token") val refreshToken: String?,
    @JsonProperty("expires_in") val expiresIn: Long?,
    @JsonProperty("id_token") val idToken: String
)

data class AppleIdTokenPayload(
    val sub: String,
    val email: String,
    val name: String?
)

@Component
class AppleOAuthProvider(
    @Value("\${oauth.apple.client-id}") private val clientId: String,
    @Value("\${oauth.apple.client-secret}") private val clientSecret: String,
    @Value("\${oauth.apple.team-id}") private val teamId: String
) : OAuthProvider {

    private val httpClient = OkHttpClient()
    private val objectMapper = ObjectMapper()

    companion object {
        private const val AUTHORIZATION_URL = "https://appleid.apple.com/auth/authorize"
        private const val TOKEN_URL = "https://appleid.apple.com/auth/token"
        private const val SCOPE = "name email"
    }

    override fun getAuthorizationUrl(redirectUri: String, state: String): String {
        return "$AUTHORIZATION_URL?" +
                "client_id=$clientId&" +
                "redirect_uri=$redirectUri&" +
                "response_type=code&" +
                "scope=$SCOPE&" +
                "state=$state&" +
                "response_mode=form_post"
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

            val tokenResponse = objectMapper.readValue(responseBody, AppleTokenResponse::class.java)

            OAuthTokens(
                accessToken = tokenResponse.accessToken,
                refreshToken = tokenResponse.refreshToken,
                expiresIn = tokenResponse.expiresIn
            )
        }
    }

    override suspend fun getUserInfo(accessToken: String): OAuthUserInfo = withContext(Dispatchers.IO) {
        // Apple doesn't provide a separate userinfo endpoint
        // User info is contained in the ID token
        // This is a simplified implementation - in production you'd decode the JWT
        throw UnsupportedOperationException("Apple user info should be extracted from ID token during token exchange")
    }

    fun getUserInfoFromIdToken(idToken: String): OAuthUserInfo {
        // Decode JWT - this is simplified, in production use a proper JWT library
        val parts = idToken.split(".")
        if (parts.size != 3) {
            throw RuntimeException("Invalid ID token format")
        }

        val payload = String(Base64.getUrlDecoder().decode(parts[1]))
        val payloadMap = objectMapper.readValue(payload, Map::class.java)

        return OAuthUserInfo(
            id = payloadMap["sub"] as String,
            email = payloadMap["email"] as String,
            name = payloadMap["name"] as? String ?: payloadMap["email"] as String,
            avatarUrl = null
        )
    }

    override fun getProviderName(): String = "apple"
}
