import SwiftUI

struct SubscriptionsView: View {

    var auth: AuthViewModel
    @State private var vm = SubscriptionsViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    // Header
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

                    // Summary metrics
                    if let s = vm.summary {
                        summarySection(s)
                    }

                    // Upcoming charges
                    if !vm.upcoming.isEmpty {
                        upcomingSection
                    }

                    // Active subscriptions
                    if vm.active.isEmpty && !vm.isLoading {
                        emptyState
                    } else if !vm.active.isEmpty {
                        activeSection
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

    // MARK: - Summary

    private func summarySection(_ s: SubscriptionSummary) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

            LazyVGrid(columns: grid, spacing: 12) {
                MetricCard(
                    icon: "antenna.radiowaves.left.and.right",
                    label: "Активных спутников",
                    value: "\(s.activeCount)"
                )

                MetricCard(
                    icon: "rublesign.circle",
                    label: "В месяц",
                    value: "\(Int(s.monthlyTotal)) ₽",
                    accentColor: .signalSecondary
                )

                MetricCard(
                    icon: "rublesign.circle.fill",
                    label: "В год",
                    value: "\(Int(s.yearlyTotal)) ₽",
                    accentColor: Color(red: 0.65, green: 0.55, blue: 0.98)
                )

                MetricCard(
                    icon: "exclamationmark.triangle",
                    label: "Скоро списание",
                    value: "\(s.upcomingNext7Days.count)",
                    accentColor: .signalWarn
                )
            }
        }
    }

    // MARK: - Upcoming

    private var upcomingSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Ближайшие списания", icon: "clock.fill") {
                StatusBadge(text: "Скоро", variant: .warn)
            }

            ForEach(vm.upcoming) { sub in
                let days = daysUntil(sub.nextExpectedCharge)

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

                        Text("\(Int(sub.amount)) ₽")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)
                    }
                }
            }
        }
    }

    // MARK: - Active

    private var activeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Все активные подписки", icon: "dot.radiowaves.left.and.right") {
                Text("\(vm.active.count)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.signalPrimary)
            }

            ForEach(vm.active) { sub in
                detectedSubscriptionCard(sub)
            }
        }
    }

    // MARK: - Subscription Card

    private func detectedSubscriptionCard(_ sub: DetectedSubscription) -> some View {
        let days = daysUntil(sub.nextExpectedCharge)
        let isUpcoming = days >= 0 && days <= 7
        let lowConfidence = sub.confidence < 0.65

        return SpaceCard(glowing: sub.isActive) {
            VStack(alignment: .leading, spacing: 12) {
                // Header row
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(sub.merchant)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.textPrimary)

                        Text(sub.periodType.russianName)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(Int(sub.amount)) ₽")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(Color.textPrimary)

                        Text(sub.periodType.shortLabel)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }
                }

                // Badges
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

                // Meta grid
                Divider()
                    .overlay(Color.signalPrimary.opacity(0.05))

                VStack(spacing: 6) {
                    metaRow("Последнее списание", value: DateFormatting.formatDate(sub.lastChargeDate))

                    metaRow(
                        "Следующее",
                        value: DateFormatting.formatDate(sub.nextExpectedCharge),
                        extra: days >= 0 ? (days == 0 ? "сегодня" : "через \(days) дн.") : nil,
                        warn: days >= 0 && days <= 3
                    )

                    metaRow("Транзакций", value: "\(sub.transactionCount)")

                    metaRow(
                        "Сила сигнала",
                        value: "\(Int(sub.confidence * 100))%",
                        warn: lowConfidence
                    )
                }
            }
        }
    }

    private func metaRow(_ label: String, value: String, extra: String? = nil, warn: Bool = false) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Color.textMuted.opacity(0.6))

            Spacer()

            HStack(spacing: 4) {
                Text(value)
                    .font(.system(size: 11, weight: .medium, design: .monospaced))
                    .foregroundStyle(warn ? Color.signalWarn : Color.textSecondary)

                if let extra {
                    Text("(\(extra))")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.textMuted.opacity(0.4))
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
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

    // MARK: - Helpers

    private func daysUntil(_ iso: String) -> Int {
        guard let date = DateFormatting.parseISO(iso) else { return -1 }
        let diff = date.timeIntervalSince(Date())
        return Int(ceil(diff / 86400))
    }
}
