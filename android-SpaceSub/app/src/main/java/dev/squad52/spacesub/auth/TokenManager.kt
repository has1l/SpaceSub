package dev.squad52.spacesub.auth

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object TokenManager {

    private const val PREFS_NAME = "spacesub_secure_prefs"
    private const val KEY_JWT = "jwt_token"

    @Volatile
    private var prefs: SharedPreferences? = null

    private fun getPrefs(context: Context): SharedPreferences {
        return prefs ?: synchronized(this) {
            prefs ?: run {
                val masterKey = MasterKey.Builder(context)
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build()

                EncryptedSharedPreferences.create(
                    context,
                    PREFS_NAME,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
                ).also { prefs = it }
            }
        }
    }

    fun getToken(context: Context): String? {
        return getPrefs(context).getString(KEY_JWT, null)
    }

    fun saveToken(context: Context, token: String) {
        getPrefs(context).edit().putString(KEY_JWT, token).apply()
    }

    fun deleteToken(context: Context) {
        getPrefs(context).edit().remove(KEY_JWT).apply()
    }

    fun hasToken(context: Context): Boolean {
        return getToken(context) != null
    }
}
