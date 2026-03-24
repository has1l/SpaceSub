import SwiftUI
import Charts

struct AnalyticsView: View {

    var auth: AuthViewModel
    @State private var vm = AnalyticsViewModel()
    @State private var appeared = false

    var body: some View {
        ZStack {
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 14) {

                    AnalyticsHeaderView(appeared: appeared)
                    AnalyticsPeriodPicker(vm: vm, appeared: appeared)

                    if vm.overview != nil {
                        AnalyticsHeroCard(vm: vm, appeared: appeared)
                        AnalyticsBudgetRadar(vm: vm, appeared: appeared)
                        AnalyticsDonutSection(vm: vm, appeared: appeared)
                        AnalyticsAreaChartSection(vm: vm, appeared: appeared)
                        AnalyticsBarChartSection(vm: vm, appeared: appeared)
                        AnalyticsRecommendationsSection(vm: vm, appeared: appeared)
                        AnalyticsScoresSection(vm: vm, appeared: appeared)
                    }

                    if let error = vm.error {
                        HudPanel(accent: .signalDanger) {
                            Text(error)
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(Color.signalDanger.opacity(0.8))
                                .padding(16)
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
        .task {
            await vm.load()
            withAnimation(.spring(duration: 0.5)) { appeared = true }
        }
    }
}

// MARK: - Header

private struct AnalyticsHeaderView: View {
    let appeared: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 10) {
                Image(systemName: "scope")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(Color.signalPrimary.opacity(0.7))
                Text("Аналитика")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(SpaceGradient.signalText)
            }
            Text("ТЕЛЕМЕТРИЯ РАСХОДОВ · ДИАГНОСТИКА · РЕКОМЕНДАЦИИ")
                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                .tracking(1)
                .foregroundStyle(Color.textMuted)
        }
        .padding(.top, 8)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.spring(duration: 0.5), value: appeared)
    }
}

// MARK: - Period Picker

private struct AnalyticsPeriodPicker: View {
    @Bindable var vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
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
                                    .shadow(color: Color.signalPrimary.opacity(0.35), radius: 8)
                            }
                        }
                }
                .buttonStyle(.plain)
                .sensoryFeedback(.selection, trigger: vm.selectedPeriod)
            }
        }
        .padding(3)
        .background(Color.signalPrimary.opacity(0.04))
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(Color.signalPrimary.opacity(0.1), lineWidth: 1))
        .animation(.spring(duration: 0.3), value: vm.selectedPeriod)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 16)
        .animation(.spring(duration: 0.5).delay(0.05), value: appeared)
    }
}

// MARK: - Hero Card

private struct AnalyticsHeroCard: View {
    let vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        HudPanel(accent: .signalPrimary, glowing: true, scanLine: true) {
            ZStack {
                ParticleField(count: 6)

                VStack(alignment: .leading, spacing: 12) {
                    Text("ПОТРАЧЕНО ЗА ПЕРИОД")
                        .font(.system(size: 9, weight: .semibold, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Color.textMuted)

                    if let overview = vm.overview {
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            AnimatedNumber(
                                value: overview.periodTotal,
                                prefix: "₽",
                                font: .system(size: 26, weight: .heavy, design: .monospaced)
                            )
                            .foregroundStyle(Color.textPrimary)

                            Spacer()

                            if overview.trend.changePct != 0 {
                                VStack(alignment: .trailing, spacing: 3) {
                                    TrendBadge(changePct: overview.trend.changePct)
                                    TrendSparkline(
                                        data: vm.periodTotals,
                                        color: overview.trend.changePct >= 0 ? .signalDanger : .signalPrimary,
                                        width: 56,
                                        height: 18
                                    )
                                }
                            }
                        }

                        HStack(spacing: 0) {
                            MiniStat(label: "ПОДПИСОК", value: Double(overview.activeCount), color: .signalPrimary, icon: "antenna.radiowaves.left.and.right", appeared: appeared, delay: 0.3)
                            Spacer()
                            MiniStat(label: "В МЕСЯЦ", value: overview.mrr, color: .signalSecondary, icon: "arrow.clockwise", prefix: "₽", appeared: appeared, delay: 0.42)
                            Spacer()
                            MiniStat(label: "В ГОД", value: overview.arr, color: Color(hex: 0xA78BFA), icon: "calendar", prefix: "₽", appeared: appeared, delay: 0.54)
                            Spacer()
                            MiniStat(label: "СКОРО", value: Double(overview.upcomingCount), color: .signalWarn, icon: "exclamationmark.triangle", appeared: appeared, delay: 0.66)
                        }
                    }
                }
                .padding(16)
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.1), value: appeared)
    }
}

