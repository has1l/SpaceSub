import SwiftUI

/// Animated orbit ring decoration — matches `.orbit-ring-animated` from the web.
struct OrbitIndicator: View {

    var color: Color = .signalPrimary
    var size: CGFloat = 40
    var duration: Double = 8

    @State private var pulsing = false

    var body: some View {
        Circle()
            .strokeBorder(color.opacity(0.08), lineWidth: 1)
            .frame(width: size, height: size)
            .scaleEffect(pulsing ? 1.08 : 1.0)
            .opacity(pulsing ? 0.4 : 0.8)
            .overlay(
                // Satellite dot
                Circle()
                    .fill(color)
                    .frame(width: 4, height: 4)
                    .shadow(color: color.opacity(0.6), radius: 3)
                    .offset(y: -size / 2)
                    .rotationEffect(.degrees(pulsing ? 360 : 0))
            )
            .onAppear {
                withAnimation(.easeInOut(duration: duration).repeatForever(autoreverses: true)) {
                    pulsing = true
                }
            }
    }
}

/// Subscription row with orbit decoration — combines data display with the orbit ring.
struct SubscriptionCard: View {

    let name: String
    let amount: String
    let period: String
    var nextCharge: String? = nil
    var isActive: Bool = true
    var confidence: Double? = nil

    var body: some View {
        SpaceCard(glowing: isActive) {
            HStack(spacing: 14) {
                // Orbit icon
                ZStack {
                    OrbitIndicator(
                        color: isActive ? .signalPrimary : .signalDim,
                        size: 44,
                        duration: Double.random(in: 6...12)
                    )

                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(isActive ? Color.signalPrimary : Color.textMuted)
                }
                .frame(width: 44, height: 44)

                // Info
                VStack(alignment: .leading, spacing: 4) {
                    Text(name)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(Color.textPrimary)

                    Text(period)
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.textSecondary.opacity(0.6))
                }

                Spacer()

                // Right side: amount + badge
                VStack(alignment: .trailing, spacing: 6) {
                    Text(amount)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.textPrimary)

                    if isActive {
                        StatusBadge(text: "На орбите", variant: .active)
                    } else {
                        StatusBadge(text: "Неактив", variant: .dim)
                    }
                }
            }

            // Next charge row
            if let nextCharge {
                HStack {
                    Spacer()
                    Text("Следующее списание: \(nextCharge)")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.textMuted.opacity(0.5))
                }
                .padding(.top, 8)
            }
        }
    }
}
