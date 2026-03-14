import Foundation

enum APIError: LocalizedError {
    case invalidURL
    case unauthorized
    case forbidden
    case notFound
    case serverError(statusCode: Int)
    case decodingFailed(Error)
    case networkError(Error)
    case unknown

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            "Invalid URL"
        case .unauthorized:
            "Session expired. Please log in again."
        case .forbidden:
            "Access denied"
        case .notFound:
            "Resource not found"
        case .serverError(let code):
            "Server error (\(code))"
        case .decodingFailed(let error):
            "Failed to parse response: \(error.localizedDescription)"
        case .networkError(let error):
            "Network error: \(error.localizedDescription)"
        case .unknown:
            "An unknown error occurred"
        }
    }

    var isUnauthorized: Bool {
        if case .unauthorized = self { return true }
        return false
    }
}
