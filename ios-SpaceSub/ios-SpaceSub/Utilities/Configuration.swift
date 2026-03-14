import Foundation

enum Configuration {

    /// Base URL for the SpaceSub backend API.
    ///
    /// Change this per environment:
    /// - Local dev (simulator): http://localhost:5174/api
    /// - Local dev (device):    http://<your-ip>:5174/api
    /// - LocalTunnel:           https://<name>.loca.lt/api
    /// - Vercel (frontend only): backend must be hosted separately
    /// - Production:              https://api.spacesub.dev/api
    static let apiBaseURL: URL = {
        #if DEBUG
        // When using LocalTunnel, replace with your tunnel URL:
        // URL(string: "https://<name>.loca.lt/api")!
        URL(string: "http://localhost:5174/api")!
        #else
        URL(string: "https://api.spacesub.dev/api")!
        #endif
    }()

    /// Custom URL scheme for OAuth callback.
    /// Must match the scheme registered in Info.plist.
    static let oauthCallbackScheme = "spacesub"
}
