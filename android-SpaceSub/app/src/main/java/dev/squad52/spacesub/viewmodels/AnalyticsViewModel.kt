package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.*
import dev.squad52.spacesub.networking.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AnalyticsViewModel(application: Application) : AndroidViewModel(application) {

    private val api = RetrofitClient.getApi(application)

    private val _overview = MutableStateFlow<AnalyticsOverview?>(null)
    val overview: StateFlow<AnalyticsOverview?> = _overview.asStateFlow()

    private val _categories = MutableStateFlow<List<CategoryItem>>(emptyList())
    val categories: StateFlow<List<CategoryItem>> = _categories.asStateFlow()

    private val _services = MutableStateFlow<List<ServiceItem>>(emptyList())
    val services: StateFlow<List<ServiceItem>> = _services.asStateFlow()

    private val _periods = MutableStateFlow<List<PeriodItem>>(emptyList())
    val periods: StateFlow<List<PeriodItem>> = _periods.asStateFlow()

    private val _scores = MutableStateFlow<List<ScoreItem>>(emptyList())
    val scores: StateFlow<List<ScoreItem>> = _scores.asStateFlow()

    private val _recommendations = MutableStateFlow<List<RecommendationItem>>(emptyList())
    val recommendations: StateFlow<List<RecommendationItem>> = _recommendations.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                _overview.value = api.getAnalyticsOverview()
                _categories.value = api.getAnalyticsByCategory()
                _services.value = api.getAnalyticsByService()
                _periods.value = api.getAnalyticsByPeriod()
                _scores.value = api.getAnalyticsScores()
                _recommendations.value = api.getAnalyticsRecommendations()
            } catch (e: Exception) {
                _error.value = "Ошибка загрузки: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }
}
