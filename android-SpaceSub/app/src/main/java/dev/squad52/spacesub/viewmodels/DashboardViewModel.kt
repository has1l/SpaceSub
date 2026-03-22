package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.BankConnection
import dev.squad52.spacesub.models.BankConnectionStatus
import dev.squad52.spacesub.networking.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class DashboardViewModel(application: Application) : AndroidViewModel(application) {

    private val api = RetrofitClient.getApi(application)

    private val _connections = MutableStateFlow<List<BankConnection>>(emptyList())
    val connections: StateFlow<List<BankConnection>> = _connections.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    private val _syncResult = MutableStateFlow<String?>(null)
    val syncResult: StateFlow<String?> = _syncResult.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _unreadCount = MutableStateFlow(0)
    val unreadCount: StateFlow<Int> = _unreadCount.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _connections.value = api.getBankConnections()
            } catch (e: Exception) {
                _error.value = "Ошибка загрузки: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
        viewModelScope.launch {
            try {
                _unreadCount.value = api.getUnreadCount().count
            } catch (_: Exception) {}
        }
    }

    fun syncBank() {
        viewModelScope.launch {
            _isSyncing.value = true
            try {
                val result = api.syncFlex()
                _syncResult.value = "Импортировано ${result.imported} транзакций, ${result.accounts} счетов"
                load()
            } catch (e: Exception) {
                _syncResult.value = "Ошибка синхронизации: ${e.message}"
            } finally {
                _isSyncing.value = false
            }
        }
    }

    fun dismissSyncResult() {
        _syncResult.value = null
    }
}
