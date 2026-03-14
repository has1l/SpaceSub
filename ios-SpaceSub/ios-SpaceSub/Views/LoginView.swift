import SwiftUI

struct LoginView: View {

    var auth: AuthViewModel

    @State private var showOrbit = false

    var body: some View {
        ZStack {
            SpaceBackground()

            VStack(spacing: 32) {
                Spacer()

                // Orbit ring animation
                ZStack {
                    ForEach(0..<3, id: \.self) { i in
                        Circle()
                            .strokeBorder(Color.signalPrimary.opacity(0.06 + Double(i) * 0.02), lineWidth: 1)
                            .frame(width: CGFloat(100 + i * 50), height: CGFloat(100 + i * 50))
                            .scaleEffect(showOrbit ? 1.0 : 0.8)
                            .opacity(showOrbit ? 1.0 : 0.0)
                            .animation(
                                .spring(duration: 1.2).delay(Double(i) * 0.15),
                                value: showOrbit
                            )
                    }

                    Image(systemName: "satellite.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(Color.signalPrimary)
                        .shadow(color: Color.signalPrimary.opacity(0.4), radius: 20)
                }

                VStack(spacing: 8) {
                    Text("SpaceSub")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [Color.signalPrimary, Color.signalSecondary],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )

                    Text("Центр управления подписками")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                }

                Spacer()

                VStack(spacing: 16) {
                    if let error = auth.error {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(Color.signalDanger)
                                .font(.system(size: 12))
                            Text(error)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.signalDanger.opacity(0.8))
                        }
                        .padding(12)
                        .glassCard()
                    }

                    GlowButton(
                        title: "Войти через Яндекс",
                        icon: "person.crop.circle",
                        isLoading: auth.isLoading
                    ) {
                        Task { await auth.login() }
                    }
                }
                .padding(.horizontal, 32)

                Spacer()
                    .frame(height: 60)
            }
        }
        .onAppear { showOrbit = true }
    }
}
