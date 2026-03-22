import SwiftUI

struct DashboardView: View {

    var auth: AuthViewModel
    @Binding var selectedTab: AppTab
    @State private var vm = DashboardViewModel()
    @State private var notifVM = NotificationsViewModel()
    @State private var showBankConnectedBanner = false

    var body: some View {
        NavigationStack {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    DashboardHeaderView(
                        onLogout: { auth.logout() },
                        auth: auth,
                        unreadCount: notifVM.unreadCount
                    )

                    if showBankConnectedBanner {
                        BankConnectedBanner(onDismiss: { showBankConnectedBanner = false })
                    }

                    if let result = vm.syncResult {
                        SyncResultBanner(result: result, onDismiss: { vm.syncResult = nil })
                    }

                    GlowButton(title: "Подключить спутник", icon: "antenna.radiowaves.left.and.right") {
                        selectedTab = .connect
                    }

                    if vm.bankConnections.isEmpty && !vm.isLoading {
                        DashboardEmptyState(onConnect: { selectedTab = .connect })
                    } else {
                        BankConnectionsSection(
                            connections: vm.bankConnections,
                            isSyncing: vm.isSyncing,
                            onSync: { Task { await vm.syncBank() } }
                        )
                    }

                    if let error = vm.error {
                        ErrorBannerView(message: error)
                    }
                }
                .padding(SpaceMetrics.screenPadding)
                .padding(.bottom, 20)
            }
            .refreshable { await vm.loadDashboard() }

            if vm.isLoading && vm.bankConnections.isEmpty {
                LoadingOverlayView(text: "Сканирование орбиты...")
            }
        }
        .onAppear {
            vm.onUnauthorized = { auth.handleUnauthorized() }
            notifVM.onUnauthorized = { auth.handleUnauthorized() }
        }
        .task { await vm.loadDashboard() }
        .task { await notifVM.loadUnreadCount() }
        .toolbar(.hidden, for: .navigationBar)
        }
    }
}

// MARK: - Extracted Subviews

private struct DashboardHeaderView: View {
    let onLogout: () -> Void
    var auth: AuthViewModel
    var unreadCount: Int

    var body: some View {
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

            NavigationLink(destination: NotificationsView(auth: auth)) {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell.fill")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(unreadCount > 0 ? Color.signalPrimary : Color.textMuted)
                        .padding(10)
                        .background(Color.signalPrimary.opacity(0.06))
                        .clipShape(Circle())

                    if unreadCount > 0 {
                        Text("\(unreadCount)")
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 4)
                            .padding(.vertical, 1)
                            .background(Color.signalDanger)
                            .clipShape(Capsule())
                            .offset(x: 4, y: -2)
                    }
                }
            }

            Button(action: onLogout) {
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
}

private struct BankConnectedBanner: View {
    let onDismiss: () -> Void

    var body: some View {
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

                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.textMuted.opacity(0.5))
                }
            }
        }
    }
}

private struct SyncResultBanner: View {
    let result: String
    let onDismiss: () -> Void

    private var isError: Bool { result.contains("Ошибка") }

    var body: some View {
        SpaceCard(accentColor: isError ? .signalDanger : .signalSecondary) {
            HStack(spacing: 10) {
                Text(result)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(isError ? Color.signalDanger : Color.signalSecondary)

                Spacer()

                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color.textMuted.opacity(0.5))
                }
            }
        }
    }
}

private struct DashboardEmptyState: View {
    let onConnect: () -> Void

    var body: some View {
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

                GlowButton(title: "Подключить Flex Bank", icon: "antenna.radiowaves.left.and.right", action: onConnect)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        }
    }
}

private struct BankConnectionsSection: View {
    let connections: [BankConnection]
    let isSyncing: Bool
    let onSync: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Банковские связи", icon: "link")

            ForEach(connections) { conn in
                BankConnectionCard(connection: conn, isSyncing: isSyncing, onSync: onSync)
            }
        }
    }
}

private struct BankConnectionCard: View {
    let connection: BankConnection
    let isSyncing: Bool
    let onSync: () -> Void

    var body: some View {
        SpaceCard(glowing: connection.status == .connected) {
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(connection.provider.rawValue)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)

                        StatusBadge(
                            text: Self.statusLabel(connection.status),
                            variant: Self.statusVariant(connection.status)
                        )
                    }

                    Spacer()
                }

                VStack(spacing: 4) {
                    if let syncedAt = connection.lastSyncAt {
                        DashboardMetaRow(label: "Последняя синхронизация", value: DateFormatting.formatDate(syncedAt))
                    }
                    DashboardMetaRow(label: "Подключён", value: DateFormatting.formatDate(connection.createdAt))
                }

                GhostButton(
                    title: isSyncing ? "Синхронизация..." : "Синхронизировать",
                    icon: "arrow.triangle.2.circlepath",
                    action: onSync
                )
                .disabled(isSyncing)
            }
        }
    }

    private static func statusLabel(_ status: BankConnectionStatus) -> String {
        switch status {
        case .connected: "На орбите"
        case .expired: "Сигнал потерян"
        case .error: "Авария"
        case .disconnected: "Отключён"
        }
    }

    private static func statusVariant(_ status: BankConnectionStatus) -> BadgeVariant {
        switch status {
        case .connected: .active
        case .expired: .warn
        case .error: .danger
        case .disconnected: .dim
        }
    }
}

private struct DashboardMetaRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color.textMuted.opacity(0.6))
                .lineLimit(1)
            Spacer()
            Text(value)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundStyle(Color.textSecondary)
                .lineLimit(1)
        }
    }
}

private struct ErrorBannerView: View {
    let message: String

    var body: some View {
        SpaceCard(accentColor: .signalDanger) {
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(Color.signalDanger)

                Text(message)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.signalDanger.opacity(0.8))
                    .lineLimit(3)
            }
        }
    }
}

private struct LoadingOverlayView: View {
    let text: String

    var body: some View {
        VStack(spacing: 16) {
            OrbitIndicator(size: 60, duration: 3)

            Text(text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.textSecondary)
        }
    }
}
