import Foundation

nonisolated struct Transaction: Codable, Identifiable, Sendable {
    let id: String
    let userId: String
    let subscriptionId: String?
    let amount: Double
    let currency: String
    let description: String
    let source: String?
    let transactionDate: String
    let createdAt: String
    let updatedAt: String
}
