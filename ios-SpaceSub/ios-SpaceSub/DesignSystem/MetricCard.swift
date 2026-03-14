import SwiftUI

/// Compact metric display card — used for totals, counts, forecasts.
struct MetricCard: View {

    let icon: String
    let label: String
    let value: String
    var accentColor: Color = .signalPrimary

    var body: some View {
        SpaceCard(accentColor: accentColor, showTopAccent: true) {
            VStack(alignment: .leading, spacing: 8) {
                // Icon + label
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(accentColor.opacity(0.6))

                    Text(label.uppercased())
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(0.5)
                        .foregroundStyle(Color.textSecondary.opacity(0.6))
                }

                // Value
                Text(value)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
            }
        }
    }
}
