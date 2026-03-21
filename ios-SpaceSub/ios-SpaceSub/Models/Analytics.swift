import Foundation

// MARK: - Legacy (backward compat)

nonisolated struct AnalyticsResponse: Codable, Sendable {
    let monthlyTotal: Double
    let yearlyTotal: Double
    let activeSubscriptions: Int
    let topSubscriptions: [TopSubscription]
    let upcomingCharges: [UpcomingCharge]
}

nonisolated struct TopSubscription: Codable, Identifiable, Sendable {
    let merchant: String
    let amount: Double
    let periodType: BillingCycle
    let monthlyEquivalent: Double

    var id: String { merchant }
}

nonisolated struct UpcomingCharge: Codable, Identifiable, Sendable {
    let merchant: String
    let amount: Double
    let nextExpectedCharge: String
    let periodType: BillingCycle

    var id: String { "\(merchant)-\(nextExpectedCharge)" }
}

// MARK: - Overview

nonisolated struct AnalyticsOverview: Codable, Sendable {
    let mrr: Double
    let arr: Double
    let activeCount: Int
    let upcomingCount: Int
    let periodTotal: Double
    let trend: TrendInfo
}

nonisolated struct TrendInfo: Codable, Sendable {
    let currentMonth: Double
    let prevMonth: Double
    let changePct: Double
}

// MARK: - By Category

nonisolated struct CategoryItem: Codable, Identifiable, Sendable {
    let category: String
    let color: String
    let total: Double
    let count: Int
    let percent: Double

    var id: String { category }
}

// MARK: - By Service

nonisolated struct ServiceItem: Codable, Identifiable, Sendable {
    let merchant: String
    let monthlyAmount: Double
    let yearlyAmount: Double
    let category: String
    let color: String

    var id: String { merchant }
}

// MARK: - By Period

nonisolated struct PeriodItem: Codable, Identifiable, Sendable {
    let period: String
    let total: Double
    let count: Int
    let momGrowthPct: Double?

    var id: String { period }
}

// MARK: - Scores

nonisolated enum ChurnRisk: String, Codable, Sendable {
    case LOW, MEDIUM, HIGH
}

nonisolated struct ScoreItem: Codable, Identifiable, Sendable {
    let subscriptionId: String
    let merchant: String
    let valueScore: Int
    let churnRisk: ChurnRisk
    let label: String
    let monthlyAmount: Double

    var id: String { subscriptionId }
}

// MARK: - Recommendations

nonisolated enum RecoType: String, Codable, Sendable {
    case CANCEL, REVIEW, DOWNGRADE, CONSOLIDATE
}

nonisolated enum RecoPriority: String, Codable, Sendable {
    case HIGH, MEDIUM, LOW
}

nonisolated struct RecommendationItem: Codable, Identifiable, Sendable {
    let type: RecoType
    let priority: RecoPriority
    let merchant: String
    let currentCost: Double
    let potentialSavings: Double
    let reason: String

    var id: String { "\(type.rawValue)-\(merchant)" }
}

// MARK: - Period with Moving Average

struct PeriodItemWithAvg: Identifiable {
    let id: String
    let period: String
    let total: Double
    let count: Int
    let momGrowthPct: Double?
    let movingAvg: Double
}

// MARK: - Score Filter

enum ScoreFilter: String, CaseIterable, Identifiable {
    case all, risky, healthy

    var id: String { rawValue }

    var label: String {
        switch self {
        case .all: "Все"
        case .risky: "Проблемные"
        case .healthy: "Здоровые"
        }
    }
}
