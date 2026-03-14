import Foundation
import Observation

@Observable
final class ConnectFlexViewModel {

    private(set) var isOAuthLoading = false
    private(set) var isCodeLoading = false
    private(set) var error: String?
    private(set) var success = false

    var code = ""

    var onUnauthorized: (() -> Void)?

    private let bankService: BankService

    init(bankService: BankService = BankService()) {
        self.bankService = bankService
    }

    var isCodeValid: Bool {
        let trimmed = code.trimmingCharacters(in: .whitespaces).uppercased()
        return trimmed.count == 9
            && trimmed.hasPrefix("FB-")
            && trimmed.dropFirst(3).allSatisfy { $0.isLetter || $0.isNumber }
    }

    func connectByCode() async {
        let trimmed = code.trimmingCharacters(in: .whitespaces).uppercased()
        guard isCodeValid else {
            error = "Код должен быть в формате FB-XXXXXX"
            return
        }

        isCodeLoading = true
        error = nil
        success = false

        do {
            _ = try await bankService.connectByCode(trimmed)
            success = true
            code = ""
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = "Не удалось подключить банк по коду."
        }

        isCodeLoading = false
    }

    func getOAuthURL() async -> String? {
        isOAuthLoading = true
        error = nil

        do {
            let response = try await bankService.getFlexOAuthURL()
            isOAuthLoading = false
            return response.url
        } catch let apiError as APIError where apiError.isUnauthorized {
            onUnauthorized?()
        } catch {
            self.error = "Не удалось инициировать подключение банка."
        }

        isOAuthLoading = false
        return nil
    }
}
