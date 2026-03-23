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

    private(set) var cancellingId: String?
    private(set) var showCancelConfirm = false
    private var pendingCancelId: String?

    func requestCancel(id: String) {
        pendingCancelId = id
        showCancelConfirm = true
    }

    func dismissCancel() {
        showCancelConfirm = false
        pendingCancelId = nil
    }

    func confirmCancel() async {
        guard let id = pendingCancelId else { return }
        showCancelConfirm = false
        cancellingId = id

        do {
            _ = try await service.cancelDetectedSubscription(id: id)
            active.removeAll { $0.id == id }
            upcoming.removeAll { $0.id == id }
            if let s = try? await service.fetchSummary() {
                summary = s
            }
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        cancellingId = nil
        pendingCancelId = nil
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
