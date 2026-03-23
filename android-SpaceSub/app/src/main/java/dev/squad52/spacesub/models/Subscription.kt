package dev.squad52.spacesub.models

import com.google.gson.annotations.SerializedName

enum class BillingCycle {
    @SerializedName("WEEKLY") WEEKLY,
    @SerializedName("MONTHLY") MONTHLY,
    @SerializedName("QUARTERLY") QUARTERLY,
    @SerializedName("YEARLY") YEARLY;

    val russianName: String
        get() = when (this) {
            WEEKLY -> "Еженедельно"
            MONTHLY -> "Ежемесячно"
            QUARTERLY -> "Ежеквартально"
            YEARLY -> "Ежегодно"
        }

    val shortLabel: String
        get() = when (this) {
            WEEKLY -> "нед"
            MONTHLY -> "мес"
            QUARTERLY -> "кв"
            YEARLY -> "год"
        }
}

data class Subscription(
    val id: String,
    val userId: String,
    val name: String,
    val description: String? = null,
    val amount: Double,
    val currency: String,
    val periodType: BillingCycle,
    val nextBilling: String? = null,
    val category: String? = null,
    val isActive: Boolean,
    val logoUrl: String? = null,
    val createdAt: String,
    val updatedAt: String
)

data class DetectedSubscription(
    val id: String,
    val merchant: String,
    val amount: Double,
    val currency: String,
    val periodType: BillingCycle,
    val lastChargeDate: String? = null,
    val nextExpectedCharge: String? = null,
    val isActive: Boolean,
    val confidence: Double,
    val transactionCount: Int
)

data class SubscriptionSummary(
    val activeCount: Int = 0,
    val monthlyTotal: Double = 0.0,
    val yearlyTotal: Double = 0.0,
    val upcomingNext7Days: List<DetectedSubscription> = emptyList()
)

data class CancelSubscriptionResponse(
    val cancelled: Boolean,
    val bankPaymentId: String?
)
