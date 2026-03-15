import Foundation

enum Configuration {

    /// Base URL for the SpaceSub backend API.
    ///
    /// To use a local dev server instead, temporarily replace with:
    /// URL(string: "http://localhost:3000/api")!
    static let apiBaseURL = URL(string: "https://spacesub-production.up.railway.app/api")!

    /// Custom URL scheme for OAuth callback.
    /// Must match the scheme registered in Info.plist.
    static let oauthCallbackScheme = "spacesub"
}
