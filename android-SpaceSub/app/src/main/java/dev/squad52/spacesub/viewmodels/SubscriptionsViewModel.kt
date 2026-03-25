package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.CreateSubscriptionRequest
import dev.squad52.spacesub.models.DetectedSubscription
import dev.squad52.spacesub.models.Subscription
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

    private val _manualSubs = MutableStateFlow<List<Subscription>>(emptyList())
    val manualSubs: StateFlow<List<Subscription>> = _manualSubs.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _cancellingId = MutableStateFlow<String?>(null)
    val cancellingId: StateFlow<String?> = _cancellingId.asStateFlow()

    private val _showAddDialog = MutableStateFlow(false)
    val showAddDialog: StateFlow<Boolean> = _showAddDialog.asStateFlow()

    private val _editingSub = MutableStateFlow<Subscription?>(null)
    val editingSub: StateFlow<Subscription?> = _editingSub.asStateFlow()

    fun openAddDialog() {
        _editingSub.value = null
        _showAddDialog.value = true
    }

    fun openEditDialog(sub: Subscription) {
        _editingSub.value = sub
        _showAddDialog.value = true
    }

    fun closeDialog() {
        _showAddDialog.value = false
        _editingSub.value = null
    }

    fun cancelSubscription(id: String) {
        viewModelScope.launch {
            _cancellingId.value = id
            try {
                api.cancelDetectedSubscription(id)
                load()
            } catch (e: Exception) {
                _error.value = "Ошибка отмены: ${e.message}"
            } finally {
                _cancellingId.value = null
            }
        }
    }

    fun createManual(request: CreateSubscriptionRequest) {
        viewModelScope.launch {
            try {
                api.createSubscription(request)
                closeDialog()
                load()
            } catch (e: Exception) {
                _error.value = "Ошибка создания: ${e.message}"
            }
        }
    }

    fun updateManual(id: String, request: CreateSubscriptionRequest) {
        viewModelScope.launch {
            try {
                api.updateSubscription(id, request)
                closeDialog()
                load()
            } catch (e: Exception) {
                _error.value = "Ошибка обновления: ${e.message}"
            }
        }
    }

    fun deleteManual(id: String) {
        viewModelScope.launch {
            try {
                api.deleteSubscription(id)
                _manualSubs.value = _manualSubs.value.filter { it.id != id }
            } catch (e: Exception) {
                _error.value = "Ошибка удаления: ${e.message}"
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
                val manualD = async { runCatching { api.getSubscriptions() }.getOrDefault(emptyList()) }

                _summary.value = summaryD.await()
                _active.value = activeD.await()
                _upcoming.value = upcomingD.await()
                _manualSubs.value = manualD.await()
            } catch (e: Exception) {
                _error.value = "Ошибка загрузки: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
