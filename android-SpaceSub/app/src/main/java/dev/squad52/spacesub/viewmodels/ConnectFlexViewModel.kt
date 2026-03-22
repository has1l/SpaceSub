package dev.squad52.spacesub.viewmodels

import android.app.Application
import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.ConnectByCodeRequest
import dev.squad52.spacesub.networking.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class ConnectFlexViewModel(application: Application) : AndroidViewModel(application) {

    private val api = RetrofitClient.getApi(application)

    private val _code = MutableStateFlow("")
    val code: StateFlow<String> = _code.asStateFlow()

    private val _isCodeLoading = MutableStateFlow(false)
    val isCodeLoading: StateFlow<Boolean> = _isCodeLoading.asStateFlow()

    private val _isOAuthLoading = MutableStateFlow(false)
    val isOAuthLoading: StateFlow<Boolean> = _isOAuthLoading.asStateFlow()

    private val _success = MutableStateFlow(false)
    val success: StateFlow<Boolean> = _success.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val isCodeValid: Boolean
        get() = _code.value.matches(Regex("^FB-[A-Z0-9]{6}$", RegexOption.IGNORE_CASE))

    fun updateCode(value: String) {
        _code.value = value.uppercase()
    }

    fun connectByCode() {
        viewModelScope.launch {
            _isCodeLoading.value = true
            _error.value = null
            try {
                api.connectByCode(ConnectByCodeRequest(code = _code.value))
                _success.value = true
            } catch (e: Exception) {
                _error.value = "Ошибка подключения: ${e.message}"
            } finally {
                _isCodeLoading.value = false
            }
        }
    }

    fun startOAuth(context: Context) {
        viewModelScope.launch {
            _isOAuthLoading.value = true
            _error.value = null
            try {
                val response = api.getFlexOAuthUrl()
                val intent = CustomTabsIntent.Builder().setShowTitle(true).build()
                intent.launchUrl(context, Uri.parse(response.url))
            } catch (e: Exception) {
                _error.value = "Ошибка OAuth: ${e.message}"
            } finally {
                _isOAuthLoading.value = false
            }
        }
    }
}
