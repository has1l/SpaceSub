import Foundation

protocol APIClientProtocol: Sendable {
    func request<T: Decodable & Sendable>(_ endpoint: APIEndpoint) async throws -> T
    func requestVoid(_ endpoint: APIEndpoint) async throws
}

final class APIClient: APIClientProtocol, Sendable {

    static let shared = APIClient()

    private let baseURL: URL
    private let session: URLSession
    private let tokenManager: TokenManager
    private let decoder: JSONDecoder

    init(
        baseURL: URL = Configuration.apiBaseURL,
        session: URLSession = .shared,
        tokenManager: TokenManager = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
        self.tokenManager = tokenManager

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .useDefaultKeys
        self.decoder = decoder
    }

    // MARK: - Public

    func request<T: Decodable & Sendable>(_ endpoint: APIEndpoint) async throws -> T {
        let data = try await performRequest(endpoint)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingFailed(error)
        }
    }

    func requestVoid(_ endpoint: APIEndpoint) async throws {
        _ = try await performRequest(endpoint)
    }

    // MARK: - Private

    private func performRequest(_ endpoint: APIEndpoint) async throws -> Data {
        guard var components = URLComponents(
            url: baseURL.appendingPathComponent(endpoint.path),
            resolvingAgainstBaseURL: true
        ) else {
            throw APIError.invalidURL
        }

        if !endpoint.queryItems.isEmpty {
            components.queryItems = endpoint.queryItems
        }

        guard let url = components.url else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = tokenManager.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = endpoint.body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown
        }

        print("[APIClient] \(endpoint.method.rawValue) \(endpoint.path)")
        print("[APIClient] STATUS:", httpResponse.statusCode)
        print("[APIClient] RAW RESPONSE:", String(data: data, encoding: .utf8) ?? "nil")

        switch httpResponse.statusCode {
        case 200...299:
            return data
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        default:
            throw APIError.serverError(statusCode: httpResponse.statusCode)
        }
    }
}
