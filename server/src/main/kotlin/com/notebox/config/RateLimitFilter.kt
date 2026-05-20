package com.notebox.config

import io.github.bucket4j.Bandwidth
import io.github.bucket4j.Bucket
import io.github.bucket4j.Refill
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * Фильтр для ограничения частоты запросов (rate limiting).
 * Использует алгоритм Token Bucket через библиотеку Bucket4j.
 *
 * Лимиты: 100 запросов в минуту на IP адрес.
 */
@Component
class RateLimitFilter : OncePerRequestFilter() {

    private val buckets = ConcurrentHashMap<String, Bucket>()

    // Лимит: 100 запросов в минуту на IP
    private val limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)))

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        val clientIp = getClientIp(request)
        val bucket = buckets.computeIfAbsent(clientIp) { Bucket.builder().addLimit(limit).build() }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response)
        } else {
            response.status = HttpServletResponse.SC_TOO_MANY_REQUESTS
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests"}}""")
        }
    }

    private fun getClientIp(request: HttpServletRequest): String {
        val xForwardedFor = request.getHeader("X-Forwarded-For")
        return if (!xForwardedFor.isNullOrBlank()) {
            xForwardedFor.split(",").first().trim()
        } else {
            request.remoteAddr
        }
    }
}
