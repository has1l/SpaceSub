import SwiftUI

struct DashboardView: View {

    var auth: AuthViewModel
    @Binding var selectedTab: AppTab
    @State private var vm = DashboardViewModel()
    @State private var showBankConnectedBanner = false

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    // Header
                    header

                    // Bank connected banner
                    if showBankConnectedBanner {
                        bankConnectedBanner
                    }

                    // Sync result banner
                    if let result = vm.syncResult {
                        syncResultBanner(result)
                    }

                    // Primary action
                    GlowButton(title: "Подключить спутник", icon: "antenna.radiowaves.left.and.right") {
                        selectedTab = .connect
                    }

                    if vm.bankConnections.isEmpty && !vm.isLoading {
                        emptyState
                    } else {
                        bankSection
                    }

                    // Error
                    if let error = vm.error {
                        errorBanner(error)
                    }
                }
                .padding(SpaceMetrics.screenPadding)
                .padding(.bottom, 20)
            }
            .refreshable { await vm.loadDashboard() }

            if vm.isLoading && vm.bankConnections.isEmpty {
                loadingOverlay
            }
        }
        .onAppear { vm.onUnauthorized = { auth.handleUnauthorized() } }
        .task { await vm.loadDashboard() }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("SpaceSub")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .tracking(2)
                    .foregroundStyle(Color.signalPrimary.opacity(0.5))

                Text("Центр управления")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.signalPrimary, Color.signalSecondary],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )

                Text("Управляйте банковскими спутниками и синхронизацией")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Color.textSecondary)
            }

            Spacer()

            Button { auth.logout() } label: {
                Image(systemName: "rectangle.portrait.and.arrow.right")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .padding(10)
                    .background(Color.signalPrimary.opacity(0.06))
                    .clipShape(Circle())
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Banners

    private var bankConnectedBanner: some View {
        SpaceCard(accentColor: .signalPrimary, showTopAccent: true) {
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.signalPrimary)
                    .frame(width: 6, height: 6)
                    .shadow(color: Color.signalPrimary.opacity(0.5), radius: 3)

                Text("Flex Bank успешно подключён! Синхронизируйте транзакции для обнаружения подписок.")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.signalPrimary)

                Spacer()

                Button {
                    showBankConnectedBanner = false
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.textMuted.opacity(0.5))
                }
            }
        }
    }

    private func syncResultBanner(_ result: String) -> some View {
        let isError = result.contains("Ошибка")
        return SpaceCard(accentColor: isError ? .signalDanger : .signalSecondary) {
            HStack(spacing: 10) {
                Text(result)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(isError ? Color.signalDanger : Color.signalSecondary)

                Spacer()

                Button {
                    vm.syncResult = nil
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.textMuted.opacity(0.5))
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        SpaceCard(glowing: true) {
            VStack(spacing: 16) {
                OrbitIndicator(size: 80, duration: 8)
                    .opacity(0.4)

                Text("Нет подключённых спутников")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.textSecondary.opacity(0.7))

                Text("Подключите банк, чтобы начать мониторинг подписок")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .multilineTextAlignment(.center)

                GlowButton(title: "Подключить Flex Bank", icon: "antenna.radiowaves.left.and.right") {
                    selectedTab = .connect
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        }
    }

    // MARK: - Bank

    private var bankSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Банковские связи", icon: "link")

            ForEach(vm.bankConnections) { conn in
                SpaceCard(glowing: conn.status == .connected) {
                    VStack(spacing: 12) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(conn.provider.rawValue)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Color.textPrimary)

                                StatusBadge(
                                    text: statusLabel(conn.status),
                                    variant: statusVariant(conn.status)
                                )
                            }

                            Spacer()
                        }

                        // Meta
                        VStack(spacing: 4) {
                            if let syncedAt = conn.lastSyncAt {
                                metaRow("Последняя синхронизация", value: DateFormatting.formatDate(syncedAt))
                            }

                            metaRow("Подключён", value: DateFormatting.formatDate(conn.createdAt))
                        }

                        // Sync button
                        GhostButton(
                            title: vm.isSyncing ? "Синхронизация..." : "Синхронизировать",
                            icon: "arrow.triangle.2.circlepath"
                        ) {
                            Task { await vm.syncBank() }
                        }
                        .disabled(vm.isSyncing)
                    }
                }
            }
        }
    }

    // MARK: - Helpers

    private func metaRow(_ label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color.textMuted.opacity(0.6))
            Spacer()
            Text(value)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.textSecondary)
        }
    }

    private func statusLabel(_ status: BankConnectionStatus) -> String {
        switch status {
        case .connected: "На орбите"
        case .expired: "Сигнал потерян"
        case .error: "Авария"
        case .disconnected: "Отключён"
        }
    }

    private func statusVariant(_ status: BankConnectionStatus) -> BadgeVariant {
        switch status {
        case .connected: .active
        case .expired: .warn
        case .error: .danger
        case .disconnected: .dim
        }
    }

    // MARK: - Error & Loading

    private func errorBanner(_ message: String) -> some View {
        SpaceCard(accentColor: .signalDanger) {
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color.signalDanger)

                Text(message)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.signalDanger.opacity(0.8))
            }
        }
    }

    private var loadingOverlay: some View {
        VStack(spacing: 16) {
            OrbitIndicator(size: 60, duration: 3)

            Text("Сканирование орбиты...")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.textSecondary)
        }
    }
}
