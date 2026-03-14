import AuthenticationServices
import UIKit

enum AuthError: LocalizedError {
    case cancelled
    case invalidCallback
    case missingToken
    case networkError(Error)

    var errorDescription: String? {
        switch self {
        case .cancelled:
            "Login was cancelled"
        case .invalidCallback:
            "Invalid authentication response"
        case .missingToken:
            "No token received from server"
        case .networkError(let error):
            "Network error: \(error.localizedDescription)"
        }
    }
}

final class YandexAuthManager: NSObject {

    private let tokenManager: TokenManager
    private let callbackScheme = Configuration.oauthCallbackScheme

    init(tokenManager: TokenManager = .shared) {
        self.tokenManager = tokenManager
        super.init()
    }

    /// Starts the Yandex OAuth flow via ASWebAuthenticationSession.
    ///
    /// Flow:
    /// 1. Opens `GET /api/auth/yandex?platform=ios` in a secure browser sheet
    /// 2. Backend redirects to Yandex OAuth consent screen
    /// 3. User authorizes with Yandex
    /// 4. Yandex calls backend callback
    /// 5. Backend detects `platform=ios` from state, redirects to `spacesub://auth/callback?token=<JWT>`
    /// 6. ASWebAuthenticationSession intercepts the custom scheme redirect
    /// 7. We extract the JWT, store in Keychain, decode user info
    ///
    /// - Returns: The authenticated `User` after token is stored in Keychain.
    func authenticate() async throws -> User {
        let token = try await startOAuthSession()
        tokenManager.saveToken(token)
        return try decodeUserFromJWT(token)
    }

    // MARK: - OAuth Session

    private func startOAuthSession() async throws -> String {
        // Build the auth URL with platform=ios so backend redirects to spacesub://
        var components = URLComponents(
            url: Configuration.apiBaseURL.appendingPathComponent("auth/yandex"),
            resolvingAgainstBaseURL: true
        )!
        components.queryItems = [URLQueryItem(name: "platform", value: "ios")]

        guard let authURL = components.url else {
            throw APIError.invalidURL
        }

        return try await withCheckedThrowingContinuation { [weak self] continuation in
            guard let self else {
                continuation.resume(throwing: AuthError.cancelled)
                return
            }

            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: self.callbackScheme
            ) { callbackURL, error in

                // Handle cancellation (user tapped "Cancel" in the browser sheet)
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    continuation.resume(throwing: AuthError.cancelled)
                    return
                }

                // Handle other errors
                if let error {
                    continuation.resume(throwing: AuthError.networkError(error))
                    return
                }

                // Validate callback URL
                guard let callbackURL else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                guard let components = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false) else {
                    continuation.resume(throwing: AuthError.invalidCallback)
                    return
                }

                // Extract token from: spacesub://auth/callback?token=<JWT>
                guard let token = components.queryItems?.first(where: { $0.name == "token" })?.value,
                      !token.isEmpty else {
                    continuation.resume(throwing: AuthError.missingToken)
                    return
                }

                continuation.resume(returning: token)
            }

            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = self

            session.start()
        }
    }

    // MARK: - JWT Decode

    /// Decodes user info from the JWT payload without verifying signature.
    /// Signature verification happens server-side — this is only for UI display.
    private func decodeUserFromJWT(_ jwt: String) throws -> User {
        let segments = jwt.split(separator: ".")
        guard segments.count >= 2 else {
            throw AuthError.invalidCallback
        }

        // Base64URL → Base64 (replace URL-safe chars, add padding)
        var base64 = String(segments[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        let remainder = base64.count % 4
        if remainder != 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }

        guard let data = Data(base64Encoded: base64) else {
            throw AuthError.invalidCallback
        }

        // The backend signs: { sub: user.id, email: user.email }
        // name and avatarUrl are NOT in the JWT payload — they come from the /users endpoint
        struct JWTPayload: Decodable {
            let sub: String
            let email: String
        }

        let payload = try JSONDecoder().decode(JWTPayload.self, from: data)

        return User(
            id: payload.sub,
            email: payload.email,
            name: nil,
            avatarUrl: nil
        )
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension YandexAuthManager: @preconcurrency ASWebAuthenticationPresentationContextProviding {

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first,
              let window = windowScene.windows.first
        else {
            return ASPresentationAnchor()
        }
        return window
    }
}
