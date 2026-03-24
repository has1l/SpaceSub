import Foundation
import Observation

@Observable
final class SubscriptionsViewModel {

    private(set) var summary: SubscriptionSummary?
    private(set) var active: [DetectedSubscription] = []
    private(set) var upcoming: [DetectedSubscription] = []
    private(set) var manualSubs: [Subscription] = []
    private(set) var isLoading = false
    private(set) var error: String?

    var showAddSheet = false
    var editingSub: Subscription? = nil

    private let service: SubscriptionService

    var onUnauthorized: (() -> Void)?

    init(service: SubscriptionService = SubscriptionService()) {
        self.service = service
    }

    private(set) var cancellingId: String?
    private(set) var deletingManualId: String?
    private(set) var showCancelConfirm = false
    private(set) var showDeleteManualConfirm = false
    private var pendingCancelId: String?
    private var pendingDeleteManualId: String?

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

    // MARK: - Manual Subscription Delete

    func requestDeleteManual(id: String) {
        pendingDeleteManualId = id
        showDeleteManualConfirm = true
    }

    func dismissDeleteManual() {
        showDeleteManualConfirm = false
        pendingDeleteManualId = nil
    }

    func confirmDeleteManual() async {
        guard let id = pendingDeleteManualId else { return }
        showDeleteManualConfirm = false
        deletingManualId = id

        do {
            try await service.deleteSubscription(id: id)
            manualSubs.removeAll { $0.id == id }
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        deletingManualId = nil
        pendingDeleteManualId = nil
    }

    // MARK: - Manual Subscription Create / Update

    func createManual(_ body: CreateSubscriptionRequest) async {
        do {
            let sub = try await service.createSubscription(body)
            manualSubs.insert(sub, at: 0)
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func updateManual(id: String, _ body: CreateSubscriptionRequest) async {
        do {
            let updated = try await service.updateSubscription(id: id, body)
            if let idx = manualSubs.firstIndex(where: { $0.id == id }) {
                manualSubs[idx] = updated
            }
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }
    }

    // MARK: - Load

    func load() async {
        isLoading = true
        error = nil

        do {
            async let s = service.fetchSummary()
            async let a = service.fetchDetectedActive()
            async let u = service.fetchDetectedUpcoming()
            async let m = service.fetchSubscriptions()

            let (summaryResult, activeResult, upcomingResult, manualResult) = try await (s, a, u, m)
            summary = summaryResult
            active = activeResult.sorted {
                $0.nextExpectedCharge < $1.nextExpectedCharge
            }
            upcoming = upcomingResult
            manualSubs = manualResult
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }
}
