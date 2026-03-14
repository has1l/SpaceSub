import Foundation

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
