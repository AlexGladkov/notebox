package com.notebox.config

import com.notebox.domain.auth.SessionService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Value("\${cors.allowed-origins:http://localhost:5173,http://localhost:3000}")
    private lateinit var allowedOrigins: String

    @Value("\${spring.profiles.active:dev}")
    private lateinit var activeProfile: String

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        sessionAuthenticationFilter: SessionAuthenticationFilter,
        rateLimitFilter: RateLimitFilter
    ): SecurityFilterChain {
        http
            .csrf { it.disable() }
            .cors { it.configurationSource(corsConfigurationSource()) }
            .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
            .authorizeHttpRequests { auth ->
                auth
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api/config").permitAll()
                    .anyRequest().authenticated()
            }
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter::class.java)
            .addFilterBefore(sessionAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        val origins = allowedOrigins.split(",")
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .toMutableList()

        // Добавляем host.docker.internal только для dev/test окружений (любой порт)
        // В production это создаёт CSRF уязвимость через Docker internal network
        val isProduction = activeProfile.contains("prod", ignoreCase = true)
        if (!isProduction) {
            origins.add("http://host.docker.internal:*")
        }

        configuration.allowedOriginPatterns = origins
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
        configuration.allowedHeaders = listOf("Content-Type", "Authorization", "X-Requested-With", "Accept")
        configuration.exposedHeaders = listOf("Content-Disposition")
        configuration.allowCredentials = true
        configuration.maxAge = 3600L

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }
}

@Component
class SessionAuthenticationFilter(
    private val sessionService: SessionService
) : OncePerRequestFilter() {

    companion object {
        private const val SESSION_COOKIE_NAME = "SESSION_ID"
        // Список публичных путей, которые не требуют проверки сессии
        // ВАЖНО: этот список должен быть синхронизирован с permitAll() в securityFilterChain
        private val PUBLIC_PATHS = listOf("/api/auth/", "/api/config")
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: jakarta.servlet.FilterChain
    ) {
        // Пропускаем OPTIONS preflight запросы без проверки сессии
        if (request.method == "OPTIONS") {
            filterChain.doFilter(request, response)
            return
        }

        val requestPath = request.requestURI

        // Пропускаем публичные эндпоинты без проверки сессии
        // Примечание: requestURI не содержит query string параметры (они в request.queryString)
        if (PUBLIC_PATHS.any { publicPath ->
            when {
                publicPath.endsWith("/") -> {
                    // Для путей со слэшем: пропускаем всё, что начинается с этого пути
                    // или точное совпадение без слэша
                    requestPath.startsWith(publicPath) || requestPath == publicPath.removeSuffix("/")
                }
                else -> {
                    // Для путей без слэша: точное совпадение или с '/' после
                    requestPath == publicPath || requestPath.startsWith("$publicPath/")
                }
            }
        }) {
            filterChain.doFilter(request, response)
            return
        }

        val sessionId = getSessionIdFromCookies(request)

        if (sessionId == null) {
            // Нет сессии - запрещаем доступ к защищенному эндпоинту
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}""")
            return
        }

        val session = sessionService.getSession(sessionId)
        if (session == null || !sessionService.validateSession(sessionId)) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"SESSION_EXPIRED","message":"Session expired"}}""")
            return
        }

        // Устанавливаем authentication в SecurityContext для авторизации запроса
        val authentication = UsernamePasswordAuthenticationToken(
            session.userId,  // principal
            null,            // credentials
            emptyList()      // authorities
        )
        SecurityContextHolder.getContext().authentication = authentication

        filterChain.doFilter(request, response)
    }

    private fun getSessionIdFromCookies(request: HttpServletRequest): String? {
        return request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
    }
}
