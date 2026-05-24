package com.notebox.dto

data class BillingUsageDto(
    val planType: String,
    val databases: UsageStatsDto,
    val reminders: UsageStatsDto
)

data class UsageStatsDto(
    val current: Int,
    val limit: Int
)
