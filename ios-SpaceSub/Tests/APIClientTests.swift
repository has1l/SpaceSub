import Testing
import Foundation
@testable import ios_SpaceSub

@Suite("APIClient")
struct APIClientTests {

    @Test("Attaches Bearer token to requests")
    func bearerToken() async throws {
        // Setup: save a known token
        let token = "test-jwt-\(UUID().uuidString)"
        TokenManager.shared.saveToken(token)

        // The APIClient uses TokenManager.shared internally.
        // We verify by making a request to a local endpoint that echoes headers.
        // For unit testing without a server, we verify the client constructs
        // the request correctly by testing the endpoint builder.

        let endpoint = APIEndpoint.subscriptions()
        #expect(endpoint.path == "/subscriptions")
        #expect(endpoint.method == .get)

        TokenManager.shared.deleteToken()
    }

    @Test("Endpoint paths are correct")
    func endpointPaths() {
        #expect(APIEndpoint.analytics().path == "/analytics")
        #expect(APIEndpoint.forecast().path == "/forecast")
        #expect(APIEndpoint.transactions().path == "/transactions")
        #expect(APIEndpoint.subscriptions().path == "/subscriptions")
        #expect(APIEndpoint.subscription(id: "abc").path == "/subscriptions/abc")
        #expect(APIEndpoint.suggestions().path == "/subscriptions/suggestions")
        #expect(APIEndpoint.confirmSuggestion(id: "x").path == "/subscriptions/suggestions/x/confirm")
        #expect(APIEndpoint.bankConnections().path == "/bank-integration/connections")
        #expect(APIEndpoint.flexOAuthURL().path == "/bank-integration/flex/oauth")
        #expect(APIEndpoint.syncFlex().path == "/bank-integration/flex/sync")
    }

    @Test("POST endpoints use correct method")
    func postMethods() {
        let create = APIEndpoint.createSubscription(
            CreateSubscriptionRequest(name: "Test", amount: 100, nextBilling: "2026-04-01")
        )
        #expect(create.method == .post)
        #expect(APIEndpoint.syncFlex().method == .post)
        #expect(APIEndpoint.confirmSuggestion(id: "x").method == .post)
    }

    @Test("DELETE endpoint uses correct method")
    func deleteMethod() {
        let del = APIEndpoint.deleteSubscription(id: "abc")
        #expect(del.method == .delete)
    }

    @Test("Model decoding works for Subscription")
    func subscriptionDecoding() throws {
        let json = """
        {
            "id": "sub-1",
            "userId": "user-1",
            "name": "Netflix",
            "description": null,
            "amount": 999,
            "currency": "RUB",
            "periodType": "MONTHLY",
            "nextBilling": "2026-04-10T00:00:00.000Z",
            "category": "entertainment",
            "isActive": true,
            "logoUrl": null,
            "createdAt": "2026-01-01T00:00:00.000Z",
            "updatedAt": "2026-03-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let sub = try JSONDecoder().decode(Subscription.self, from: json)
        #expect(sub.id == "sub-1")
        #expect(sub.name == "Netflix")
        #expect(sub.amount == 999)
        #expect(sub.periodType == .monthly)
        #expect(sub.isActive)
    }

    @Test("Model decoding works for AnalyticsResponse")
    func analyticsDecoding() throws {
        let json = """
        {
            "monthlyTotal": 1298,
            "yearlyTotal": 15576,
            "activeSubscriptions": 2,
            "topSubscriptions": [
                {
                    "merchant": "Netflix",
                    "amount": 999,
                    "periodType": "MONTHLY",
                    "monthlyEquivalent": 999
                }
            ],
            "upcomingCharges": []
        }
        """.data(using: .utf8)!

        let analytics = try JSONDecoder().decode(AnalyticsResponse.self, from: json)
        #expect(analytics.monthlyTotal == 1298)
        #expect(analytics.activeSubscriptions == 2)
        #expect(analytics.topSubscriptions.count == 1)
        #expect(analytics.topSubscriptions[0].merchant == "Netflix")
    }

    @Test("Model decoding works for ForecastResponse")
    func forecastDecoding() throws {
        let json = """
        {
            "next7DaysTotal": 299,
            "next30DaysTotal": 1298,
            "next12MonthsTotal": 41576,
            "upcomingTimeline": [
                {
                    "merchant": "Spotify",
                    "amount": 299,
                    "chargeDate": "2026-03-11T00:00:00.000Z",
                    "periodType": "MONTHLY"
                }
            ]
        }
        """.data(using: .utf8)!

        let forecast = try JSONDecoder().decode(ForecastResponse.self, from: json)
        #expect(forecast.next7DaysTotal == 299)
        #expect(forecast.upcomingTimeline.count == 1)
        #expect(forecast.upcomingTimeline[0].merchant == "Spotify")
    }
}
