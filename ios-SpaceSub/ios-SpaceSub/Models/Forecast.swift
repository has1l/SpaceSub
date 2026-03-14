import Foundation

nonisolated struct ForecastResponse: Codable, Sendable {
    let next7DaysTotal: Double
    let next30DaysTotal: Double
    let next12MonthsTotal: Double
    let upcomingTimeline: [TimelineEntry]
}

nonisolated struct TimelineEntry: Codable, Identifiable, Sendable {
    let merchant: String
    let amount: Double
    let chargeDate: String
    let periodType: BillingCycle

    var id: String { "\(merchant)-\(chargeDate)" }
}
