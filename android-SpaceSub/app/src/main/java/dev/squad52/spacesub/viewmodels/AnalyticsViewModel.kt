package dev.squad52.spacesub.viewmodels

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import dev.squad52.spacesub.models.*
import dev.squad52.spacesub.networking.RetrofitClient
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter

enum class PeriodPreset(val label: String, val daysBack: Long) {
    WEEK("7д", 7),
    MONTH("1мес", 30),
    THREE_MONTHS("3мес", 90),
    YEAR("12мес", 365)
}

enum class ScoreFilter(val label: String) {
    ALL("Все"),
    LOW("Низкий"),
    MEDIUM("Средний"),
    HIGH("Высокий")
}

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

    private val _selectedPeriod = MutableStateFlow(PeriodPreset.MONTH)
    val selectedPeriod: StateFlow<PeriodPreset> = _selectedPeriod.asStateFlow()

    private val _selectedCategory = MutableStateFlow<String?>(null)
    val selectedCategory: StateFlow<String?> = _selectedCategory.asStateFlow()

    private val _scoreFilter = MutableStateFlow(ScoreFilter.ALL)
    val scoreFilter: StateFlow<ScoreFilter> = _scoreFilter.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    fun load() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            try {
                val (from, to) = periodRange(_selectedPeriod.value)

                val overviewD = async { runCatching { api.getAnalyticsOverview(from, to) }.getOrNull() }
                val categoriesD = async { runCatching { api.getAnalyticsByCategory(from, to) }.getOrDefault(emptyList()) }
                val servicesD = async { runCatching { api.getAnalyticsByService(from = from, to = to) }.getOrDefault(emptyList()) }
                val periodsD = async { runCatching { api.getAnalyticsByPeriod(from, to) }.getOrDefault(emptyList()) }
                val scoresD = async { runCatching { api.getAnalyticsScores() }.getOrDefault(emptyList()) }
                val recosD = async { runCatching { api.getAnalyticsRecommendations() }.getOrDefault(emptyList()) }

                _overview.value = overviewD.await()
                _categories.value = categoriesD.await()
                _services.value = servicesD.await()
                _periods.value = periodsD.await()
                _scores.value = scoresD.await()
                _recommendations.value = recosD.await()
            } catch (e: Exception) {
                _error.value = "Ошибка загрузки: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun changePeriod(preset: PeriodPreset) {
        _selectedPeriod.value = preset
        load()
    }

    fun selectCategory(category: String?) {
        _selectedCategory.value = if (_selectedCategory.value == category) null else category
    }

    fun changeScoreFilter(filter: ScoreFilter) {
        _scoreFilter.value = filter
    }

    fun filteredScores(): List<ScoreItem> {
        val all = _scores.value
        return when (_scoreFilter.value) {
            ScoreFilter.ALL -> all
            ScoreFilter.LOW -> all.filter { it.churnRisk == ChurnRisk.LOW }
            ScoreFilter.MEDIUM -> all.filter { it.churnRisk == ChurnRisk.MEDIUM }
            ScoreFilter.HIGH -> all.filter { it.churnRisk == ChurnRisk.HIGH }
        }
    }

    fun rankedServices(): List<ServiceItem> {
        return _services.value.sortedByDescending { it.monthlyAmount }
    }

    fun servicesForCategory(category: String): List<ServiceItem> {
        return _services.value.filter { it.category == category }
    }

    val totalPotentialSavings: Double
        get() = _recommendations.value.sumOf { it.potentialSavings }

    val budgetHealthScore: Double
        get() {
            val recos = _recommendations.value
            val high = recos.count { it.priority == RecoPriority.HIGH }.toDouble()
            val med = recos.count { it.priority == RecoPriority.MEDIUM }.toDouble()
            return (100.0 - high * 20.0 - med * 10.0).coerceIn(0.0, 100.0)
        }

    val optimizationPotential: Double
        get() {
            val overview = _overview.value ?: return 0.0
            if (overview.periodTotal == 0.0) return 0.0
            val savings = totalPotentialSavings
            return ((savings / 12.0) / overview.periodTotal * 100.0).coerceAtMost(100.0)
        }

    val subscriptionDensity: Double
        get() {
            val overview = _overview.value ?: return 0.0
            val catCount = _categories.value.map { it.category }.toSet().size
            if (catCount == 0) return 0.0
            return overview.activeCount.toDouble() / catCount.toDouble()
        }

    private fun periodRange(preset: PeriodPreset): Pair<String, String> {
        val fmt = DateTimeFormatter.ISO_LOCAL_DATE
        val to = LocalDate.now()
        val from = to.minusDays(preset.daysBack)
        return Pair(from.format(fmt), to.format(fmt))
    }
}
