import Foundation

enum DateFormatting {

    private static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let iso8601NoFraction: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    private static let displayDate: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()

    private static let displayDateTime: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ru_RU")
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter
    }()

    /// Parse an ISO 8601 string from the backend.
    static func parse(_ string: String) -> Date? {
        iso8601.date(from: string) ?? iso8601NoFraction.date(from: string)
    }

    /// Format a Date for display (e.g. "10 мар. 2026").
    static func formatDate(_ date: Date) -> String {
        displayDate.string(from: date)
    }

    /// Format an ISO 8601 string directly for display.
    static func formatDate(_ isoString: String) -> String {
        guard let date = parse(isoString) else { return isoString }
        return displayDate.string(from: date)
    }

    /// Format a Date with time for display.
    static func formatDateTime(_ date: Date) -> String {
        displayDateTime.string(from: date)
    }

    /// Alias for parse — used in views for clarity.
    static func parseISO(_ string: String) -> Date? {
        parse(string)
    }
}
