import SwiftUI

struct AnalyticsView: View {

    var auth: AuthViewModel
    @State private var vm = AnalyticsViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    // Header
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Аналитика")
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.signalPrimary, Color.signalSecondary],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )

                        Text("Телеметрия расходов")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.textSecondary)
                    }
                    .padding(.top, 8)

                    // Totals
                    if let a = vm.analytics {
                        totalsSection(a)
                        topSubscriptionsSection(a)
                        upcomingChargesSection(a)
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

            if vm.isLoading && vm.analytics == nil {
                VStack(spacing: 16) {
                    OrbitIndicator(size: 60, duration: 3)
                    Text("Обработка телеметрии...")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .onAppear { vm.onUnauthorized = { auth.handleUnauthorized() } }
        .task { await vm.load() }
    }

    // MARK: - Totals

    private func totalsSection(_ a: AnalyticsResponse) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Итоги", icon: "chart.pie.fill")

            let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

            LazyVGrid(columns: grid, spacing: 12) {
                MetricCard(
                    icon: "rublesign.circle",
                    label: "В месяц",
                    value: "\(Int(a.monthlyTotal)) ₽"
                )

                MetricCard(
                    icon: "rublesign.circle.fill",
                    label: "В год",
                    value: "\(Int(a.yearlyTotal)) ₽",
                    accentColor: .signalSecondary
                )
            }

            MetricCard(
                icon: "antenna.radiowaves.left.and.right",
                label: "Активные спутники",
                value: "\(a.activeSubscriptions)"
            )
        }
    }

    // MARK: - Top Subscriptions

    private func topSubscriptionsSection(_ a: AnalyticsResponse) -> some View {
        Group {
            if !a.topSubscriptions.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Топ спутники", icon: "star.fill")

                    ForEach(Array(a.topSubscriptions.enumerated()), id: \.element.id) { index, top in
                        SpaceCard {
                            HStack(spacing: 12) {
                                // Rank
                                Text("#\(index + 1)")
                                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                                    .foregroundStyle(Color.signalPrimary.opacity(0.5))
                                    .frame(width: 28)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(top.merchant)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Color.textPrimary)

                                    Text(top.periodType.displayName)
                                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)
                                }

                                Spacer()

                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("\(Int(top.monthlyEquivalent)) ₽")
                                        .font(.system(size: 15, weight: .bold, design: .rounded))
                                        .foregroundStyle(Color.textPrimary)

                                    Text("/ мес")
                                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Upcoming Charges

    private func upcomingChargesSection(_ a: AnalyticsResponse) -> some View {
        Group {
            if !a.upcomingCharges.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Скоро списание", icon: "exclamationmark.triangle") {
                        StatusBadge(text: "Скоро", variant: .warn)
                    }

                    ForEach(a.upcomingCharges) { charge in
                        SpaceCard(accentColor: .signalWarn) {
                            HStack(spacing: 12) {
                                Circle()
                                    .fill(Color.signalWarn)
                                    .frame(width: 6, height: 6)
                                    .shadow(color: Color.signalWarn.opacity(0.5), radius: 3)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(charge.merchant)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Color.textPrimary)

                                    Text(DateFormatting.formatDate(charge.nextExpectedCharge))
                                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)
                                }

                                Spacer()

                                Text("\(Int(charge.amount)) ₽")
                                    .font(.system(size: 15, weight: .bold, design: .rounded))
                                    .foregroundStyle(Color.signalWarn)
                            }
                        }
                    }
                }
            }
        }
    }
}
