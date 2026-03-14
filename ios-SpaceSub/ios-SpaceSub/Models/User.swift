import Foundation

nonisolated struct User: Codable, Identifiable, Sendable {
    let id: String
    let email: String
    let name: String?
    let avatarUrl: String?
}

nonisolated struct AuthResponse: Codable, Sendable {
    let accessToken: String
    let user: User
}