private struct TrendBadge: View {
    let changePct: Double

    var body: some View {
        let isUp = changePct >= 0
        HStack(spacing: 3) {
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
}

private struct MiniStat: View {
    let label: String
    let value: Double
    let color: Color
    let icon: String
    var prefix: String = ""
    let appeared: Bool
    var delay: Double = 0

    var body: some View {
        VStack(spacing: 3) {
            AnimatedNumber(
                value: value,
                prefix: prefix,
                font: .system(size: 13, weight: .heavy, design: .monospaced)
            )
            .foregroundStyle(color)
            .shadow(color: color.opacity(0.3), radius: 4)

            HStack(spacing: 2) {
                Image(systemName: icon)
                    .font(.system(size: 7, weight: .medium))
                Text(label)
                    .font(.system(size: 7, weight: .semibold, design: .monospaced))
                    .tracking(0.3)
            }
            .foregroundStyle(Color.textMuted.opacity(0.5))
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 10)
        .animation(.spring(duration: 0.5, bounce: 0.2).delay(delay), value: appeared)
    }
}

// MARK: - Budget Radar

private struct AnalyticsBudgetRadar: View {
    let vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        let healthColor: Color = vm.budgetHealthScore > 70 ? .signalPrimary : vm.budgetHealthScore > 40 ? .signalWarn : .signalDanger

        HStack(spacing: 8) {
            RadarCard(label: "Здоровье бюджета", value: vm.budgetHealthScore, suffix: "/100", color: healthColor, icon: "shield.checkered", gauge: vm.budgetHealthScore)
            RadarCard(label: "Оптимизация", value: vm.optimizationPotential, suffix: "%", color: .signalSecondary, icon: "target", gauge: vm.optimizationPotential)
            RadarCard(label: "Плотность", value: vm.subscriptionDensity, suffix: "/кат", color: Color(hex: 0xA78BFA), icon: "circle.hexagongrid", gauge: min(100, vm.subscriptionDensity * 20), decimals: 1)
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.spring(duration: 0.5).delay(0.15), value: appeared)
    }
}

private struct RadarCard: View {
    let label: String
    let value: Double
    let suffix: String
    let color: Color
    let icon: String
    let gauge: Double
    var decimals: Int = 0

    var body: some View {
        HudPanel(accent: color) {
            VStack(spacing: 6) {
                CircularGauge(value: gauge, color: color, size: 34, lineWidth: 2.5)
                    .overlay {
                        Image(systemName: icon)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(color.opacity(0.7))
                    }

                AnimatedNumber(
                    value: value,
                    suffix: suffix,
                    font: .system(size: 12, weight: .heavy, design: .monospaced),
                    decimals: decimals
                )
                .foregroundStyle(color)
                .shadow(color: color.opacity(0.3), radius: 3)

                Text(label)
                    .font(.system(size: 7, weight: .semibold, design: .monospaced))
                    .tracking(0.3)
                    .textCase(.uppercase)
                    .foregroundStyle(Color.textMuted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 6)
            .padding(.vertical, 10)
        }
    }
}

// MARK: - Donut + Accordion

private struct AnalyticsDonutSection: View {
    @Bindable var vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        VStack(spacing: 14) {
            // Donut
            HudPanel(accent: .signalSecondary) {
                VStack(alignment: .leading, spacing: 10) {
                    sectionLabel("Категории", icon: "circle.hexagongrid.fill")

                    Text("НАЖМИТЕ НА СЕКТОР ДЛЯ ДЕТАЛИЗАЦИИ")
                        .font(.system(size: 8, weight: .semibold, design: .monospaced))
                        .tracking(0.8)
                        .foregroundStyle(Color.textMuted.opacity(0.4))

                    if vm.isChartLoading {
                        shimmerRect(height: 260)
                    } else if !vm.categories.isEmpty {
                        DonutChartView(vm: vm)
                    }
                }
                .padding(18)
            }

            // Expansion panel
            if let cat = vm.selectedCategory,
               let item = vm.categories.first(where: { $0.category == cat }) {
                DonutExpansionPanel(vm: vm, category: cat, item: item, appeared: appeared)
                    .transition(.asymmetric(
                        insertion: .move(edge: .top).combined(with: .opacity).combined(with: .scale(scale: 0.97, anchor: .top)),
                        removal: .opacity.combined(with: .scale(scale: 0.98, anchor: .top))
                    ))
            }

            // Accordion
            HudPanel(accent: Color(hex: 0xA78BFA)) {
                VStack(alignment: .leading, spacing: 10) {
                    sectionLabel("Распределение", icon: "chart.bar.xaxis.ascending")

                    if vm.isChartLoading {
                        VStack(spacing: 12) {
                            ForEach(0..<4, id: \.self) { _ in shimmerRect(height: 32) }
                        }
                    } else {
                        CategoryAccordionView(vm: vm)
                    }
                }
                .padding(18)
            }
        }
        .animation(.spring(duration: 0.35, bounce: 0.15), value: vm.selectedCategory)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.2), value: appeared)
    }
}

