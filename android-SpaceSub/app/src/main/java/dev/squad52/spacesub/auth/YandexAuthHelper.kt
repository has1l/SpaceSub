package dev.squad52.spacesub.auth

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import java.util.Base64

object YandexAuthHelper {

    private const val AUTH_URL = "https://spacesub-production.up.railway.app/api/auth/yandex?platform=android"

    fun startAuth(context: Context) {
        val customTabsIntent = CustomTabsIntent.Builder()
            .setShowTitle(true)
            .build()
        customTabsIntent.launchUrl(context, Uri.parse(AUTH_URL))
    }

    fun extractTokenFromUri(uri: Uri): String? {
        return uri.getQueryParameter("token")
    }

    data class JwtUser(
        val id: String,
        val email: String
    )

    fun decodeJwt(token: String): JwtUser? {
        return try {
            val segments = token.split(".")
            if (segments.size < 2) return null

            val payload = segments[1]
            val decoded = Base64.getUrlDecoder().decode(payload)
            val json = String(decoded, Charsets.UTF_8)

            val subRegex = """"sub"\s*:\s*"([^"]+)"""".toRegex()
            val emailRegex = """"email"\s*:\s*"([^"]+)"""".toRegex()

            val sub = subRegex.find(json)?.groupValues?.get(1) ?: return null
            val email = emailRegex.find(json)?.groupValues?.get(1) ?: return null

            JwtUser(id = sub, email = email)
        } catch (_: Exception) {
            null
        }
    }
}
