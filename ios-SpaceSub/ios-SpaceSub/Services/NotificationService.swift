import Foundation

final class NotificationService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    func fetchAll() async throws -> [AppNotification] {
        try await client.request(.notifications())
    }

    func fetchUnreadCount() async throws -> Int {
        let response: UnreadCountResponse = try await client.request(.unreadCount())
        return response.count
    }

    func markAsRead(id: String) async throws {
        try await client.requestVoid(.markRead(id: id))
    }

    func markAllAsRead() async throws {
        try await client.requestVoid(.markAllRead())
    }

    func fetchSettings() async throws -> AppNotificationSettings {
        try await client.request(.notificationSettings())
    }

    func updateSettings(_ settings: AppNotificationSettings) async throws -> AppNotificationSettings {
        try await client.request(.updateNotificationSettings(settings))
    }
}