// MARK: - Donut Chart

private struct DonutChartView: View {
    @Bindable var vm: AnalyticsViewModel

    var body: some View {
        ZStack {
            Circle()
                .stroke(style: StrokeStyle(lineWidth: 0.5, dash: [3, 8]))
                .foregroundStyle(Color.signalPrimary.opacity(0.06))
                .frame(width: 240, height: 240)

            Chart(vm.categories) { item in
                SectorMark(
                    angle: .value("Total", item.total),
                    innerRadius: .ratio(0.6),
                    angularInset: 2
                )
                .foregroundStyle(Color(hexString: item.color))
                .cornerRadius(4)
                .opacity(sectorOpacity(for: item.category))
            }
            .chartBackground { proxy in
                GeometryReader { geo in
                    if let frame = proxy.plotFrame {
                        let f = geo[frame]
                        donutCenter
                            .position(x: f.midX, y: f.midY)
                    }
                }
            }
            .chartOverlay { _ in
                GeometryReader { geo in
                    Color.clear
                        .contentShape(Rectangle())
                        .onTapGesture { loc in
                            handleDonutTap(location: loc, in: geo.size)
                        }
                }
            }
            .frame(height: 240)
            .drawingGroup()
            .sensoryFeedback(.selection, trigger: vm.selectedCategory)
        }
        .frame(height: 260)
    }

    private func sectorOpacity(for category: String) -> Double {
        if vm.selectedCategory == nil { return 1.0 }
        return vm.selectedCategory == category ? 1.0 : 0.2
    }

    private var donutCenter: some View {
        Group {
            if let cat = vm.selectedCategory,
               let item = vm.categories.first(where: { $0.category == cat }) {
                VStack(spacing: 4) {
                    Text(String(format: "%.0f%%", item.percent))
                        .font(.system(size: 22, weight: .heavy, design: .monospaced))
                        .foregroundStyle(Color(hexString: item.color))
                        .shadow(color: Color(hexString: item.color).opacity(0.5), radius: 8)
                    Text(item.category)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(1)
                }
                .transition(.scale.combined(with: .opacity))
            } else {
                let total = vm.categories.reduce(0) { $0 + $1.total }
                VStack(spacing: 4) {
                    AnimatedNumber(
                        value: total,
                        prefix: "₽",
                        font: .system(size: 17, weight: .heavy, design: .monospaced)
                    )
                    .foregroundStyle(Color.textPrimary)
                    Text("ВСЕГО/МЕС")
                        .font(.system(size: 9, weight: .semibold, design: .monospaced))
                        .tracking(1)
                        .foregroundStyle(Color.textMuted)
                }
                .transition(.scale.combined(with: .opacity))
            }
        }
        .animation(.spring(duration: 0.25), value: vm.selectedCategory)
    }

    private func handleDonutTap(location: CGPoint, in size: CGSize) {
        let center = CGPoint(x: size.width / 2, y: size.height / 2)
        let dx = location.x - center.x
        let dy = location.y - center.y
        let distance = sqrt(dx * dx + dy * dy)
        let outerR = min(size.width, size.height) / 2
        let innerR = outerR * 0.6

        guard distance > innerR && distance < outerR else {
            vm.selectedCategory = nil
            return
        }

        var angle = atan2(dy, dx) * 180 / .pi
        angle = (angle + 90).truncatingRemainder(dividingBy: 360)
        if angle < 0 { angle += 360 }

        let totalVal = vm.categories.reduce(0.0) { $0 + $1.total }
        guard totalVal > 0 else { return }

        var cumulative = 0.0
        for item in vm.categories {
            let sectorAngle = item.total / totalVal * 360
            if angle >= cumulative && angle < cumulative + sectorAngle {
                vm.selectedCategory = vm.selectedCategory == item.category ? nil : item.category
                return
            }
            cumulative += sectorAngle
        }
    }
}

