package dev.squad52.spacesub.models

data class ForecastResponse(
    val next7DaysTotal: Double,
    val next30DaysTotal: Double,
    val next12MonthsTotal: Double,
    val upcomingTimeline: List<TimelineEntry>
)

data class TimelineEntry(
    val merchant: String,
    val amount: Double,
    val chargeDate: String,
    val periodType: BillingCycle
)
