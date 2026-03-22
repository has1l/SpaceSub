package dev.squad52.spacesub.models

import com.google.gson.annotations.SerializedName

enum class BankConnectionStatus {
    @SerializedName("CONNECTED") CONNECTED,
    @SerializedName("EXPIRED") EXPIRED,
    @SerializedName("ERROR") ERROR,
    @SerializedName("DISCONNECTED") DISCONNECTED
}

data class BankConnection(
    val id: String,
    val provider: String,
    val status: BankConnectionStatus,
    val lastSyncAt: String? = null,
    val expiresAt: String? = null,
    val createdAt: String
)

data class BankOAuthURLResponse(val url: String)

data class SyncResult(
    val ok: Boolean,
    val provider: String,
    val imported: Int,
    val accounts: Int
)

data class ConnectByCodeRequest(val code: String)

data class ConnectByCodeResponse(
    val ok: Boolean,
    val provider: String
)