// MARK: - Donut Expansion Panel

private struct DonutExpansionPanel: View {
    @Bindable var vm: AnalyticsViewModel
    let category: String
    let item: CategoryItem
    let appeared: Bool

    var body: some View {
        let catServices = vm.services(for: category)
        let catTotal = catServices.reduce(0.0) { $0 + $1.monthlyAmount }
        let itemColor = Color(hexString: item.color)

        HudPanel(accent: itemColor) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    CategoryIconView(category: category, size: 16, color: itemColor)
                    Text(category)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.textPrimary)
                    Text("\(catServices.count) подписок · ₽\(Int(catTotal))/мес")
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundStyle(Color.textMuted)
                    Spacer()
                    Button { vm.selectedCategory = nil } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.textMuted)
                    }
                }

                if catServices.isEmpty {
                    Text("Нет подписок в этой категории")
                        .font(.system(size: 12))
                        .foregroundStyle(Color.textMuted)
                } else {
                    ForEach(Array(catServices.enumerated()), id: \.element.merchant) { idx, svc in
                        let share = catTotal > 0 ? svc.monthlyAmount / catTotal : 0
                        VStack(spacing: 4) {
                            HStack {
                                Text(svc.merchant)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Color.textPrimary.opacity(0.7))
                                Spacer()
                                Text("₽\(Int(svc.monthlyAmount))/мес")
                                    .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                    .foregroundStyle(Color.textPrimary.opacity(0.8))
                            }
                            GeometryReader { geo in
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(
                                        LinearGradient(
                                            colors: [itemColor.opacity(0.6), itemColor],
                                            startPoint: .leading, endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geo.size.width * share, height: 3)
                            }
                            .frame(height: 3)
                            .background(Color.white.opacity(0.04))
                            .clipShape(RoundedRectangle(cornerRadius: 2))
                        }
                        .opacity(appeared ? 1 : 0)
                        .animation(.spring(duration: 0.35).delay(Double(idx) * 0.04), value: vm.selectedCategory)
                    }
                }
            }
            .padding(16)
        }
    }
}

// MARK: - Category Accordion

private struct CategoryAccordionView: View {
    @Bindable var vm: AnalyticsViewModel

