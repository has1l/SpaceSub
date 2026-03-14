import Foundation
import Observation

@Observable
final class SubscriptionsViewModel {

    private(set) var summary: SubscriptionSummary?
    private(set) var active: [DetectedSubscription] = []
    private(set) var upcoming: [DetectedSubscription] = []
    private(set) var isLoading = false
    private(set) var error: String?

    private let service: SubscriptionService

    var onUnauthorized: (() -> Void)?

    init(service: SubscriptionService = SubscriptionService()) {
        self.service = service
    }

    func load() async {
        isLoading = true
        error = nil

        do {
            async let s = service.fetchSummary()
            async let a = service.fetchDetectedActive()
            async let u = service.fetchDetectedUpcoming()

            let (summaryResult, activeResult, upcomingResult) = try await (s, a, u)
            summary = summaryResult
            active = activeResult.sorted {
                $0.nextExpectedCharge < $1.nextExpectedCharge
            }
            upcoming = upcomingResult
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
