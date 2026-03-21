import SwiftUI

struct ForecastView: View {

    var auth: AuthViewModel
    @State private var vm = ForecastViewModel()

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    ForecastHeaderView()

                    if let f = vm.forecast {
                        ForecastTotalsSection(forecast: f)
                        ForecastTimelineSection(timeline: f.upcomingTimeline)
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

            if vm.isLoading && vm.forecast == nil {
                VStack(spacing: 16) {
                    OrbitIndicator(size: 60, duration: 3)
                    Text("Расчёт траектории...")
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

private struct ForecastHeaderView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Прогноз")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.signalPrimary, Color.signalSecondary],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )

            Text("Траектория расходов")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.textSecondary)
        }
        .padding(.top, 8)
    }
}

private struct ForecastTotalsSection: View {
    let forecast: ForecastResponse

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Прогноз расходов", icon: "chart.line.uptrend.xyaxis")

            let grid = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

            LazyVGrid(columns: grid, spacing: 12) {
                MetricCard(
                    icon: "7.circle",
                    label: "7 дней",
                    value: "\(Int(forecast.next7DaysTotal)) ₽"
                )

                MetricCard(
                    icon: "30.circle",
                    label: "30 дней",
                    value: "\(Int(forecast.next30DaysTotal)) ₽",
                    accentColor: .signalSecondary
                )
            }

            MetricCard(
                icon: "12.circle",
                label: "12 месяцев",
                value: "\(Int(forecast.next12MonthsTotal)) ₽",
                accentColor: .signalWarn
            )
        }
    }
}

private struct ForecastTimelineSection: View {
    let timeline: [TimelineEntry]

    var body: some View {
        if !timeline.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                SectionHeader("Хронология миссий", icon: "calendar.badge.clock") {
                    Text("\(timeline.count)")
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color.signalSecondary)
                }

                ForEach(Array(timeline.enumerated()), id: \.element.id) { index, entry in
                    TimelineItemView(
                        entry: entry,
                        isFirst: index == 0,
                        isLast: index == timeline.count - 1
                    )
                }
            }
        }
    }
}

private struct TimelineItemView: View {
    let entry: TimelineEntry
    let isFirst: Bool
    let isLast: Bool

    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 0) {
                if !isFirst {
                    Rectangle()
                        .fill(Color.signalPrimary.opacity(0.1))
                        .frame(width: 1)
                }

                Circle()
                    .fill(Color.signalPrimary.opacity(0.3))
                    .frame(width: 8, height: 8)
                    .overlay(
                        Circle()
                            .fill(Color.signalPrimary)
                            .frame(width: 4, height: 4)
                    )
                    .shadow(color: Color.signalPrimary.opacity(0.3), radius: 4)

                if !isLast {
                    Rectangle()
                        .fill(Color.signalPrimary.opacity(0.1))
                        .frame(width: 1)
                }
            }
            .frame(width: 20)

            SpaceCard {
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(entry.merchant)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)

                        HStack(spacing: 6) {
                            Text(DateFormatting.formatDate(entry.chargeDate))
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                .foregroundStyle(Color.textMuted)

                            Text("•")
                                .foregroundStyle(Color.textMuted.opacity(0.3))

                            Text(entry.periodType.displayName)
                                .font(.system(size: 10, weight: .medium, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                        }
                    }

                    Spacer()

                    Text("\(Int(entry.amount)) ₽")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundStyle(Color.textPrimary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            .padding(.leading, 8)
        }
    }
}
