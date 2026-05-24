package com.notebox.domain.billing

enum class PlanType {
    FREE,
    PRO
}

data class Plan(
    val type: PlanType,
    val maxDatabases: Int,
    val maxReminders: Int
) {
    companion object {
        val FREE = Plan(
            type = PlanType.FREE,
            maxDatabases = 5,
            maxReminders = 2
        )

        val PRO = Plan(
            type = PlanType.PRO,
            maxDatabases = 50,
            maxReminders = 10
        )

        fun fromType(type: PlanType): Plan {
            return when (type) {
                PlanType.FREE -> FREE
                PlanType.PRO -> PRO
            }
        }
    }
}