    var body: some View {
        VStack(spacing: 6) {
            let maxTotal = vm.categories.first?.total ?? 1

            ForEach(Array(vm.categories.prefix(8).enumerated()), id: \.element.id) { _, item in
                let isOpen = vm.selectedCategory == item.category
                let catServices = vm.services(for: item.category)
                let itemColor = Color(hexString: item.color)

                VStack(spacing: 0) {
                    Button {
                        withAnimation(.spring(duration: 0.3)) {
                            vm.selectedCategory = isOpen ? nil : item.category
                        }
                    } label: {
                        VStack(spacing: 6) {
                            HStack(spacing: 8) {
                                NeonDot(color: itemColor, size: 7)
                                CategoryIconView(category: item.category, size: 12, color: itemColor)
                                Text(item.category)
                                    .font(.system(size: 13, weight: .medium))
                                    .foregroundStyle(Color.textPrimary.opacity(0.85))
                                Spacer()
                                Text(String(format: "%.0f%%", item.percent))
                                    .font(.system(size: 11, design: .monospaced))
                                    .foregroundStyle(Color.textMuted)
                                Text("₽\(Int(item.total))")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    .foregroundStyle(Color.textPrimary)
                                    .frame(minWidth: 60, alignment: .trailing)
                                Image(systemName: "chevron.right")
                                    .font(.system(size: 10, weight: .semibold))
                                    .foregroundStyle(Color.textMuted.opacity(0.4))
                                    .rotationEffect(.degrees(isOpen ? 90 : 0))
                            }

                            GeometryReader { geo in
                                ZStack(alignment: .leading) {
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(Color.white.opacity(0.04))
                                        .frame(height: 5)
                                    RoundedRectangle(cornerRadius: 3)
                                        .fill(
                                            LinearGradient(
                                                colors: [itemColor.opacity(0.8), itemColor],
                                                startPoint: .leading, endPoint: .trailing
                                            )
                                        )
                                        .frame(width: geo.size.width * (item.total / maxTotal), height: 5)
                                        .shadow(color: itemColor.opacity(0.4), radius: 6, y: 1)
                                }
                            }
                            .frame(height: 5)
                        }
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.plain)
                    .sensoryFeedback(.impact(weight: .light), trigger: vm.selectedCategory)

                    if isOpen && !catServices.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            Text("СКАНИРОВАНИЕ · \(catServices.count) ОБЪЕКТОВ")
                                .font(.system(size: 8, weight: .semibold, design: .monospaced))
                                .tracking(0.8)
                                .foregroundStyle(itemColor.opacity(0.4))
                                .padding(.top, 6)
                                .padding(.bottom, 6)

                            ForEach(Array(catServices.enumerated()), id: \.element.merchant) { si, svc in
                                HStack {
                                    Text(svc.merchant)
                                        .font(.system(size: 12, weight: .medium))
                                        .foregroundStyle(Color.textPrimary.opacity(0.6))
                                    Spacer()
                                    Text("₽\(Int(svc.monthlyAmount))")
                                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                                        .foregroundStyle(Color.textPrimary.opacity(0.7))
                                }
                                .padding(.vertical, 5)
                                .overlay(alignment: .bottom) {
                                    if si < catServices.count - 1 {
                                        Rectangle()
                                            .fill(itemColor.opacity(0.06))
                                            .frame(height: 0.5)
                                    }
                                }
                            }
                        }
                        .padding(.leading, 28)
                        .overlay(alignment: .leading) {
                            Rectangle()
                                .fill(
                                    LinearGradient(
                                        colors: [itemColor.opacity(0.5), itemColor.opacity(0)],
                                        startPoint: .top, endPoint: .bottom
                                    )
                                )
                                .frame(width: 2)
                                .padding(.leading, 16)
                        }
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }
            }
        }
    }
}

// MARK: - Area Chart

private struct AnalyticsAreaChartSection: View {
    let vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        Group {
            if !vm.periods.isEmpty && vm.periods.contains(where: { $0.total > 0 }) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        sectionLabel("Динамика расходов", icon: "chart.xyaxis.line")
                        Spacer()
                        HStack(spacing: 12) {
                            HStack(spacing: 4) {
                                RoundedRectangle(cornerRadius: 1)
                                    .fill(Color.signalPrimary)
                                    .frame(width: 14, height: 2)
                                Text("Расходы")
                                    .font(.system(size: 8, design: .monospaced))
                                    .foregroundStyle(Color.textMuted)
                            }
                            HStack(spacing: 4) {
                                RoundedRectangle(cornerRadius: 1)
                                    .fill(Color.signalSecondary.opacity(0.5))
                                    .frame(width: 14, height: 2)
                                Text("Среднее")
                                    .font(.system(size: 8, design: .monospaced))
                                    .foregroundStyle(Color.textMuted)
                            }
                        }
                    }

                    HudPanel(accent: .signalPrimary) {
                        AreaChartContent(periodsWithAvg: vm.periodsWithAvg)
                            .frame(height: 180)
                            .padding(12)
                    }
                }
            } else if vm.isLoading || vm.isChartLoading {
                shimmerRect(height: 240)
            } else {
                emptyChart(message: "Нет транзакций за этот период", sub: "Синхронизируйте банк для отображения данных")
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.25), value: appeared)
    }
}

private struct AreaChartContent: View {
    let periodsWithAvg: [PeriodItemWithAvg]

    var body: some View {
        let shortPeriods = periodsWithAvg.map { item in
            (item, shortLabel: Self.shortenPeriod(item.period))
        }

        Chart(periodsWithAvg) { item in
            AreaMark(
                x: .value("Период", Self.shortenPeriod(item.period)),
                y: .value("Сумма", item.total)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color.signalPrimary.opacity(0.25), Color.signalPrimary.opacity(0.05), .clear],
                    startPoint: .top, endPoint: .bottom
                )
            )
            .interpolationMethod(.catmullRom)

