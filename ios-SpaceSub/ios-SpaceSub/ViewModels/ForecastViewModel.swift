import Foundation
import Observation

@Observable
final class ForecastViewModel {

    private(set) var forecast: ForecastResponse?
    private(set) var isLoading = false
    private(set) var error: String?

    private let service: ForecastService

    var onUnauthorized: (() -> Void)?

    init(service: ForecastService = ForecastService()) {
        self.service = service
    }

    func load() async {
        isLoading = true
        error = nil

        do {
            forecast = try await service.fetchForecast()
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
