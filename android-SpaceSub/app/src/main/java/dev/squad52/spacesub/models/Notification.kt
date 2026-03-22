package dev.squad52.spacesub.models

import com.google.gson.annotations.SerializedName

enum class NotificationType {
    @SerializedName("BILLING_REMINDER") BILLING_REMINDER,
    @SerializedName("PRICE_CHANGE") PRICE_CHANGE,
    @SerializedName("NEW_TRANSACTION") NEW_TRANSACTION,
    @SerializedName("SYSTEM") SYSTEM
}

data class AppNotification(
    val id: String,
    val type: NotificationType,
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: String
)

data class UnreadCountResponse(val count: Int)

data class NotificationSettings(
    val emailNotifications: Boolean,
    val pushNotifications: Boolean,
    val daysBefore: Int
)
