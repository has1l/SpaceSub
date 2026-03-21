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

    // State
    var selectedPeriod: PeriodPreset = .oneMonth
    var selectedCategory: String? = nil
    var scoreFilter: ScoreFilter = .all
    private(set) var isLoading = false
    private(set) var isChartLoading = false
    private(set) var error: String?

    var onUnauthorized: (() -> Void)?

    private let service: AnalyticsService

    init(service: AnalyticsService = AnalyticsService()) {
        self.service = service
    }

    // MARK: - Computed

    var periodsWithAvg: [PeriodItemWithAvg] {
        periods.enumerated().map { i, item in
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
    }

    var rankedServices: [(service: ServiceItem, rank: Int)] {
        let sorted = services.sorted { $0.monthlyAmount > $1.monthlyAmount }
        return sorted.enumerated().map { ($1, rank: $0 + 1) }
    }

    var filteredScores: [ScoreItem] {
        switch scoreFilter {
        case .all: return scores
        case .risky: return scores.filter { $0.churnRisk == .HIGH || $0.churnRisk == .MEDIUM }
        case .healthy: return scores.filter { $0.churnRisk == .LOW }
        }
    }

    var budgetHealthScore: Double {
        let high = Double(recommendations.filter { $0.priority == .HIGH }.count)
        let med = Double(recommendations.filter { $0.priority == .MEDIUM }.count)
        return max(0, min(100, 100 - high * 20 - med * 10))
    }

    var optimizationPotential: Double {
        guard let ov = overview, ov.periodTotal > 0 else { return 0 }
        let savings = recommendations.reduce(0.0) { $0 + $1.potentialSavings }
        return min(100, (savings / 12) / ov.periodTotal * 100)
    }

    var subscriptionDensity: Double {
        let catCount = max(1, Set(categories.map(\.category)).count)
        return Double(overview?.activeCount ?? 0) / Double(catCount)
    }

    var totalPotentialSavings: Double {
        recommendations.reduce(0) { $0 + $1.potentialSavings }
    }

    var periodTotals: [Double] {
        Array(periods.suffix(6).map(\.total))
    }

    func services(for category: String) -> [ServiceItem] {
        services.filter { $0.category == category }
    }

    // MARK: - Actions

    func load() async {
        isLoading = true
        error = nil
        await fetchAll()
        isLoading = false
    }

    func changePeriod(_ period: PeriodPreset) async {
        selectedPeriod = period
        selectedCategory = nil
        isChartLoading = true
        await fetchDateRangeData()
        isChartLoading = false
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
