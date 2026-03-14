import Testing
@testable import ios_SpaceSub

@Suite("TokenManager")
struct TokenManagerTests {

    let manager = TokenManager()

    @Test("Save and retrieve token")
    func saveAndRetrieve() {
        manager.deleteToken()

        let token = "test-jwt-token-\(UUID().uuidString)"
        let saved = manager.saveToken(token)
        #expect(saved)

        let retrieved = manager.getToken()
        #expect(retrieved == token)

        manager.deleteToken()
    }

    @Test("Delete token clears keychain")
    func deleteClears() {
        manager.saveToken("token-to-delete")
        #expect(manager.hasToken)

        manager.deleteToken()
        #expect(!manager.hasToken)
        #expect(manager.getToken() == nil)
    }

    @Test("Overwrite replaces previous token")
    func overwrite() {
        manager.deleteToken()

        manager.saveToken("first-token")
        manager.saveToken("second-token")

        let retrieved = manager.getToken()
        #expect(retrieved == "second-token")

        manager.deleteToken()
    }

    @Test("hasToken reflects state")
    func hasToken() {
        manager.deleteToken()
        #expect(!manager.hasToken)

        manager.saveToken("any-token")
        #expect(manager.hasToken)

        manager.deleteToken()
    }
}
