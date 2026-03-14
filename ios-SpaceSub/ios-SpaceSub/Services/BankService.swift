import Foundation

final class BankService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    func fetchConnections() async throws -> [BankConnection] {
        try await client.request(.bankConnections())
    }

    func getFlexOAuthURL() async throws -> BankOAuthURLResponse {
        try await client.request(.flexOAuthURL())
    }

    func syncFlex() async throws -> SyncResult {
        try await client.request(.syncFlex())
    }

    func connectByCode(_ code: String) async throws -> ConnectByCodeResponse {
        try await client.request(.connectByCode(ConnectByCodeRequest(code: code)))
    }
}
