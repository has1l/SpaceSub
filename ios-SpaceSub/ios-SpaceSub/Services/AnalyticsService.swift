import Foundation

final class AnalyticsService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    func fetchAnalytics() async throws -> AnalyticsResponse {
        try await client.request(.analytics())
    }
}
