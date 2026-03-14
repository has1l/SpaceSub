import Foundation

final class TransactionService {

    private let client: APIClientProtocol

    init(client: APIClientProtocol = APIClient.shared) {
        self.client = client
    }

    func fetchTransactions() async throws -> [Transaction] {
        try await client.request(.transactions())
    }
}
