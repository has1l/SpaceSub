import Foundation

nonisolated enum BillingCycle: String, Codable, Sendable, CaseIterable {
    case weekly = "WEEKLY"
    case monthly = "MONTHLY"
    case quarterly = "QUARTERLY"
    case yearly = "YEARLY"

    var displayName: String {
        switch self {
        case .weekly: "Weekly"
        case .monthly: "Monthly"
        case .quarterly: "Quarterly"
        case .yearly: "Yearly"
        }
    }

    var russianName: String {
        switch self {
        case .weekly: "Еженедельно"
        case .monthly: "Ежемесячно"
        case .quarterly: "Ежеквартально"
        case .yearly: "Ежегодно"
        }
    }

    var shortLabel: String {
        switch self {
        case .weekly: "/ нед"
        case .monthly: "/ мес"
        case .quarterly: "/ кв"
        case .yearly: "/ год"
        }
    }
}

nonisolated struct Subscription: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let name: String
    let description: String?
    let amount: Double
    let currency: String
    let periodType: BillingCycle
    let nextBilling: String
    let category: String?
    let isActive: Bool
    let logoUrl: String?
    let createdAt: String
    let updatedAt: String
}

nonisolated struct CreateSubscriptionRequest: Codable, Sendable {
    let name: String
    var description: String?
    let amount: Double
    var currency: String = "RUB"
    var periodType: BillingCycle = .monthly
    let nextBilling: String
    var category: String?
    var isActive: Bool = true
    var logoUrl: String?

    enum CodingKeys: String, CodingKey {
        case name, description, amount, currency
        case periodType = "billingCycle"
        case nextBilling, category, isActive, logoUrl
    }
}

nonisolated struct DetectedSubscription: Codable, Identifiable, Sendable {
    let id: String
    let merchant: String
    let amount: Double
    let currency: String
    let periodType: BillingCycle
    let lastChargeDate: String
    let nextExpectedCharge: String
    let isActive: Bool
    let confidence: Double
    let transactionCount: Int
    let logoUrl: String?
}

nonisolated struct CancelSubscriptionResponse: Codable, Sendable {
    let cancelled: Bool
    let bankPaymentId: String?
}

nonisolated struct ConfirmSuggestionResponse: Codable, Sendable {
    let subscription: Subscription
    let linkedTransactions: Int
}

nonisolated struct SubscriptionSummary: Codable, Sendable {
    let activeCount: Int
    let monthlyTotal: Double
    let yearlyTotal: Double
    let upcomingNext7Days: [DetectedSubscription]
}
