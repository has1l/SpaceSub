import Foundation

final class AnalyticsService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    // Legacy
    func fetchAnalytics() async throws -> AnalyticsResponse {
        try await client.request(.analytics())
    }

    // New endpoints
    func fetchOverview(from: Date? = nil, to: Date? = nil) async throws -> AnalyticsOverview {
        try await client.request(.analyticsOverview(from: from, to: to))
    }

    func fetchByCategory(from: Date? = nil, to: Date? = nil) async throws -> [CategoryItem] {
        try await client.request(.analyticsByCategory(from: from, to: to))
    }

    func fetchByService(limit: Int = 8, from: Date? = nil, to: Date? = nil) async throws -> [ServiceItem] {
        try await client.request(.analyticsByService(limit: limit, from: from, to: to))
    }

    func fetchByPeriod(granularity: String = "month", from: Date? = nil, to: Date? = nil) async throws -> [PeriodItem] {
        try await client.request(.analyticsByPeriod(granularity: granularity, from: from, to: to))
    }

    func fetchScores() async throws -> [ScoreItem] {
        try await client.request(.analyticsScores())
    }

    func fetchRecommendations() async throws -> [RecommendationItem] {
        try await client.request(.analyticsRecommendations())
    }
}
