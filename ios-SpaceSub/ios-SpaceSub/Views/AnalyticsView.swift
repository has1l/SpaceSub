import SwiftUI
import Charts

struct AnalyticsView: View {

    var auth: AuthViewModel
    @State private var vm = AnalyticsViewModel()
    @Namespace private var chartAnimation

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: SpaceMetrics.sectionSpacing) {

                    headerSection
                    periodPicker

                    if vm.overview != nil {
                        heroCard
                        donutChartSection
                        areaChartSection
                        barChartSection
                        recommendationsSection
                        scoresSection
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

            if vm.isLoading && vm.overview == nil {
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

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Аналитика")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(SpaceGradient.signalText)

            Text("Телеметрия расходов")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.textSecondary)
        }
        .padding(.top, 8)
    }

    // MARK: - Period Picker

    private var periodPicker: some View {
        HStack(spacing: 0) {
            ForEach(PeriodPreset.allCases, id: \.self) { preset in
                Button {
                    Task { await vm.changePeriod(preset) }
                } label: {
                    Text(preset.rawValue)
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(vm.selectedPeriod == preset ? Color.spaceVoid : Color.textSecondary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background {
                            if vm.selectedPeriod == preset {
                                Capsule()
                                    .fill(Color.signalPrimary)
                            }
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(3)
        .background(Color.spaceHull.opacity(0.5))
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(Color.signalPrimary.opacity(0.1), lineWidth: 1))
        .animation(.spring(duration: 0.3), value: vm.selectedPeriod)
    }

    // MARK: - Hero Card

    private var heroCard: some View {
        Group {
            if let overview = vm.overview {
                SpaceCard(glowing: true) {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Потрачено за период")
                            .font(.system(size: 11, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(Color.textSecondary.opacity(0.6))

                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            Text("\(Int(overview.periodTotal)) \u{20BD}")
                                .font(.system(size: 36, weight: .bold, design: .rounded))
                                .foregroundStyle(Color.textPrimary)

                            Spacer()

                            trendBadge(overview.trend.changePct)
                        }

                        // Mini metrics
                        let grid = [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)]
                        LazyVGrid(columns: grid, spacing: 8) {
                            miniMetric(label: "Подписок", value: "\(overview.activeCount)", icon: "antenna.radiowaves.left.and.right")
                            miniMetric(label: "MRR", value: "\(Int(overview.mrr)) \u{20BD}", icon: "arrow.clockwise")
                            miniMetric(label: "ARR", value: "\(Int(overview.arr)) \u{20BD}", icon: "calendar")
                            miniMetric(label: "Скоро", value: "\(overview.upcomingCount)", icon: "exclamationmark.triangle")
                        }
                    }
                }
                .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.3), value: vm.overview?.periodTotal)
    }

    private func trendBadge(_ changePct: Double) -> some View {
        let isUp = changePct >= 0
        return HStack(spacing: 3) {
            Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
                .font(.system(size: 10, weight: .bold))
            Text(String(format: "%.1f%%", abs(changePct)))
                .font(.system(size: 11, weight: .bold, design: .monospaced))
        }
        .foregroundStyle(isUp ? Color.signalDanger : Color.signalPrimary)
        .padding(.horizontal, 8)
        .padding(.vertical, 5)
        .background((isUp ? Color.signalDanger : Color.signalPrimary).opacity(0.12))
        .clipShape(Capsule())
    }

    private func miniMetric(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(Color.signalPrimary.opacity(0.5))

            VStack(alignment: .leading, spacing: 1) {
                Text(label.uppercased())
                    .font(.system(size: 8, weight: .semibold))
                    .tracking(0.3)
                    .foregroundStyle(Color.textMuted)
                Text(value)
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundStyle(Color.textPrimary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(Color.spaceHull.opacity(0.3))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Donut Chart

    private var donutChartSection: some View {
        Group {
            if !vm.categories.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Категории", icon: "chart.pie.fill")

                    SpaceCard {
                        VStack(spacing: 16) {
                            if #available(iOS 17.0, *) {
                                Chart(vm.categories) { item in
                                    SectorMark(
                                        angle: .value("Total", item.total),
                                        innerRadius: .ratio(0.6),
                                        angularInset: 1.5
                                    )
                                    .foregroundStyle(Color(hexString: item.color))
                                    .cornerRadius(4)
                                }
                                .chartBackground { proxy in
                                    GeometryReader { geo in
                                        let frame = geo[proxy.plotFrame!]
                                        VStack(spacing: 2) {
                                            Text("\(vm.categories.count)")
                                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                                .foregroundStyle(Color.textPrimary)
                                            Text("категорий")
                                                .font(.system(size: 10, weight: .medium))
                                                .foregroundStyle(Color.textMuted)
                                        }
                                        .position(x: frame.midX, y: frame.midY)
                                    }
                                }
                                .frame(height: 200)
                            }

                            categoryLegend
                        }
                    }
                }
            } else if vm.isLoading || vm.isChartLoading {
                shimmerCard(height: 280)
            }
        }
    }

    private var categoryLegend: some View {
        VStack(spacing: 8) {
            ForEach(vm.categories) { item in
                HStack(spacing: 10) {
                    Circle()
                        .fill(Color(hexString: item.color))
                        .frame(width: 8, height: 8)

                    Text(item.category)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.textPrimary)

                    Spacer()

                    Text(String(format: "%.0f%%", item.percent))
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color.textSecondary)

                    Text("\(Int(item.total)) \u{20BD}")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color.textPrimary)
                        .frame(width: 70, alignment: .trailing)
                }

                // Progress bar
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.spaceHull.opacity(0.5))
                            .frame(height: 3)

                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color(hexString: item.color))
                            .frame(width: geo.size.width * item.percent / 100, height: 3)
                    }
                }
                .frame(height: 3)
            }
        }
    }

    // MARK: - Area Chart

    private var areaChartSection: some View {
        Group {
            if !vm.periods.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Динамика расходов", icon: "chart.xyaxis.line")

                    SpaceCard {
                        if #available(iOS 17.0, *) {
                            Chart(vm.periods) { item in
                                AreaMark(
                                    x: .value("Период", item.period),
                                    y: .value("Сумма", item.total)
                                )
                                .foregroundStyle(
                                    LinearGradient(
                                        colors: [Color.signalPrimary.opacity(0.3), Color.signalPrimary.opacity(0.02)],
                                        startPoint: .top,
                                        endPoint: .bottom
                                    )
                                )
                                .interpolationMethod(.catmullRom)

                                LineMark(
                                    x: .value("Период", item.period),
                                    y: .value("Сумма", item.total)
                                )
                                .foregroundStyle(Color.signalPrimary)
                                .lineStyle(StrokeStyle(lineWidth: 2))
                                .interpolationMethod(.catmullRom)

                                PointMark(
                                    x: .value("Период", item.period),
                                    y: .value("Сумма", item.total)
                                )
                                .foregroundStyle(Color.signalPrimary)
                                .symbolSize(20)
                            }
                            .chartXAxis {
                                AxisMarks(values: .automatic) { _ in
                                    AxisValueLabel()
                                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)
                                }
                            }
                            .chartYAxis {
                                AxisMarks(position: .leading, values: .automatic) { _ in
                                    AxisValueLabel()
                                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)
                                    AxisGridLine()
                                        .foregroundStyle(Color.signalPrimary.opacity(0.06))
                                }
                            }
                            .frame(height: 180)
                        }
                    }
                }
            } else if vm.isLoading || vm.isChartLoading {
                shimmerCard(height: 220)
            }
        }
    }

    // MARK: - Bar Chart

    private var barChartSection: some View {
        Group {
            if !vm.services.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Топ сервисов", icon: "chart.bar.fill")

                    SpaceCard {
                        if #available(iOS 17.0, *) {
                            Chart(vm.services) { item in
                                BarMark(
                                    x: .value("Сумма", item.monthlyAmount),
                                    y: .value("Сервис", item.merchant)
                                )
                                .foregroundStyle(Color(hexString: item.color))
                                .cornerRadius(4)
                                .annotation(position: .trailing, spacing: 4) {
                                    Text("\(Int(item.monthlyAmount)) \u{20BD}")
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundStyle(Color.textSecondary)
                                }
                            }
                            .chartXAxis(.hidden)
                            .chartYAxis {
                                AxisMarks(values: .automatic) { _ in
                                    AxisValueLabel()
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundStyle(Color.textPrimary)
                                }
                            }
                            .frame(height: CGFloat(vm.services.count) * 36 + 20)
                        }
                    }
                }
            } else if vm.isLoading || vm.isChartLoading {
                shimmerCard(height: 200)
            }
        }
    }

    // MARK: - Recommendations

    private var recommendationsSection: some View {
        Group {
            if !vm.recommendations.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Рекомендации", icon: "lightbulb.fill") {
                        StatusBadge(text: "\(vm.recommendations.count)", variant: .warn, showDot: false)
                    }

                    ForEach(vm.recommendations) { rec in
                        SpaceCard(accentColor: recoColor(rec.type)) {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(spacing: 8) {
                                    Image(systemName: recoIcon(rec.type))
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(recoColor(rec.type))

                                    Text(rec.merchant)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Color.textPrimary)

                                    Spacer()

                                    StatusBadge(
                                        text: recoLabel(rec.type),
                                        variant: recoBadge(rec.type),
                                        showDot: false
                                    )
                                }

                                Text(rec.reason)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Color.textSecondary)

                                HStack {
                                    Text("Текущая стоимость: \(Int(rec.currentCost)) \u{20BD}/мес")
                                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)

                                    Spacer()

                                    Text("Экономия: \(Int(rec.potentialSavings)) \u{20BD}")
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundStyle(Color.signalPrimary)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func recoColor(_ type: RecoType) -> Color {
        switch type {
        case .CANCEL: .signalDanger
        case .REVIEW: .signalWarn
        case .DOWNGRADE: .signalPrimary
        case .CONSOLIDATE: .orange
        }
    }

    private func recoIcon(_ type: RecoType) -> String {
        switch type {
        case .CANCEL: "xmark.circle.fill"
        case .REVIEW: "eye.fill"
        case .DOWNGRADE: "arrow.down.circle.fill"
        case .CONSOLIDATE: "arrow.triangle.merge"
        }
    }

    private func recoLabel(_ type: RecoType) -> String {
        switch type {
        case .CANCEL: "Отмена"
        case .REVIEW: "Проверка"
        case .DOWNGRADE: "Понижение"
        case .CONSOLIDATE: "Объединение"
        }
    }

    private func recoBadge(_ type: RecoType) -> BadgeVariant {
        switch type {
        case .CANCEL: .danger
        case .REVIEW: .warn
        case .DOWNGRADE: .active
        case .CONSOLIDATE: .warn
        }
    }

    // MARK: - Scores

    private var scoresSection: some View {
        Group {
            if !vm.scores.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    SectionHeader("Здоровье подписок", icon: "heart.text.square.fill")

                    ForEach(vm.scores) { score in
                        SpaceCard {
                            VStack(alignment: .leading, spacing: 10) {
                                HStack(spacing: 8) {
                                    Text(score.merchant)
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundStyle(Color.textPrimary)

                                    Spacer()

                                    StatusBadge(
                                        text: score.label,
                                        variant: scoreBadge(score.churnRisk)
                                    )
                                }

                                HStack(spacing: 8) {
                                    Text("\(score.valueScore)")
                                        .font(.system(size: 18, weight: .bold, design: .rounded))
                                        .foregroundStyle(scoreColor(score.valueScore))

                                    GeometryReader { geo in
                                        ZStack(alignment: .leading) {
                                            RoundedRectangle(cornerRadius: 3)
                                                .fill(Color.spaceHull.opacity(0.5))
                                                .frame(height: 6)

                                            RoundedRectangle(cornerRadius: 3)
                                                .fill(scoreColor(score.valueScore))
                                                .frame(width: geo.size.width * CGFloat(score.valueScore) / 100, height: 6)
                                        }
                                    }
                                    .frame(height: 6)

                                    Text("\(Int(score.monthlyAmount)) \u{20BD}/мес")
                                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                                        .foregroundStyle(Color.textMuted)
                                }

                                HStack(spacing: 4) {
                                    Text("Риск оттока:")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(Color.textMuted)

                                    Text(churnRiskLabel(score.churnRisk))
                                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                                        .foregroundStyle(churnColor(score.churnRisk))
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func scoreColor(_ score: Int) -> Color {
        if score >= 75 { return .signalPrimary }
        if score >= 50 { return .signalSecondary }
        if score >= 25 { return .signalWarn }
        return .signalDanger
    }

    private func scoreBadge(_ risk: ChurnRisk) -> BadgeVariant {
        switch risk {
        case .LOW: .active
        case .MEDIUM: .warn
        case .HIGH: .danger
        }
    }

    private func churnColor(_ risk: ChurnRisk) -> Color {
        switch risk {
        case .LOW: .signalPrimary
        case .MEDIUM: .signalWarn
        case .HIGH: .signalDanger
        }
    }

    private func churnRiskLabel(_ risk: ChurnRisk) -> String {
        switch risk {
        case .LOW: "НИЗКИЙ"
        case .MEDIUM: "СРЕДНИЙ"
        case .HIGH: "ВЫСОКИЙ"
        }
    }

    // MARK: - Shimmer Loading

    private func shimmerCard(height: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius)
            .fill(Color.spaceHull.opacity(0.2))
            .frame(height: height)
            .overlay(
                RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius)
                    .fill(
                        LinearGradient(
                            colors: [.clear, Color.signalPrimary.opacity(0.04), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .shimmerAnimation()
            )
            .clipShape(RoundedRectangle(cornerRadius: SpaceMetrics.cardRadius))
    }
}

// MARK: - Shimmer Modifier

private struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .offset(x: phase * 300)
            .onAppear {
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

private extension View {
    func shimmerAnimation() -> some View {
        modifier(ShimmerModifier())
    }
}
