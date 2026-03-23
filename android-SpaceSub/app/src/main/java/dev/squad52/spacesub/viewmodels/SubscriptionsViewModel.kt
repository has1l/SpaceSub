package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.DetectedSubscription
import dev.squad52.spacesub.models.SubscriptionSummary
import dev.squad52.spacesub.networking.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SubscriptionsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = RetrofitClient.getApi(application)

    private val _summary = MutableStateFlow<SubscriptionSummary?>(null)
    val summary: StateFlow<SubscriptionSummary?> = _summary.asStateFlow()

    private val _active = MutableStateFlow<List<DetectedSubscription>>(emptyList())
    val active: StateFlow<List<DetectedSubscription>> = _active.asStateFlow()

    private val _upcoming = MutableStateFlow<List<DetectedSubscription>>(emptyList())
    val upcoming: StateFlow<List<DetectedSubscription>> = _upcoming.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _cancellingId = MutableStateFlow<String?>(null)
    val cancellingId: StateFlow<String?> = _cancellingId.asStateFlow()

    fun cancelSubscription(id: String) {
        viewModelScope.launch {
            _cancellingId.value = id
            try {
                api.cancelDetectedSubscription(id)
                _active.value = _active.value.filter { it.id != id }
                _upcoming.value = _upcoming.value.filter { it.id != id }
                runCatching { _summary.value = api.getDetectedSubscriptionsSummary() }
            } catch (e: Exception) {
                _error.value = "Ошибка отмены: ${e.message}"
            } finally {
                _cancellingId.value = null
            }
        }
    }

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val summaryD = async { runCatching { api.getDetectedSubscriptionsSummary() }.getOrNull() }
                val activeD = async { runCatching { api.getDetectedSubscriptionsActive() }.getOrDefault(emptyList()) }
                val upcomingD = async { runCatching { api.getDetectedSubscriptionsUpcoming() }.getOrDefault(emptyList()) }

                _summary.value = summaryD.await()
                _active.value = activeD.await()
                _upcoming.value = upcomingD.await()
            } catch (e: Exception) {
                _error.value = "Ошибка загрузки: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
