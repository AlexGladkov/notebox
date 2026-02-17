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
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
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
        val encodedRedirectUri = URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
        val encodedScope = URLEncoder.encode(SCOPE, StandardCharsets.UTF_8)
        val encodedState = URLEncoder.encode(state, StandardCharsets.UTF_8)

        return "$AUTHORIZATION_URL?" +
                "client_id=$clientId&" +
                "redirect_uri=$encodedRedirectUri&" +
                "response_type=code&" +
                "scope=$encodedScope&" +
                "state=$encodedState&" +
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
            val responseBody = response.body?.string()
                ?: throw RuntimeException("Empty response body from Apple token endpoint")

            if (!response.isSuccessful) {
                throw RuntimeException("Failed to exchange code with Apple (${response.code}): $responseBody")
            }

            val tokenResponse = try {
                objectMapper.readValue(responseBody, AppleTokenResponse::class.java)
            } catch (e: Exception) {
                throw RuntimeException("Failed to parse Apple token response: ${e.message}", e)
            }

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
            throw RuntimeException("Invalid Apple ID token format: expected 3 parts, got ${parts.size}")
        }

        val payload = try {
            String(Base64.getUrlDecoder().decode(parts[1]))
        } catch (e: Exception) {
            throw RuntimeException("Failed to decode Apple ID token payload: ${e.message}", e)
        }

        val payloadMap = try {
            @Suppress("UNCHECKED_CAST")
            objectMapper.readValue(payload, Map::class.java) as Map<String, Any>
        } catch (e: Exception) {
            throw RuntimeException("Failed to parse Apple ID token JSON: ${e.message}", e)
        }

        val sub = payloadMap["sub"] as? String
            ?: throw RuntimeException("Missing 'sub' field in Apple ID token")
        val email = payloadMap["email"] as? String
            ?: throw RuntimeException("Missing 'email' field in Apple ID token")

        return OAuthUserInfo(
            id = sub,
            email = email,
            name = payloadMap["name"] as? String ?: email,
            avatarUrl = null
        )
    }

    override fun getProviderName(): String = "apple"
}
