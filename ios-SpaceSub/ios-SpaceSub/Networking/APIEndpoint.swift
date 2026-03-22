import Foundation

enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
    case patch = "PATCH"
}

struct APIEndpoint: Sendable {
    let path: String
    let method: HTTPMethod
    let body: (any Encodable & Sendable)?
    let queryItems: [URLQueryItem]

    init(
        path: String,
        method: HTTPMethod = .get,
        body: (any Encodable & Sendable)? = nil,
        queryItems: [URLQueryItem] = []
    ) {
        self.path = path
        self.method = method
        self.body = body
        self.queryItems = queryItems
    }
}

// MARK: - Auth Endpoints

extension APIEndpoint {
    static func yandexAuth() -> APIEndpoint {
        APIEndpoint(path: "/auth/yandex")
    }
}

// MARK: - Subscription Endpoints

extension APIEndpoint {
    static func subscriptions() -> APIEndpoint {
        APIEndpoint(path: "/subscriptions")
    }

    static func subscription(id: String) -> APIEndpoint {
        APIEndpoint(path: "/subscriptions/\(id)")
    }

    static func createSubscription(_ body: CreateSubscriptionRequest) -> APIEndpoint {
        APIEndpoint(path: "/subscriptions", method: .post, body: body)
    }

    static func deleteSubscription(id: String) -> APIEndpoint {
        APIEndpoint(path: "/subscriptions/\(id)", method: .delete)
    }

    static func suggestions() -> APIEndpoint {
        APIEndpoint(path: "/subscriptions/suggestions")
    }

    static func confirmSuggestion(id: String) -> APIEndpoint {
        APIEndpoint(path: "/subscriptions/suggestions/\(id)/confirm", method: .post)
    }
}

// MARK: - Transaction Endpoints

extension APIEndpoint {
    static func transactions() -> APIEndpoint {
        APIEndpoint(path: "/transactions")
    }
}

// MARK: - Analytics Endpoints

extension APIEndpoint {
    static func analytics() -> APIEndpoint {
        APIEndpoint(path: "/analytics")
    }

    static func analyticsOverview(from: Date? = nil, to: Date? = nil) -> APIEndpoint {
        APIEndpoint(path: "/analytics/overview", queryItems: dateQueryItems(from: from, to: to))
    }

    static func analyticsByCategory(from: Date? = nil, to: Date? = nil) -> APIEndpoint {
        APIEndpoint(path: "/analytics/by-category", queryItems: dateQueryItems(from: from, to: to))
    }

    static func analyticsByService(limit: Int = 8, from: Date? = nil, to: Date? = nil) -> APIEndpoint {
        var items = dateQueryItems(from: from, to: to)
        items.append(URLQueryItem(name: "limit", value: "\(limit)"))
        return APIEndpoint(path: "/analytics/by-service", queryItems: items)
    }

    static func analyticsByPeriod(from: Date? = nil, to: Date? = nil) -> APIEndpoint {
        APIEndpoint(path: "/analytics/by-period", queryItems: dateQueryItems(from: from, to: to))
    }

    static func analyticsScores() -> APIEndpoint {
        APIEndpoint(path: "/analytics/scores")
    }

    static func analyticsRecommendations() -> APIEndpoint {
        APIEndpoint(path: "/analytics/recommendations")
    }

    private static func dateQueryItems(from: Date?, to: Date?) -> [URLQueryItem] {
        let formatter = ISO8601DateFormatter()
        var items: [URLQueryItem] = []
        if let from { items.append(URLQueryItem(name: "from", value: formatter.string(from: from))) }
        if let to { items.append(URLQueryItem(name: "to", value: formatter.string(from: to))) }
        return items
    }
}

// MARK: - Forecast Endpoints

extension APIEndpoint {
    static func forecast() -> APIEndpoint {
        APIEndpoint(path: "/forecast")
    }
}

// MARK: - Detected Subscriptions Endpoints

extension APIEndpoint {
    static func detectedSubscriptions() -> APIEndpoint {
        APIEndpoint(path: "/detected-subscriptions")
    }

    static func detectedSubscriptionsActive() -> APIEndpoint {
        APIEndpoint(path: "/detected-subscriptions/active")
    }

    static func detectedSubscriptionsUpcoming() -> APIEndpoint {
        APIEndpoint(path: "/detected-subscriptions/upcoming")
    }

    static func detectedSubscriptionsSummary() -> APIEndpoint {
        APIEndpoint(path: "/detected-subscriptions/summary")
    }
}

// MARK: - Notification Endpoints

extension APIEndpoint {
    static func notifications() -> APIEndpoint {
        APIEndpoint(path: "/notifications")
    }

    static func unreadCount() -> APIEndpoint {
        APIEndpoint(path: "/notifications/unread-count")
    }

    static func markRead(id: String) -> APIEndpoint {
        APIEndpoint(path: "/notifications/\(id)/read", method: .patch)
    }

    static func markAllRead() -> APIEndpoint {
        APIEndpoint(path: "/notifications/read-all", method: .patch)
    }

    static func notificationSettings() -> APIEndpoint {
        APIEndpoint(path: "/notifications/settings")
    }

    static func updateNotificationSettings(_ body: AppNotificationSettings) -> APIEndpoint {
        APIEndpoint(path: "/notifications/settings", method: .put, body: body)
    }
}

// MARK: - Bank Integration Endpoints

extension APIEndpoint {
    static func bankConnections() -> APIEndpoint {
        APIEndpoint(path: "/bank-integration/connections")
    }

    static func flexOAuthURL() -> APIEndpoint {
        APIEndpoint(path: "/bank-integration/flex/oauth")
    }

    static func syncFlex() -> APIEndpoint {
        APIEndpoint(path: "/bank-integration/flex/sync", method: .post)
    }

    static func connectByCode(_ body: ConnectByCodeRequest) -> APIEndpoint {
        APIEndpoint(path: "/bank-integration/flex/connect-by-code", method: .post, body: body)
    }
}
