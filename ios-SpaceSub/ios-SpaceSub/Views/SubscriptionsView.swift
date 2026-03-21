import SwiftUI

struct SubscriptionsView: View {

    var auth: AuthViewModel
    @State private var vm = SubscriptionsViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    SubsHeaderView()

                    if let s = vm.summary {
                        SubsSummarySection(summary: s)
                    }

                    if !vm.upcoming.isEmpty {
                        SubsUpcomingSection(upcoming: vm.upcoming)
                    }

                    if vm.active.isEmpty && !vm.isLoading {
                        SubsEmptyState()
                    } else if !vm.active.isEmpty {
                        SubsActiveSection(active: vm.active)
                    }

                    if let error = vm.error {
                        SpaceCard(accentColor: .signalDanger) {
                            Text(error)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.signalDanger.opacity(0.8))
                        }
                    }
                }
                .padding(SpaceMetrics.screenPadding)
                .padding(.bottom, 20)
            }
            .refreshable { await vm.load() }

            if vm.isLoading && vm.summary == nil {
                VStack(spacing: 16) {
                    OrbitIndicator(size: 60, duration: 3)
                    Text("Поиск спутников...")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .onAppear { vm.onUnauthorized = { auth.handleUnauthorized() } }
        .task { await vm.load() }
    }
}

// MARK: - Extracted Subviews

private struct SubsHeaderView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Обнаруженные подписки")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.signalPrimary, Color.signalSecondary],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text("Автоматически обнаруженные повторяющиеся платежи")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.textSecondary)
        }
        .padding(.top, 8)
    }
}

private struct SubsSummarySection: View {
    let summary: SubscriptionSummary

    var body: some View {
        let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

        LazyVGrid(columns: grid, spacing: 12) {
            MetricCard(
                icon: "antenna.radiowaves.left.and.right",
                label: "Активных спутников",
                value: "\(summary.activeCount)"
            )

            MetricCard(
                icon: "exclamationmark.triangle",
                label: "Скоро списание",
                value: "\(summary.upcomingNext7Days.count)",
                accentColor: .signalWarn
            )
        }
    }
}

private struct SubsUpcomingSection: View {
    let upcoming: [DetectedSubscription]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Ближайшие списания", icon: "clock.fill") {
                StatusBadge(text: "Скоро", variant: .warn)
            }

            ForEach(upcoming) { sub in
                UpcomingSubCard(sub: sub)
            }
        }
    }
}

private struct UpcomingSubCard: View {
    let sub: DetectedSubscription

    private var days: Int {
        guard let date = DateFormatting.parseISO(sub.nextExpectedCharge) else { return -1 }
        return Int(ceil(date.timeIntervalSince(Date()) / 86400))
    }

    var body: some View {
        SpaceCard(accentColor: .signalWarn) {
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.signalWarn)
                    .frame(width: 6, height: 6)
                    .shadow(color: Color.signalWarn.opacity(0.5), radius: 3)

                Text(sub.merchant)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.textPrimary)
                    .lineLimit(1)

                Spacer()

                Text(days == 0 ? "Сегодня" : "Через \(days) дн.")
                    .font(.system(size: 10, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.signalWarn)
                    .lineLimit(1)

                Text("\(Int(sub.amount)) ₽")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
                    .lineLimit(1)
            }
        }
    }
}

private struct SubsActiveSection: View {
    let active: [DetectedSubscription]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Все активные подписки", icon: "dot.radiowaves.left.and.right") {
                Text("\(active.count)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.signalPrimary)
            }

            ForEach(active) { sub in
                DetectedSubscriptionCard(sub: sub)
            }
        }
    }
}

private struct DetectedSubscriptionCard: View {
    let sub: DetectedSubscription

    private var days: Int {
        guard let date = DateFormatting.parseISO(sub.nextExpectedCharge) else { return -1 }
        return Int(ceil(date.timeIntervalSince(Date()) / 86400))
    }
    private var isUpcoming: Bool { days >= 0 && days <= 7 }
    private var lowConfidence: Bool { sub.confidence < 0.65 }

    var body: some View {
        SpaceCard(glowing: sub.isActive) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(sub.merchant)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)

                        Text(sub.periodType.russianName)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(Int(sub.amount)) ₽")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)

                        Text(sub.periodType.shortLabel)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }
                }

                HStack(spacing: 6) {
                    if sub.isActive {
                        StatusBadge(text: "На орбите", variant: .active)
                    } else {
                        StatusBadge(text: "Сошла с орбиты", variant: .dim)
                    }

                    if isUpcoming {
                        StatusBadge(text: "Скоро списание", variant: .warn)
                    }

                    if lowConfidence {
                        StatusBadge(text: "Слабый сигнал", variant: .danger)
                    }
                }

                Divider()
                    .overlay(Color.signalPrimary.opacity(0.05))

                VStack(spacing: 6) {
                    SubsMetaRow(label: "Последнее списание", value: DateFormatting.formatDate(sub.lastChargeDate))

                    SubsMetaRow(
                        label: "Следующее",
                        value: DateFormatting.formatDate(sub.nextExpectedCharge),
                        extra: days >= 0 ? (days == 0 ? "сегодня" : "через \(days) дн.") : nil,
                        warn: days >= 0 && days <= 3
                    )

                    SubsMetaRow(label: "Транзакций", value: "\(sub.transactionCount)")

                    SubsMetaRow(
                        label: "Сила сигнала",
                        value: "\(Int(sub.confidence * 100))%",
                        warn: lowConfidence
                    )
                }
            }
        }
    }
}

private struct SubsMetaRow: View {
    let label: String
    let value: String
    var extra: String? = nil
    var warn: Bool = false

    var body: some View {
        HStack {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.textMuted.opacity(0.6))
                .lineLimit(1)

            Spacer()

            HStack(spacing: 4) {
                Text(value)
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(warn ? Color.signalWarn : Color.textSecondary)
                    .lineLimit(1)

                if let extra {
                    Text("(\(extra))")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.textMuted.opacity(0.4))
                        .lineLimit(1)
                }
            }
        }
    }
}

private struct SubsEmptyState: View {
    var body: some View {
        SpaceCard(glowing: true) {
            VStack(spacing: 16) {
                OrbitIndicator(size: 80, duration: 8)
                    .opacity(0.3)

                Text("Подписки ещё не обнаружены")
                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                    .foregroundStyle(Color.textSecondary.opacity(0.7))

                Text("Синхронизируйте банк и подождите — система автоматически обнаружит повторяющиеся платежи")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
        }
    }
}
