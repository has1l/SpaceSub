import Foundation

final class ForecastService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    func fetchForecast() async throws -> ForecastResponse {
        try await client.request(.forecast())
    }
}
