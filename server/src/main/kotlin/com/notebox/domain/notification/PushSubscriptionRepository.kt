package com.notebox.domain.notification

import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.SqlExpressionBuilder.eq
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Repository
import java.time.Instant
import java.util.*

@Repository
class PushSubscriptionRepository {

    fun findAll(userId: String): List<PushSubscription> = transaction {
        PushSubscriptionsTable.select { PushSubscriptionsTable.userId eq userId }
            .map { toSubscription(it) }
    }

    fun findById(id: String): PushSubscription? = transaction {
        PushSubscriptionsTable.select { PushSubscriptionsTable.id eq id }
            .mapNotNull { toSubscription(it) }
            .singleOrNull()
    }

    fun findByEndpoint(endpoint: String, userId: String): PushSubscription? = transaction {
        PushSubscriptionsTable.select {
            (PushSubscriptionsTable.endpoint eq endpoint) and
            (PushSubscriptionsTable.userId eq userId)
        }
            .mapNotNull { toSubscription(it) }
            .singleOrNull()
    }

    fun create(
        userId: String,
        endpoint: String,
        p256dh: String,
        auth: String
    ): PushSubscription = transaction {
        // Проверяем, существует ли уже подписка с таким endpoint
        val existing = findByEndpoint(endpoint, userId)
        if (existing != null) {
            return@transaction existing
        }

        val id = UUID.randomUUID().toString()
        val now = Instant.now()

        PushSubscriptionsTable.insert {
            it[PushSubscriptionsTable.id] = id
            it[PushSubscriptionsTable.userId] = userId
            it[PushSubscriptionsTable.endpoint] = endpoint
            it[PushSubscriptionsTable.p256dh] = p256dh
            it[PushSubscriptionsTable.auth] = auth
            it[createdAt] = now
        }

        PushSubscription(id, userId, endpoint, p256dh, auth, now)
    }

    fun delete(id: String): Boolean = transaction {
        PushSubscriptionsTable.deleteWhere { PushSubscriptionsTable.id eq id } > 0
    }

    fun deleteByEndpoint(endpoint: String, userId: String): Boolean = transaction {
        PushSubscriptionsTable.deleteWhere {
            (PushSubscriptionsTable.endpoint eq endpoint) and
            (PushSubscriptionsTable.userId eq userId)
        } > 0
    }

    fun deleteAllByUserId(userId: String): Int = transaction {
        PushSubscriptionsTable.deleteWhere { PushSubscriptionsTable.userId eq userId }
    }

    private fun toSubscription(row: ResultRow) = PushSubscription(
        id = row[PushSubscriptionsTable.id],
        userId = row[PushSubscriptionsTable.userId],
        endpoint = row[PushSubscriptionsTable.endpoint],
        p256dh = row[PushSubscriptionsTable.p256dh],
        auth = row[PushSubscriptionsTable.auth],
        createdAt = row[PushSubscriptionsTable.createdAt]
    )
}
