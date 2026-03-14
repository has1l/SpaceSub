import SwiftUI

/// Primary teal gradient button matching `.btn-signal` from the web.
struct GlowButton: View {

    let title: String
    var icon: String? = nil
    var isLoading: Bool = false
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                } else if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                }

                Text(title)
                    .font(.system(size: 14, weight: .semibold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(SpaceGradient.signalButton)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: Color.signalPrimary.opacity(0.25), radius: 16, x: 0, y: 4)
        }
        .disabled(isLoading)
        .buttonStyle(.plain)
    }
}

/// Ghost-style outline button matching `.btn-ghost` from the web.
struct GhostButton: View {

    let title: String
    var icon: String? = nil
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon {
                    Image(systemName: icon)
                        .font(.system(size: 13, weight: .medium))
                }

                Text(title)
                    .font(.system(size: 13, weight: .medium))
            }
            .foregroundStyle(Color.signalPrimary)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.signalPrimary.opacity(0.06))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(Color.signalPrimary.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
