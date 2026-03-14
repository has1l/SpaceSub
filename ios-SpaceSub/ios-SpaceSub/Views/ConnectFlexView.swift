import SwiftUI

struct ConnectFlexView: View {

    var auth: AuthViewModel
    @Binding var selectedTab: AppTab
    @State private var vm = ConnectFlexViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Подключить Flex Bank")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.signalPrimary, Color.signalSecondary],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )

                        Text("Свяжите банковский спутник со SpaceSub одним из двух способов")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.textSecondary)
                    }
                    .padding(.top, 8)

                    // Error
                    if let error = vm.error {
                        SpaceCard(accentColor: .signalDanger) {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(Color.signalDanger)
                                    .frame(width: 6, height: 6)
                                    .shadow(color: Color.signalDanger.opacity(0.5), radius: 3)

                                Text(error)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Color.signalDanger.opacity(0.8))
                            }
                        }
                    }

                    // Success
                    if vm.success {
                        SpaceCard(accentColor: .signalPrimary, showTopAccent: true) {
                            HStack(spacing: 10) {
                                Circle()
                                    .fill(Color.signalPrimary)
                                    .frame(width: 6, height: 6)
                                    .shadow(color: Color.signalPrimary.opacity(0.5), radius: 3)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Flex Bank успешно подключён!")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundStyle(Color.signalPrimary)

                                    Button("Перейти к панели управления") {
                                        selectedTab = .dashboard
                                    }
                                    .font(.system(size: 11, weight: .medium))
                                    .foregroundStyle(Color.signalPrimary.opacity(0.7))
                                }
                            }
                        }
                    }

                    // Method 1: Connection Code
                    codeSection

                    // Divider
                    HStack(spacing: 12) {
                        Rectangle()
                            .fill(Color.signalPrimary.opacity(0.06))
                            .frame(height: 1)

                        Text("ИЛИ")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .tracking(2)
                            .foregroundStyle(Color.textMuted.opacity(0.3))

                        Rectangle()
                            .fill(Color.signalPrimary.opacity(0.06))
                            .frame(height: 1)
                    }

                    // Method 2: OAuth
                    oauthSection
                }
                .padding(SpaceMetrics.screenPadding)
                .padding(.bottom, 20)
            }
        }
        .onAppear { vm.onUnauthorized = { auth.handleUnauthorized() } }
    }

    // MARK: - Code Section

    private var codeSection: some View {
        SpaceCard(glowing: true) {
            VStack(alignment: .leading, spacing: 12) {
                Text("СПОСОБ 01")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.signalPrimary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.signalPrimary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                Text("Код подключения")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)

                Text("Сгенерируйте код в Flex Bank и введите его здесь. Код действует 5 минут.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textMuted)

                HStack(spacing: 12) {
                    TextField("FB-XXXXXX", text: $vm.code)
                        .font(.system(size: 18, weight: .bold, design: .monospaced))
                        .tracking(3)
                        .multilineTextAlignment(.center)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                        .background(Color.spaceDeep)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(Color.signalPrimary.opacity(0.12), lineWidth: 1)
                        )
                        .foregroundStyle(Color.textPrimary)

                    GlowButton(title: vm.isCodeLoading ? "..." : "Подключить") {
                        Task { await vm.connectByCode() }
                    }
                    .disabled(vm.isCodeLoading || !vm.isCodeValid)
                    .opacity(vm.isCodeValid ? 1 : 0.5)
                }
            }
        }
    }

    // MARK: - OAuth Section

    private var oauthSection: some View {
        SpaceCard {
            VStack(spacing: 12) {
                Text("СПОСОБ 02")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.signalSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.signalSecondary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                Text("Через Яндекс")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)

                Text("Авторизуйтесь через Яндекс для автоматического подключения")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .multilineTextAlignment(.center)

                Button {
                    Task {
                        if let url = await vm.getOAuthURL(),
                           let oauthURL = URL(string: url) {
                            await UIApplication.shared.open(oauthURL)
                        }
                    }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "arrow.up.right.square")
                            .font(.system(size: 14, weight: .medium))

                        Text(vm.isOAuthLoading ? "Перенаправление..." : "Подключить через Яндекс")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(
                            colors: [Color.signalSecondary, Color(red: 0.01, green: 0.52, blue: 0.78)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: Color.signalSecondary.opacity(0.2), radius: 10, y: 4)
                }
                .disabled(vm.isOAuthLoading)
                .buttonStyle(.plain)
            }
        }
    }
}
