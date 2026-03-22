import Foundation

nonisolated struct AppNotification: Codable, Identifiable, Sendable {
    let id: String
    let type: NotificationType
    let title: String
    let message: String
    let isRead: Bool
    let createdAt: String
}

nonisolated enum NotificationType: String, Codable, Sendable {
    case BILLING_REMINDER
    case PRICE_CHANGE
    case NEW_TRANSACTION
    case SYSTEM
}

nonisolated struct UnreadCountResponse: Codable, Sendable {
    let count: Int
}

nonisolated struct AppNotificationSettings: Codable, Sendable {
    var emailNotifications: Bool
    var pushNotifications: Bool
    var daysBefore: Int
}
