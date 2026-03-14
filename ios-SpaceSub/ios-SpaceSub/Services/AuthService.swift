import Foundation

final class AuthService {

    private let tokenManager: TokenManager
    private let authManager: YandexAuthManager

    init(
        tokenManager: TokenManager = .shared,
        authManager: YandexAuthManager? = nil
    ) {
        self.tokenManager = tokenManager
        self.authManager = authManager ?? YandexAuthManager(tokenManager: tokenManager)
    }

    /// Starts Yandex OAuth flow and returns the authenticated user.
    /// The JWT is stored in Keychain by YandexAuthManager before returning.
    func loginWithYandex() async throws -> User {
        try await authManager.authenticate()
    }

    /// Checks if a JWT token exists in Keychain.
    var isAuthenticated: Bool {
        tokenManager.hasToken
    }

    /// Clears the stored token from Keychain.
    func logout() {
        tokenManager.deleteToken()
    }
}
