import SwiftUI

struct NotificationsView: View {

    var auth: AuthViewModel
    @State private var vm = NotificationsViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    NotifHeaderView(
                        unreadCount: vm.unreadCount,
                        onMarkAllRead: { Task { await vm.markAllAsRead() } }
                    )

                    if vm.notifications.isEmpty && !vm.isLoading {
                        NotifEmptyState()
                    } else {
                        ForEach(vm.notifications) { notif in
                            NotifCardView(notification: notif) {
                                Task { await vm.markAsRead(notif.id) }
                            }
                        }
                    }

                    if let error = vm.error {
                        SpaceCard(accentColor: .signalDanger) {
                            Text(error)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.signalDanger.opacity(0.8))
                        }
                    }

                    // Settings
                    if vm.settings != nil {
                        NotifSettingsSection(vm: vm)
                    }
                }
                .padding(SpaceMetrics.screenPadding)
                .padding(.bottom, 20)
            }
            .refreshable { await vm.load() }

            if vm.isLoading && vm.notifications.isEmpty {
                VStack(spacing: 16) {
                    OrbitIndicator(size: 60, duration: 3)
                    Text("Поиск сигналов...")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .onAppear { vm.onUnauthorized = { auth.handleUnauthorized() } }
        .task { await vm.load() }
        .task { await vm.loadSettings() }
    }
}

// MARK: - Extracted Subviews

private struct NotifHeaderView: View {
    let unreadCount: Int
    let onMarkAllRead: () -> Void

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Уведомления")
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.signalPrimary, Color.signalSecondary],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )

                if unreadCount > 0 {
                    Text("\(unreadCount) непрочитанных")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.signalPrimary)
                } else {
                    Text("Все прочитано")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                }
            }

            Spacer()

            if unreadCount > 0 {
                Button(action: onMarkAllRead) {
                    Text("Прочитать все")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color.signalPrimary)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.signalPrimary.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.top, 8)
    }
}

private struct NotifCardView: View {
    let notification: AppNotification
    let onTap: () -> Void

    var body: some View {
        Button(action: {
            if !notification.isRead { onTap() }
        }) {
            SpaceCard(glowing: !notification.isRead, accentColor: accentColor) {
                HStack(alignment: .top, spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(accentColor.opacity(0.15))
                            .frame(width: 36, height: 36)

                        Image(systemName: iconName)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(accentColor)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(notification.title)
                                .font(.system(size: 14, weight: notification.isRead ? .medium : .semibold))
                                .foregroundStyle(Color.textPrimary)
                                .lineLimit(2)

                            Spacer()

                            if !notification.isRead {
                                Circle()
                                    .fill(Color.signalPrimary)
                                    .frame(width: 8, height: 8)
                                    .shadow(color: Color.signalPrimary.opacity(0.6), radius: 4)
                            }
                        }

                        Text(displayMessage)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundStyle(Color.textSecondary)
                            .lineLimit(3)

                        Text(relativeDate)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }
                }
            }
        }
        .buttonStyle(.plain)
    }

    private var iconName: String {
        switch notification.type {
        case .BILLING_REMINDER: "bell.fill"
        case .PRICE_CHANGE: "exclamationmark.triangle.fill"
        case .NEW_TRANSACTION: "sparkles"
        case .SYSTEM: "gearshape.fill"
        }
    }

    private var accentColor: Color {
        switch notification.type {
        case .BILLING_REMINDER: .signalPrimary
        case .PRICE_CHANGE: .signalWarn
        case .NEW_TRANSACTION: .signalSecondary
        case .SYSTEM: .textSecondary
        }
    }

    private var displayMessage: String {
        let msg = notification.message
        // Scheduler stores "merchant|amount|currency" — parse it for display
        let parts = msg.split(separator: "|")
        if parts.count == 3 {
            let amount = parts[1]
            let currency = parts[2]
            return "Ожидается списание \(amount) \(currency)"
        }
        return msg
    }

    private var relativeDate: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = formatter.date(from: notification.createdAt) else {
            // Try without fractional seconds
            formatter.formatOptions = [.withInternetDateTime]
            guard let date = formatter.date(from: notification.createdAt) else {
                return notification.createdAt
            }
            return RelativeDateTimeFormatter.shared.localizedString(for: date, relativeTo: Date())
        }
        return RelativeDateTimeFormatter.shared.localizedString(for: date, relativeTo: Date())
    }
}

private extension RelativeDateTimeFormatter {
    static let shared: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.locale = Locale(identifier: "ru_RU")
        f.unitsStyle = .short
        return f
    }()
}

private struct NotifSettingsSection: View {
    @Bindable var vm: NotificationsViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Настройки", icon: "gearshape")

            SpaceCard {
                VStack(spacing: 16) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Email-уведомления")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.textPrimary)
                            Text("Отправлять на почту при новых списаниях")
                                .font(.system(size: 11, weight: .regular))
                                .foregroundStyle(Color.textMuted)
                        }
                        Spacer()
                        Toggle("", isOn: Binding(
                            get: { vm.settings?.emailNotifications ?? true },
                            set: { newValue in
                                vm.settings?.emailNotifications = newValue
                                Task { await vm.updateSettings() }
                            }
                        ))
                        .tint(Color.signalPrimary)
                        .labelsHidden()
                    }

                    Divider().overlay(Color.textMuted.opacity(0.1))

                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Напоминать за")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(Color.textPrimary)
                            Text("Дней до списания")
                                .font(.system(size: 11, weight: .regular))
                                .foregroundStyle(Color.textMuted)
                        }
                        Spacer()
                        Stepper(
                            "\(vm.settings?.daysBefore ?? 3) дн",
                            value: Binding(
                                get: { vm.settings?.daysBefore ?? 3 },
                                set: { newValue in
                                    vm.settings?.daysBefore = newValue
                                    Task { await vm.updateSettings() }
                                }
                            ),
                            in: 1...7
                        )
                        .font(.system(size: 13, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.textPrimary)
                    }
                }
            }
        }
    }
}

private struct NotifEmptyState: View {
    var body: some View {
        SpaceCard {
            VStack(spacing: 16) {
                Image(systemName: "bell.slash")
                    .font(.system(size: 40, weight: .light))
                    .foregroundStyle(Color.textMuted.opacity(0.4))

                Text("Нет уведомлений")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.textSecondary.opacity(0.7))

                Text("Когда появятся списания по подпискам, вы увидите уведомления здесь")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 24)
        }
    }
}
