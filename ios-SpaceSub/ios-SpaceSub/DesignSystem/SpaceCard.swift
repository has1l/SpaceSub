import SwiftUI

/// A glass-morphism card matching the web `.station-panel` component.
struct SpaceCard<Content: View>: View {

    var glowing: Bool = false
    var accentColor: Color = .signalPrimary
    var showTopAccent: Bool = false
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if showTopAccent {
                Rectangle()
                    .fill(
                        LinearGradient(
                            colors: [.clear, accentColor.opacity(0.3), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(height: 1)
            }

            content()
                .padding(SpaceMetrics.cardPadding)
        }
        .glassCard(glowing: glowing)
    }
}
