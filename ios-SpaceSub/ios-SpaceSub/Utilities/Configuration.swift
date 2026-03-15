import Foundation

enum Configuration {

    /// Base URL for the SpaceSub backend API.
    ///
    /// Change this per environment:
    /// - Local dev (simulator): http://localhost:3000/api
    /// - Local dev (device):    http://<your-ip>:3000/api
    /// - LocalTunnel:           https://<name>.loca.lt/api
    /// - Production (Railway):  https://spacesub-production.up.railway.app/api
    static let apiBaseURL: URL = {
        #if DEBUG
        // When using LocalTunnel, replace with your tunnel URL:
        // URL(string: "https://<name>.loca.lt/api")!
        URL(string: "http://localhost:3000/api")!
        #else
        URL(string: "https://spacesub-production.up.railway.app/api")!
        #endif
    }()

    /// Custom URL scheme for OAuth callback.
    /// Must match the scheme registered in Info.plist.
    static let oauthCallbackScheme = "spacesub"
}
