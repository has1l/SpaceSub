import Foundation

final class SubscriptionService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    func fetchSubscriptions() async throws -> [Subscription] {
        try await client.request(.subscriptions())
    }

    func fetchSubscription(id: String) async throws -> Subscription {
        try await client.request(.subscription(id: id))
    }

    func createSubscription(_ body: CreateSubscriptionRequest) async throws -> Subscription {
        try await client.request(.createSubscription(body))
    }

    func deleteSubscription(id: String) async throws {
        try await client.requestVoid(.deleteSubscription(id: id))
    }

    func fetchSuggestions() async throws -> [DetectedSubscription] {
        try await client.request(.suggestions())
    }

    func confirmSuggestion(id: String) async throws -> ConfirmSuggestionResponse {
        try await client.request(.confirmSuggestion(id: id))
    }

    // MARK: - Detected Subscriptions

    func fetchDetectedActive() async throws -> [DetectedSubscription] {
        try await client.request(.detectedSubscriptionsActive())
    }

    func fetchDetectedUpcoming() async throws -> [DetectedSubscription] {
        try await client.request(.detectedSubscriptionsUpcoming())
    }

    func fetchSummary() async throws -> SubscriptionSummary {
        try await client.request(.detectedSubscriptionsSummary())
    }
}
