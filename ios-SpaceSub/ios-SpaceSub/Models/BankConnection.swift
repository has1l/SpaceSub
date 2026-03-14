import Foundation

nonisolated enum BankProvider: String, Codable, Sendable {
    case flex = "FLEX"
}

nonisolated enum BankConnectionStatus: String, Codable, Sendable {
    case connected = "CONNECTED"
    case expired = "EXPIRED"
    case error = "ERROR"
    case disconnected = "DISCONNECTED"
}

nonisolated struct BankConnection: Codable, Identifiable, Sendable {
    let id: String
    let provider: BankProvider
    let status: BankConnectionStatus
    let lastSyncAt: String?
    let expiresAt: String?
    let createdAt: String
}

nonisolated struct BankOAuthURLResponse: Codable, Sendable {
    let url: String
}

nonisolated struct SyncResult: Codable, Sendable {
    let ok: Bool
    let provider: BankProvider
    let imported: Int
    let accounts: Int
}

nonisolated struct ConnectByCodeRequest: Codable, Sendable {
    let code: String
}

nonisolated struct ConnectByCodeResponse: Codable, Sendable {
    let ok: Bool
    let provider: BankProvider
}
