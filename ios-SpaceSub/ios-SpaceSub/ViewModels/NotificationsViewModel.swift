import Foundation
import Observation

@Observable
final class NotificationsViewModel {

    private(set) var notifications: [AppNotification] = []
    private(set) var unreadCount: Int = 0
    private(set) var isLoading = false
    private(set) var error: String?
    var settings: AppNotificationSettings?
    var onUnauthorized: (() -> Void)?

    private let service = NotificationService()

    func load() async {
        isLoading = true
        error = nil

        do {
            notifications = try await service.fetchAll()
            unreadCount = notifications.filter { !$0.isRead }.count
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = "Не удалось загрузить уведомления"
        }

        isLoading = false
    }

    func loadUnreadCount() async {
        do {
            unreadCount = try await service.fetchUnreadCount()
        } catch {
            // Silent fail for badge
        }
    }

    func markAsRead(_ id: String) async {
        do {
            try await service.markAsRead(id: id)
            if let idx = notifications.firstIndex(where: { $0.id == id }) {
                let old = notifications[idx]
                notifications[idx] = AppNotification(
                    id: old.id,
                    type: old.type,
                    title: old.title,
                    message: old.message,
                    isRead: true,
                    createdAt: old.createdAt
                )
                unreadCount = max(0, unreadCount - 1)
            }
        } catch {
            // Silent fail
        }
    }

    func markAllAsRead() async {
        do {
            try await service.markAllAsRead()
            notifications = notifications.map {
                AppNotification(
                    id: $0.id,
                    type: $0.type,
                    title: $0.title,
                    message: $0.message,
                    isRead: true,
                    createdAt: $0.createdAt
                )
            }
            unreadCount = 0
        } catch {
            // Silent fail
        }
    }

    func loadSettings() async {
        do {
            settings = try await service.fetchSettings()
        } catch {
            // Silent fail
        }
    }

    func updateSettings() async {
        guard let settings else { return }
        do {
            self.settings = try await service.updateSettings(settings)
        } catch {
            // Silent fail
        }
    }
}
