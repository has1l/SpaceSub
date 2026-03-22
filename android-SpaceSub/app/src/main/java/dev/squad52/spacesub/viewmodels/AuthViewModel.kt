package dev.squad52.spacesub.viewmodels

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import dev.squad52.spacesub.auth.TokenManager
import dev.squad52.spacesub.auth.YandexAuthHelper
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val _isLoggedIn = MutableStateFlow(
        TokenManager.hasToken(application)
    )
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _userEmail = MutableStateFlow<String?>(null)
    val userEmail: StateFlow<String?> = _userEmail.asStateFlow()

    init {
        val token = TokenManager.getToken(application)
        if (token != null) {
            val user = YandexAuthHelper.decodeJwt(token)
            _userEmail.value = user?.email
        }
    }

    fun startLogin() {
        YandexAuthHelper.startAuth(getApplication())
    }

    fun handleAuthCallback(uri: Uri): Boolean {
        val token = YandexAuthHelper.extractTokenFromUri(uri) ?: return false
        TokenManager.saveToken(getApplication(), token)

        val user = YandexAuthHelper.decodeJwt(token)
        _userEmail.value = user?.email
        _isLoggedIn.value = true
        return true
    }

    fun logout() {
        TokenManager.deleteToken(getApplication())
        _isLoggedIn.value = false
        _userEmail.value = null
    }
}
