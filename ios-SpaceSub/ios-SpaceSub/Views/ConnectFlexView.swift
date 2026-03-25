import SwiftUI

struct ConnectFlexView: View {

    var auth: AuthViewModel
    @Binding var selectedTab: AppTab
    @State private var vm = ConnectFlexViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

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

                        Text("Свяжите банковский спутник со SpaceSub через код подключения")
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

}
