import Foundation
import Observation

enum PeriodPreset: String, CaseIterable, Sendable {
    case week = "7д"
    case oneMonth = "1мес"
    case threeMonths = "3мес"
    case year = "12мес"

    var dateRange: (from: Date, to: Date) {
        let now = Date()
        let calendar = Calendar.current
        let from: Date
        switch self {
        case .week:
            from = calendar.date(byAdding: .day, value: -7, to: now)!
        case .oneMonth:
            from = calendar.date(byAdding: .month, value: -1, to: now)!
        case .threeMonths:
            from = calendar.date(byAdding: .month, value: -3, to: now)!
        case .year:
            from = calendar.date(byAdding: .year, value: -1, to: now)!
        }
        return (from, now)
    }
}

@Observable
final class AnalyticsViewModel {

    // Data
    private(set) var overview: AnalyticsOverview?
    private(set) var categories: [CategoryItem] = []
    private(set) var services: [ServiceItem] = []
    private(set) var periods: [PeriodItem] = []
    private(set) var scores: [ScoreItem] = []
    private(set) var recommendations: [RecommendationItem] = []

    // Cached derived data (recomputed only on data change)
    private(set) var periodsWithAvg: [PeriodItemWithAvg] = []
    private(set) var rankedServices: [(service: ServiceItem, rank: Int)] = []
    private(set) var budgetHealthScore: Double = 100
    private(set) var optimizationPotential: Double = 0
    private(set) var subscriptionDensity: Double = 0
    private(set) var totalPotentialSavings: Double = 0
    private(set) var periodTotals: [Double] = []

    // State
    var selectedPeriod: PeriodPreset = .oneMonth
    var selectedCategory: String? = nil
    var scoreFilter: ScoreFilter = .all
    private(set) var isLoading = false
    private(set) var isChartLoading = false
    private(set) var error: String?

    var onUnauthorized: (() -> Void)?

    private let service: AnalyticsService
    private var loadTask: Task<Void, Never>?

    init(service: AnalyticsService = AnalyticsService()) {
        self.service = service
    }

    // MARK: - Computed (cheap)

    var filteredScores: [ScoreItem] {
        switch scoreFilter {
        case .all: return scores
        case .risky: return scores.filter { $0.churnRisk == .HIGH || $0.churnRisk == .MEDIUM }
        case .healthy: return scores.filter { $0.churnRisk == .LOW }
        }
    }

    // Service lookup cache
    private var servicesByCategory: [String: [ServiceItem]] = [:]

    func services(for category: String) -> [ServiceItem] {
        servicesByCategory[category] ?? []
    }

    // MARK: - Actions

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        error = nil
        await fetchAll()
        recomputeDerivedData()
        isLoading = false
    }

    func changePeriod(_ period: PeriodPreset) async {
        loadTask?.cancel()
        selectedPeriod = period
        selectedCategory = nil
        isChartLoading = true
        let task = Task { await fetchDateRangeData() }
        loadTask = task
        await task.value
        guard !task.isCancelled else { return }
        recomputeDerivedData()
        isChartLoading = false
    }

    // MARK: - Derived Data Recomputation

    private func recomputeDerivedData() {
        // periodsWithAvg
        periodsWithAvg = periods.enumerated().map { i, item in
            let windowStart = max(0, i - 2)
            let window = Array(periods[windowStart...i])
            let avg = window.map(\.total).reduce(0, +) / Double(window.count)
            return PeriodItemWithAvg(
                id: item.period,
                period: item.period,
                total: item.total,
                count: item.count,
                momGrowthPct: item.momGrowthPct,
                movingAvg: avg
            )
        }

        // rankedServices
        let sorted = services.sorted { $0.monthlyAmount > $1.monthlyAmount }
        rankedServices = sorted.enumerated().map { ($1, rank: $0 + 1) }

        // servicesByCategory
        servicesByCategory = Dictionary(grouping: services, by: \.category)

        // budgetHealthScore
        let high = Double(recommendations.filter { $0.priority == .HIGH }.count)
        let med = Double(recommendations.filter { $0.priority == .MEDIUM }.count)
        budgetHealthScore = max(0, min(100, 100 - high * 20 - med * 10))

        // optimizationPotential
        if let ov = overview, ov.periodTotal > 0 {
            let savings = recommendations.reduce(0.0) { $0 + $1.potentialSavings }
            optimizationPotential = min(100, (savings / 12) / ov.periodTotal * 100)
        } else {
            optimizationPotential = 0
        }

        // subscriptionDensity
        let catCount = max(1, Set(categories.map(\.category)).count)
        subscriptionDensity = Double(overview?.activeCount ?? 0) / Double(catCount)

        // totalPotentialSavings
        totalPotentialSavings = recommendations.reduce(0) { $0 + $1.potentialSavings }

        // periodTotals
        periodTotals = Array(periods.suffix(6).map(\.total))
    }

    // MARK: - Private

    private func fetchAll() async {
        let range = selectedPeriod.dateRange

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchOverview(from: range.from, to: range.to) }
            group.addTask { await self.fetchCategories(from: range.from, to: range.to) }
            group.addTask { await self.fetchServices(from: range.from, to: range.to) }
            group.addTask { await self.fetchPeriods(from: range.from, to: range.to) }
            group.addTask { await self.fetchScores() }
            group.addTask { await self.fetchRecommendations() }
        }
    }

    private func fetchDateRangeData() async {
        let range = selectedPeriod.dateRange

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchOverview(from: range.from, to: range.to) }
            group.addTask { await self.fetchCategories(from: range.from, to: range.to) }
            group.addTask { await self.fetchServices(from: range.from, to: range.to) }
            group.addTask { await self.fetchPeriods(from: range.from, to: range.to) }
        }
    }

    @MainActor
    private func fetchOverview(from: Date, to: Date) async {
        do {
            overview = try await service.fetchOverview(from: from, to: to)
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }
    }

    @MainActor
    private func fetchCategories(from: Date, to: Date) async {
        do {
            categories = try await service.fetchByCategory(from: from, to: to)
        } catch is APIError {} catch {}
    }

    @MainActor
    private func fetchServices(from: Date, to: Date) async {
        do {
            services = try await service.fetchByService(limit: 15, from: from, to: to)
        } catch is APIError {} catch {}
    }

    @MainActor
    private func fetchPeriods(from: Date, to: Date) async {
        do {
            periods = try await service.fetchByPeriod(from: from, to: to)
        } catch is APIError {} catch {}
    }

    @MainActor
    private func fetchScores() async {
        do {
            scores = try await service.fetchScores()
        } catch is APIError {} catch {}
    }

    @MainActor
    private func fetchRecommendations() async {
        do {
            recommendations = try await service.fetchRecommendations()
        } catch is APIError {} catch {}
    }
}
