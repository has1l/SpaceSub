import SwiftUI

// MARK: - Color Palette

extension Color {
    // Deep space backgrounds
    static let spaceVoid = Color(hex: 0x020810)
    static let spaceDeep = Color(hex: 0x06101E)
    static let spaceNebula = Color(hex: 0x0C1A2E)
    static let spaceHull = Color(hex: 0x132440)

    // Signal colors
    static let signalPrimary = Color(hex: 0x00D4AA)
    static let signalSecondary = Color(hex: 0x0EA5E9)
    static let signalWarn = Color(hex: 0xF59E0B)
    static let signalDanger = Color(hex: 0xEF4444)
    static let signalDim = Color(hex: 0x1E3A5F)

    // Text
    static let textPrimary = Color(hex: 0xE6F1FF)
    static let textSecondary = Color(hex: 0x7F9BB3)
    static let textMuted = Color(hex: 0x4A6580)

    // Glass
    static let glassBg = Color(hex: 0x06101E).opacity(0.7)
    static let glassBorder = Color.signalPrimary.opacity(0.08)
    static let glassBorderHover = Color.signalPrimary.opacity(0.18)

    // Glow
    static let glowTeal = Color.signalPrimary.opacity(0.4)
    static let glowBlue = Color.signalSecondary.opacity(0.3)
}

// MARK: - Hex Color Init

extension Color {
    init(hex: UInt, alpha: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: alpha
        )
    }
}

// MARK: - Gradients

enum SpaceGradient {
    static let signalButton = LinearGradient(
        colors: [Color(hex: 0x00D4AA), Color(hex: 0x00B893)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let signalText = LinearGradient(
        colors: [Color.signalPrimary, Color.signalSecondary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let cosmicBg = LinearGradient(
        colors: [Color.spaceVoid, Color.spaceDeep, Color(hex: 0x040E1A)],
        startPoint: .top,
        endPoint: .bottom
    )
}

// MARK: - Spacing & Radius

enum SpaceMetrics {
    static let cardRadius: CGFloat = 16
    static let cardPadding: CGFloat = 16
    static let cardSpacing: CGFloat = 12
    static let screenPadding: CGFloat = 16
    static let sectionSpacing: CGFloat = 24
}

// MARK: - View Modifiers

struct GlassCardModifier: ViewModifier {
    var glowing: Bool = false

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius)
                    .fill(Color.spaceDeep.opacity(0.7))
                    .background(
                        RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius)
                            .fill(.ultraThinMaterial.opacity(0.3))
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius)
                    .strokeBorder(Color.signalPrimary.opacity(glowing ? 0.18 : 0.08), lineWidth: 1)
            )
            .shadow(color: Color.signalPrimary.opacity(glowing ? 0.08 : 0.03), radius: glowing ? 20 : 10, x: 0, y: 0)
            .clipShape(RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius))
    }
}

extension View {
    func glassCard(glowing: Bool = false) -> some View {
        modifier(GlassCardModifier(glowing: glowing))
    }
}

// MARK: - Hex String Color Init

extension Color {
    init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet(charactersIn: "#"))
        var rgbValue: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgbValue)
        self.init(hex: UInt(rgbValue))
    }
}
