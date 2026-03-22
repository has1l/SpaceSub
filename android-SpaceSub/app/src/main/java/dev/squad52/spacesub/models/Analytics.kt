package dev.squad52.spacesub.models

import com.google.gson.annotations.SerializedName

data class AnalyticsOverview(
    val mrr: Double,
    val arr: Double,
    val activeCount: Int,
    val upcomingCount: Int,
    val periodTotal: Double,
    val trend: TrendInfo
)

data class TrendInfo(
    val currentMonth: Double,
    val prevMonth: Double,
    val changePct: Double
)

data class CategoryItem(
    val category: String,
    val color: String,
    val total: Double,
    val count: Int,
    val percent: Double
)

data class ServiceItem(
    val merchant: String,
    val monthlyAmount: Double,
    val yearlyAmount: Double,
    val category: String,
    val color: String
)

data class PeriodItem(
    val period: String,
    val total: Double,
    val count: Int,
    val momGrowthPct: Double? = null
)

enum class ChurnRisk {
    @SerializedName("LOW") LOW,
    @SerializedName("MEDIUM") MEDIUM,
    @SerializedName("HIGH") HIGH
}

data class ScoreItem(
    val subscriptionId: String,
    val merchant: String,
    val valueScore: Double,
    val churnRisk: ChurnRisk,
    val label: String,
    val monthlyAmount: Double
)

enum class RecoType {
    @SerializedName("CANCEL") CANCEL,
    @SerializedName("REVIEW") REVIEW,
    @SerializedName("DOWNGRADE") DOWNGRADE,
    @SerializedName("CONSOLIDATE") CONSOLIDATE
}

enum class RecoPriority {
    @SerializedName("HIGH") HIGH,
    @SerializedName("MEDIUM") MEDIUM,
    @SerializedName("LOW") LOW
}

data class RecommendationItem(
    val type: RecoType,
    val priority: RecoPriority,
    val merchant: String,
    val currentCost: Double,
    val potentialSavings: Double,
    val reason: String
)