            LineMark(
                x: .value("Период", Self.shortenPeriod(item.period)),
                y: .value("Сумма", item.total)
            )
            .foregroundStyle(Color.signalPrimary)
            .lineStyle(StrokeStyle(lineWidth: 2, lineCap: .round, lineJoin: .round))
            .interpolationMethod(.catmullRom)

            LineMark(
                x: .value("Период", Self.shortenPeriod(item.period)),
                y: .value("Среднее", item.movingAvg)
            )
            .foregroundStyle(Color.signalSecondary.opacity(0.4))
            .lineStyle(StrokeStyle(lineWidth: 1, lineCap: .round, dash: [5, 3]))
            .interpolationMethod(.catmullRom)

            PointMark(
                x: .value("Период", Self.shortenPeriod(item.period)),
                y: .value("Сумма", item.total)
            )
            .foregroundStyle(Color.signalPrimary)
            .symbolSize(item.period == periodsWithAvg.last?.period ? 30 : 12)
        }
        .chartXAxis {
            AxisMarks(values: .automatic(desiredCount: 5)) { _ in
                AxisValueLabel()
                    .font(.system(size: 8, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.textMuted)
            }
        }
        .chartYAxis {
            AxisMarks(position: .leading, values: .automatic(desiredCount: 4)) { _ in
                AxisValueLabel()
                    .font(.system(size: 8, weight: .medium, design: .monospaced))
                    .foregroundStyle(Color.textMuted.opacity(0.5))
                AxisGridLine()
                    .foregroundStyle(Color.signalPrimary.opacity(0.04))
            }
        }
        .drawingGroup()
    }

    /// "2025-03" → "мар", "2025-W12" → "Н12", "2025-03-01" → "мар"
    private static func shortenPeriod(_ period: String) -> String {
        let months = ["янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек"]
        let parts = period.split(separator: "-")
        guard parts.count >= 2 else { return period }
        let secondPart = String(parts[1])
        // Week format: "2025-W12"
        if secondPart.hasPrefix("W"), let week = Int(secondPart.dropFirst()) {
            return "Н\(week)"
        }
        // Month/date format: "2025-03" or "2025-03-01"
        guard let m = Int(secondPart), m >= 1, m <= 12 else { return String(period.suffix(5)) }
        return months[m - 1]
    }
}

// MARK: - Bar Chart

private struct AnalyticsBarChartSection: View {
    let vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        Group {
            if !vm.services.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    sectionLabel("Топ сервисов по стоимости", icon: "chart.bar.fill")

                    HudPanel(accent: .signalSecondary) {
                        BarChartContent(ranked: Array(vm.rankedServices.prefix(8)))
                            .padding(12)
                    }
                }
            } else if vm.isLoading || vm.isChartLoading {
                shimmerRect(height: 220)
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.3), value: appeared)
    }
}

private struct BarChartContent: View {
    let ranked: [(service: ServiceItem, rank: Int)]

    var body: some View {
        Chart(ranked, id: \.service.merchant) { entry in
            BarMark(
                x: .value("Сумма", entry.service.monthlyAmount),
                y: .value("Сервис", entry.service.merchant)
            )
            .foregroundStyle(
                LinearGradient(
                    colors: [Color(hexString: entry.service.color).opacity(0.85), Color(hexString: entry.service.color).opacity(0.35)],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .cornerRadius(6)
            .annotation(position: .trailing, spacing: 6) {
                HStack(spacing: 4) {
                    if entry.rank <= 3 {
                        MedalBadge(rank: entry.rank)
                    }
                    Text("₽\(Int(entry.service.monthlyAmount))")
                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                        .foregroundStyle(Color.textSecondary)
                }
            }
        }
        .chartXAxis(.hidden)
        .chartYAxis {
            AxisMarks(values: .automatic) { _ in
                AxisValueLabel()
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(Color.textPrimary.opacity(0.6))
            }
        }
        .frame(height: CGFloat(min(ranked.count, 8)) * 34 + 12)
        .drawingGroup()
    }
}

private struct MedalBadge: View {
    let rank: Int

    var body: some View {
        let color: Color = rank == 1 ? Color(hex: 0xFFD700) : rank == 2 ? Color(hex: 0xC0C0C0) : Color(hex: 0xCD7F32)
        ZStack {
            Circle().fill(color.opacity(0.15)).frame(width: 16, height: 16)
            Circle().stroke(color, lineWidth: 1).frame(width: 16, height: 16)
            Text("#\(rank)")
                .font(.system(size: 7, weight: .bold, design: .monospaced))
                .foregroundStyle(color)
        }
    }
}

// MARK: - Recommendations

private struct AnalyticsRecommendationsSection: View {
    let vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        Group {
            if !vm.recommendations.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    sectionLabel("Рекомендации", icon: "lightbulb.fill")

                    HudPanel(accent: .signalPrimary) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                AnimatedNumber(
                                    value: vm.totalPotentialSavings,
                                    prefix: "−₽",
                                    font: .system(size: 22, weight: .heavy, design: .monospaced)
                                )
                                .foregroundStyle(Color.signalPrimary)
                                .shadow(color: Color.signalPrimary.opacity(0.3), radius: 8)

                                Text("ПОТЕНЦИАЛЬНАЯ ЭКОНОМИЯ В ГОД")
                                    .font(.system(size: 8, weight: .semibold, design: .monospaced))
                                    .tracking(0.5)
                                    .foregroundStyle(Color.textMuted)
                            }
                            Spacer()
                            Image(systemName: "sparkles")
                                .font(.system(size: 20))
                                .foregroundStyle(Color.signalPrimary.opacity(0.4))
                        }
                        .padding(16)
                    }

