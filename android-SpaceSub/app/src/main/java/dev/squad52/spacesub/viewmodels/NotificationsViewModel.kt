package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.AppNotification
import dev.squad52.spacesub.models.NotificationSettings
import dev.squad52.spacesub.networking.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class NotificationsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = RetrofitClient.getApi(application)

    private val _notifications = MutableStateFlow<List<AppNotification>>(emptyList())
    val notifications: StateFlow<List<AppNotification>> = _notifications.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _settings = MutableStateFlow<NotificationSettings?>(null)
    val settings: StateFlow<NotificationSettings?> = _settings.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _notifications.value = api.getNotifications()
            } catch (_: Exception) {}
            _isLoading.value = false
        }
    }

    fun loadSettings() {
        viewModelScope.launch {
            try {
                _settings.value = api.getNotificationSettings()
            } catch (_: Exception) {}
        }
    }

    fun updateEmailNotifications(enabled: Boolean) {
        val current = _settings.value ?: return
        val updated = current.copy(emailNotifications = enabled)
        _settings.value = updated
        viewModelScope.launch {
            try { api.updateNotificationSettings(updated) } catch (_: Exception) {}
        }
    }

    fun updateDaysBefore(days: Int) {
        val current = _settings.value ?: return
        val updated = current.copy(daysBefore = days)
        _settings.value = updated
        viewModelScope.launch {
            try { api.updateNotificationSettings(updated) } catch (_: Exception) {}
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            try {
                api.markRead(id)
                _notifications.value = _notifications.value.map {
                    if (it.id == id) it.copy(isRead = true) else it
                }
            } catch (_: Exception) {}
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            try {
                api.markAllRead()
                _notifications.value = _notifications.value.map { it.copy(isRead = true) }
            } catch (_: Exception) {}
        }
    }
}
