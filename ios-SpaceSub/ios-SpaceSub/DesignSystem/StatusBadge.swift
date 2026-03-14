import SwiftUI

enum BadgeVariant {
    case active
    case warn
    case danger
    case dim

    var color: Color {
        switch self {
        case .active: .signalPrimary
        case .warn: .signalWarn
        case .danger: .signalDanger
        case .dim: Color(hex: 0xC8D6E5)
        }
    }
}

/// Status badge matching the web `.badge-*` components.
struct StatusBadge: View {

    let text: String
    var variant: BadgeVariant = .active
    var showDot: Bool = true

    var body: some View {
        HStack(spacing: 5) {
            if showDot {
                Circle()
                    .fill(variant.color)
                    .frame(width: 5, height: 5)
                    .shadow(color: variant.color.opacity(0.6), radius: 3)
            }

            Text(text.uppercased())
                .font(.system(size: 9, weight: .bold, design: .monospaced))
                .tracking(0.5)
                .foregroundStyle(variant.color)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(variant.color.opacity(0.1))
        .clipShape(Capsule())
        .overlay(
            Capsule().strokeBorder(variant.color.opacity(0.15), lineWidth: 0.5)
        )
    }
}