                    ForEach(Array(vm.recommendations.prefix(5).enumerated()), id: \.element.id) { idx, rec in
                        RecoCard(rec: rec, index: idx)
                    }
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.35), value: appeared)
    }
}

private struct RecoCard: View {
    let rec: RecommendationItem
    let index: Int

    var body: some View {
        let color = recoColor(rec.type)
        let isHigh = rec.priority == .HIGH

        HudPanel(accent: color) {
            HStack(alignment: .top, spacing: 10) {
                Rectangle()
                    .fill(
                        LinearGradient(colors: [color.opacity(0.8), color.opacity(0.1)],
                                       startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: 3)

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        Image(systemName: recoIcon(rec.type))
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(color)
                        Text(rec.merchant)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(Color.textPrimary)
                        if isHigh {
                            NeonDot(color: .signalDanger, size: 5, pulsing: true)
                        }
                        Spacer()
                        Text(recoLabel(rec.type))
                            .font(.system(size: 9, weight: .semibold, design: .monospaced))
                            .tracking(0.3)
                            .foregroundStyle(color)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(color.opacity(0.12))
                            .clipShape(Capsule())
                    }

                    Text(rec.reason)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.textSecondary)
                        .lineLimit(2)

                    HStack {
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("−₽\(Int(rec.potentialSavings))")
                                .font(.system(size: 14, weight: .heavy, design: .monospaced))
                                .foregroundStyle(Color.signalPrimary)
                                .shadow(color: Color.signalPrimary.opacity(0.3), radius: 4)
                            Text("в год")
                                .font(.system(size: 8, weight: .medium, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                        }
                    }
                }
                .padding(.vertical, 14)
                .padding(.trailing, 14)
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
        case .CANCEL: "Отменить"
        case .REVIEW: "Проверить"
        case .DOWNGRADE: "Сменить план"
        case .CONSOLIDATE: "Дубликат"
        }
    }
}

// MARK: - Scores

private struct AnalyticsScoresSection: View {
    @Bindable var vm: AnalyticsViewModel
    let appeared: Bool

    var body: some View {
        Group {
            if !vm.scores.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    sectionLabel("Здоровье подписок", icon: "heart.text.square.fill")
                    ScoreFilterPicker(vm: vm)

                    if vm.filteredScores.isEmpty {
                        HudPanel(accent: .signalPrimary) {
                            Text("Нет подписок в этой категории")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.textMuted)
                                .frame(maxWidth: .infinity)
                                .padding(24)
                        }
                    } else {
                        ForEach(Array(vm.filteredScores.prefix(6).enumerated()), id: \.element.id) { _, score in
                            ScoreCard(score: score)
                                .transition(.scale.combined(with: .opacity))
                        }
                    }
                }
            } else if !vm.isLoading {
                HudPanel(accent: .signalPrimary) {
                    VStack(spacing: 10) {
                        Image(systemName: "circle.hexagongrid")
                            .font(.system(size: 26))
                            .foregroundStyle(Color.textMuted.opacity(0.3))
                        Text("Нет активных подписок")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.textMuted)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(24)
                }
            }
        }
        .animation(.spring(duration: 0.3), value: vm.scoreFilter)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.4), value: appeared)
    }
}

