package com.notebox.domain.billing

import com.notebox.domain.database.CustomDatabasesTable
import com.notebox.domain.reminder.RemindersTable
import org.jetbrains.exposed.sql.select
import org.jetbrains.exposed.sql.transactions.transaction
import org.springframework.stereotype.Service

@Service
class BillingService {

    fun getUserPlan(userId: String): Plan {
        require(userId.isNotBlank()) { "User ID cannot be blank" }
        // По умолчанию все пользователи на FREE плане
        // В будущем можно добавить таблицу user_subscriptions для хранения реальных планов
        return Plan.FREE
    }

    fun countUserDatabases(userId: String): Int {
        require(userId.isNotBlank()) { "User ID cannot be blank" }
        return transaction {
            CustomDatabasesTable.select { CustomDatabasesTable.userId eq userId }.count().toInt()
        }
    }

    fun countUserReminders(userId: String): Int {
        require(userId.isNotBlank()) { "User ID cannot be blank" }
        return transaction {
            RemindersTable.select { RemindersTable.userId eq userId }.count().toInt()
        }
    }
}
