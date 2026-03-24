package dev.squad52.spacesub.networking

import dev.squad52.spacesub.models.*
import retrofit2.http.*

interface ApiService {

    // Auth
    @GET("auth/yandex")
    suspend fun getYandexAuthUrl(@Query("platform") platform: String = "android"): Any

    // Subscriptions
    @GET("subscriptions")
    suspend fun getSubscriptions(): List<Subscription>

    @GET("subscriptions/{id}")
    suspend fun getSubscription(@Path("id") id: String): Subscription

    @POST("subscriptions")
    suspend fun createSubscription(@Body body: CreateSubscriptionRequest): Subscription

    @PUT("subscriptions/{id}")
    suspend fun updateSubscription(@Path("id") id: String, @Body body: CreateSubscriptionRequest): Subscription

    @DELETE("subscriptions/{id}")
    suspend fun deleteSubscription(@Path("id") id: String)

    @GET("subscriptions/suggestions")
    suspend fun getSuggestions(): List<DetectedSubscription>

    @POST("subscriptions/suggestions/{id}/confirm")
    suspend fun confirmSuggestion(@Path("id") id: String): Subscription

    // Transactions
    @GET("transactions")
    suspend fun getTransactions(): List<Map<String, Any>>

    // Detected Subscriptions
    @GET("detected-subscriptions")
    suspend fun getDetectedSubscriptions(): List<DetectedSubscription>

    @GET("detected-subscriptions/active")
    suspend fun getDetectedSubscriptionsActive(): List<DetectedSubscription>

    @GET("detected-subscriptions/upcoming")
    suspend fun getDetectedSubscriptionsUpcoming(): List<DetectedSubscription>

    @GET("detected-subscriptions/summary")
    suspend fun getDetectedSubscriptionsSummary(): SubscriptionSummary

    @POST("detected-subscriptions/{id}/cancel")
    suspend fun cancelDetectedSubscription(@Path("id") id: String): CancelSubscriptionResponse

    // Analytics
    @GET("analytics/overview")
    suspend fun getAnalyticsOverview(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): AnalyticsOverview

    @GET("analytics/by-category")
    suspend fun getAnalyticsByCategory(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): List<CategoryItem>

    @GET("analytics/by-service")
    suspend fun getAnalyticsByService(
        @Query("limit") limit: Int = 8,
        @Query("from") from: String? = null,
        @Query("to") to: String? = null
    ): List<ServiceItem>

    @GET("analytics/by-period")
    suspend fun getAnalyticsByPeriod(
        @Query("from") from: String? = null,
        @Query("to") to: String? = null,
        @Query("granularity") granularity: String? = null
    ): List<PeriodItem>

    @GET("analytics/scores")
    suspend fun getAnalyticsScores(): List<ScoreItem>

    @GET("analytics/recommendations")
    suspend fun getAnalyticsRecommendations(): List<RecommendationItem>

    // Forecast
    @GET("forecast")
    suspend fun getForecast(): ForecastResponse

    // Notifications
    @GET("notifications")
    suspend fun getNotifications(): List<AppNotification>

    @GET("notifications/unread-count")
    suspend fun getUnreadCount(): UnreadCountResponse

    @PATCH("notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String)

    @PATCH("notifications/read-all")
    suspend fun markAllRead()

    @GET("notifications/settings")
    suspend fun getNotificationSettings(): NotificationSettings

    @PUT("notifications/settings")
    suspend fun updateNotificationSettings(@Body settings: NotificationSettings): NotificationSettings

    // Bank Integration
    @GET("bank-integration/connections")
    suspend fun getBankConnections(): List<BankConnection>

    @GET("bank-integration/flex/oauth")
    suspend fun getFlexOAuthUrl(): BankOAuthURLResponse

    @POST("bank-integration/flex/sync")
    suspend fun syncFlex(): SyncResult

    @POST("bank-integration/flex/connect-by-code")
    suspend fun connectByCode(@Body body: ConnectByCodeRequest): ConnectByCodeResponse
}
