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
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

/**
 * Фильтр для ограничения частоты запросов (rate limiting).
 * Использует алгоритм Token Bucket через библиотеку Bucket4j.
 *
 * Лимиты: 100 запросов в минуту на IP адрес.
 */
@Component
class RateLimitFilter : OncePerRequestFilter() {

    private data class BucketEntry(val bucket: Bucket, var lastAccessTime: Instant)

    private val buckets = ConcurrentHashMap<String, BucketEntry>()

    // Лимит: 100 запросов в минуту на IP
    private val limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)))

    // Очистка неактивных бакетов каждые 10 минут
    private val CLEANUP_INTERVAL_MS = 10 * 60 * 1000L
    private val BUCKET_TTL_MS = 30 * 60 * 1000L // 30 минут неактивности
    private var lastCleanupTime = Instant.now()

    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        // Пропускаем OPTIONS запросы (CORS preflight) без rate limiting
        if (request.method == "OPTIONS") {
            filterChain.doFilter(request, response)
            return
        }

        val clientIp = getClientIp(request)
        val now = Instant.now()

        // Периодическая очистка старых записей
        cleanupOldBucketsIfNeeded(now)

        val entry = buckets.compute(clientIp) { _, existingEntry ->
            if (existingEntry != null) {
                existingEntry.lastAccessTime = now
                existingEntry
            } else {
                BucketEntry(Bucket.builder().addLimit(limit).build(), now)
            }
        }!!

        if (entry.bucket.tryConsume(1)) {
            filterChain.doFilter(request, response)
        } else {
            response.status = 429 // HTTP 429 Too Many Requests
            response.contentType = "application/json"
            response.writer.write("""{"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests"}}""")
        }
    }

    private fun cleanupOldBucketsIfNeeded(now: Instant) {
        if (Duration.between(lastCleanupTime, now).toMillis() > CLEANUP_INTERVAL_MS) {
            lastCleanupTime = now
            val cutoffTime = now.minusMillis(BUCKET_TTL_MS)
            buckets.entries.removeIf { it.value.lastAccessTime.isBefore(cutoffTime) }
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