private struct ScoreFilterPicker: View {
    @Bindable var vm: AnalyticsViewModel

    var body: some View {
        HStack(spacing: 2) {
            ForEach(ScoreFilter.allCases) { f in
                Button {
                    withAnimation(.spring(duration: 0.25)) {
                        vm.scoreFilter = f
                    }
                } label: {
                    Text(f.label)
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 5)
                        .background(vm.scoreFilter == f ? Color.signalPrimary : Color.white.opacity(0.03))
                        .foregroundStyle(vm.scoreFilter == f ? Color.spaceVoid : Color.textMuted)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
                .sensoryFeedback(.selection, trigger: vm.scoreFilter)
            }
        }
    }
}

private struct ScoreCard: View {
    let score: ScoreItem

    var body: some View {
        let riskColor = churnColor(score.churnRisk)
        let isHigh = score.churnRisk == .HIGH

        HudPanel(accent: riskColor) {
            HStack(spacing: 12) {
                Rectangle()
                    .fill(
                        LinearGradient(colors: [riskColor.opacity(0.8), riskColor.opacity(0.1)],
                                       startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: 3)

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(score.merchant)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(Color.textPrimary.opacity(0.85))
                            .lineLimit(1)
                        if isHigh {
                            NeonDot(color: .signalDanger, size: 5, pulsing: true)
                        } else if score.churnRisk == .MEDIUM {
                            NeonDot(color: .signalWarn, size: 5)
                        }
                    }
                    Text("\(score.label) · ₽\(Int(score.monthlyAmount))/мес")
                        .font(.system(size: 10, weight: .regular, design: .monospaced))
                        .foregroundStyle(Color.textMuted)
                }

                Spacer()

                CircularGauge(value: Double(score.valueScore), color: riskColor, size: 42, lineWidth: 3, style: .semi)
                    .overlay {
                        Text("\(score.valueScore)")
                            .font(.system(size: 12, weight: .heavy, design: .monospaced))
                            .foregroundStyle(riskColor)
                            .offset(y: -2)
                    }

                Text(churnRiskLabel(score.churnRisk))
                    .font(.system(size: 9, weight: .semibold, design: .monospaced))
                    .foregroundStyle(riskColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(riskColor.opacity(0.12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 6)
                            .stroke(riskColor.opacity(0.2), lineWidth: 0.5)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            }
            .padding(.vertical, 12)
            .padding(.trailing, 14)
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
        case .LOW: "Низкий"
        case .MEDIUM: "Средний"
        case .HIGH: "Высокий"
        }
    }
}

// MARK: - Shared Helpers

private func sectionLabel(_ text: String, icon: String) -> some View {
    HStack(spacing: 8) {
        Image(systemName: icon)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Color.signalPrimary.opacity(0.7))
        Text(text)
            .font(.system(size: 11, weight: .semibold, design: .monospaced))
            .tracking(0.8)
            .textCase(.uppercase)
            .foregroundStyle(Color.textMuted.opacity(0.6))
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [Color.signalPrimary.opacity(0.15), .clear],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .frame(height: 1)
    }
}

private func emptyChart(message: String, sub: String) -> some View {
    HudPanel(accent: .signalPrimary) {
        VStack(spacing: 8) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 28))
                .foregroundStyle(Color.textMuted.opacity(0.2))
            Text(message)
                .font(.system(size: 14))
                .foregroundStyle(Color.textMuted.opacity(0.4))
            Text(sub)
                .font(.system(size: 11, design: .monospaced))
                .foregroundStyle(Color.textMuted.opacity(0.25))
        }
        .frame(maxWidth: .infinity)
        .padding(32)
    }
}

private func shimmerRect(height: CGFloat) -> some View {
    RoundedRectangle(cornerRadius: 16)
        .fill(Color.spaceHull.opacity(0.2))
        .frame(height: height)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .fill(
                    LinearGradient(
                        colors: [.clear, Color.signalPrimary.opacity(0.04), .clear],
                        startPoint: .leading, endPoint: .trailing
                    )
                )
                .modifier(ShimmerEffect())
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
}

// MARK: - Shimmer

private struct ShimmerEffect: ViewModifier {
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
