package com.notebox.config

import com.notebox.domain.auth.SessionService
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
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
    }

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: jakarta.servlet.FilterChain
    ) {
        val sessionId = getSessionIdFromCookies(request)

        if (sessionId != null && !sessionService.validateSession(sessionId)) {
            response.status = HttpServletResponse.SC_UNAUTHORIZED
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"SESSION_EXPIRED","message":"Session expired"}}""")
            return
        }

        filterChain.doFilter(request, response)
    }

    private fun getSessionIdFromCookies(request: HttpServletRequest): String? {
        return request.cookies?.find { it.name == SESSION_COOKIE_NAME }?.value
    }
}
