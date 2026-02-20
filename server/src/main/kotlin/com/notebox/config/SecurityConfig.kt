package com.notebox.config

import com.notebox.domain.auth.SessionService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
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

    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        sessionAuthenticationFilter: SessionAuthenticationFilter
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
            .addFilterBefore(sessionAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration()
        configuration.allowedOriginPatterns = listOf("*")
        configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS")
        configuration.allowedHeaders = listOf("*")
        configuration.allowCredentials = true

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

        if (sessionId != null) {
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
        }

        filterChain.doFilter(request, response)
    }

    private fun getSessionIdFromCookies(request: HttpServletRequest): String? {
        return request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
    }
}
