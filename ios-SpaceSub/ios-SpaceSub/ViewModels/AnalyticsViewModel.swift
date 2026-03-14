import Foundation
import Observation

@Observable
final class AnalyticsViewModel {

    private(set) var analytics: AnalyticsResponse?
    private(set) var isLoading = false
    private(set) var error: String?

    private let service: AnalyticsService

    var onUnauthorized: (() -> Void)?

    init(service: AnalyticsService = AnalyticsService()) {
        self.service = service
    }

    func load() async {
        isLoading = true
        error = nil

        do {
            analytics = try await service.fetchAnalytics()
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
