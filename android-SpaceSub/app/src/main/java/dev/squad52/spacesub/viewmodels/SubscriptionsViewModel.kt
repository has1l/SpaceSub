package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.DetectedSubscription
import dev.squad52.spacesub.models.SubscriptionSummary
import dev.squad52.spacesub.networking.RetrofitClient
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

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _summary.value = api.getDetectedSubscriptionsSummary()
                _active.value = api.getDetectedSubscriptionsActive()
                _upcoming.value = api.getDetectedSubscriptionsUpcoming()
            } catch (e: Exception) {
                _error.value = "Ошибка загрузки: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
