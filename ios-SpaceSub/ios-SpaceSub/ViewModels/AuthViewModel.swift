import Foundation
import Observation

@Observable
final class AuthViewModel {

    enum State: Sendable {
        case unknown
        case authenticated(User)
        case unauthenticated
    }

    private(set) var state: State = .unknown
    private(set) var isLoading = false
    private(set) var error: String?

    private let authService: AuthService

    init(authService: AuthService = AuthService()) {
        self.authService = authService
    }

    /// Check Keychain on app launch.
    /// If a JWT exists, decode user info and go straight to authenticated state.
    /// If the token is expired, the first API call will return 401 → handleUnauthorized().
    func checkExistingSession() {
        if authService.isAuthenticated {
            if let token = TokenManager.shared.getToken(),
               let user = try? decodeUser(from: token) {
                state = .authenticated(user)
            } else {
                // Token exists but can't decode — still authenticated, API will validate
                state = .authenticated(User(id: "", email: "", name: nil, avatarUrl: nil))
            }
        } else {
            state = .unauthenticated
        }
    }

    /// Start Yandex OAuth login flow.
    func login() async {
        isLoading = true
        error = nil

        do {
            let user = try await authService.loginWithYandex()
            state = .authenticated(user)
        } catch is CancellationError {
            // Task cancelled — stay on login screen
            state = .unauthenticated
        } catch let authError as AuthError {
            if case .cancelled = authError {
                // User tapped Cancel — not an error, stay on login screen
                state = .unauthenticated
                isLoading = false
                return
            }
            self.error = authError.localizedDescription
            state = .unauthenticated
        } catch {
            self.error = error.localizedDescription
            state = .unauthenticated
        }

        isLoading = false
    }

    /// Log out — clear Keychain token and reset to login screen.
    func logout() {
        authService.logout()
        state = .unauthenticated
        error = nil
    }

    /// Handle a 401 from any API call — force re-login.
    func handleUnauthorized() {
        authService.logout()
        state = .unauthenticated
        error = "Session expired. Please log in again."
    }

    // MARK: - Private

    private func decodeUser(from jwt: String) throws -> User {
        let segments = jwt.split(separator: ".")
        guard segments.count >= 2 else { throw APIError.unauthorized }

        var base64 = String(segments[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        let remainder = base64.count % 4
        if remainder != 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64) else {
            throw APIError.unauthorized
        }

        struct JWTPayload: Decodable {
            let sub: String
            let email: String
        }

        let payload = try JSONDecoder().decode(JWTPayload.self, from: data)
        return User(id: payload.sub, email: payload.email, name: nil, avatarUrl: nil)
    }
}
