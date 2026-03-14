import Foundation
import Observation

@Observable
final class DashboardViewModel {

    private(set) var bankConnections: [BankConnection] = []
    private(set) var isLoading = false
    private(set) var isSyncing = false
    private(set) var error: String?
    var syncResult: String?

    private let bankService: BankService

    var onUnauthorized: (() -> Void)?

    init(bankService: BankService = BankService()) {
        self.bankService = bankService
    }

    func loadDashboard() async {
        isLoading = true
        error = nil

        do {
            bankConnections = try await bankService.fetchConnections()
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func syncBank() async {
        isSyncing = true
        syncResult = nil

        do {
            let result = try await bankService.syncFlex()
            syncResult = "Синхронизация завершена: импортировано \(result.imported) транзакций из \(result.accounts) счетов"
            if result.ok {
                await loadDashboard()
            }
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            syncResult = "Ошибка синхронизации"
        }

        isSyncing = false
    }
}
