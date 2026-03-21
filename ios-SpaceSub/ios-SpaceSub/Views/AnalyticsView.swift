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
                VStack(alignment: .leading, spacing: 20) {

                    headerSection
                    periodPicker

                    if vm.overview != nil {
                        heroCard
                        budgetRadar
                        donutAndAccordion
                        areaChartSection
                        barChartSection
                        recommendationsSection
                        scoresSection
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
                loadingState
            }
        }
        .onAppear { vm.onUnauthorized = { auth.handleUnauthorized() } }
        .task {
            await vm.load()
            withAnimation(.spring(duration: 0.5)) { appeared = true }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
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
        .animation(.spring(duration: 0.5).delay(0), value: appeared)
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

    // MARK: - Hero Card

    private var heroCard: some View {
        HudPanel(accent: .signalPrimary, glowing: true, scanLine: true) {
            ZStack {
                ParticleField(count: 6)

                VStack(alignment: .leading, spacing: 16) {
                    Text("ПОТРАЧЕНО ЗА ПЕРИОД")
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .tracking(1.2)
                        .foregroundStyle(Color.textMuted)

                    if let overview = vm.overview {
                        // Main number + trend
                        HStack(alignment: .firstTextBaseline, spacing: 10) {
                            AnimatedNumber(
                                value: overview.periodTotal,
                                prefix: "₽",
                                font: .system(size: 36, weight: .heavy, design: .monospaced)
                            )
                            .foregroundStyle(Color.textPrimary)

                            Spacer()

                            if overview.trend.changePct != 0 {
                                VStack(alignment: .trailing, spacing: 4) {
                                    trendBadge(overview.trend.changePct)
                                    TrendSparkline(
                                        data: vm.periodTotals,
                                        color: overview.trend.changePct >= 0 ? .signalDanger : .signalPrimary,
                                        width: 70,
                                        height: 20
                                    )
                                }
                            }
                        }

                        // Mini stats
                        HStack(spacing: 0) {
                            miniStat(label: "ПОДПИСОК", value: Double(overview.activeCount), color: .signalPrimary, icon: "antenna.radiowaves.left.and.right", delay: 0.3)
                            Spacer()
                            miniStat(label: "В МЕСЯЦ", value: overview.mrr, color: .signalSecondary, icon: "arrow.clockwise", prefix: "₽", delay: 0.42)
                            Spacer()
                            miniStat(label: "В ГОД", value: overview.arr, color: Color(hex: 0xA78BFA), icon: "calendar", prefix: "₽", delay: 0.54)
                            Spacer()
                            miniStat(label: "СКОРО", value: Double(overview.upcomingCount), color: .signalWarn, icon: "exclamationmark.triangle", delay: 0.66)
                        }
                    }
                }
                .padding(22)
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.1), value: appeared)
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

    private func miniStat(label: String, value: Double, color: Color, icon: String, prefix: String = "", delay: Double = 0) -> some View {
        VStack(spacing: 5) {
            AnimatedNumber(
                value: value,
                prefix: prefix,
                font: .system(size: 18, weight: .heavy, design: .monospaced)
            )
            .foregroundStyle(color)
            .shadow(color: color.opacity(0.3), radius: 6)

            HStack(spacing: 3) {
                Image(systemName: icon)
                    .font(.system(size: 8, weight: .medium))
                Text(label)
                    .font(.system(size: 8, weight: .semibold, design: .monospaced))
                    .tracking(0.5)
            }
            .foregroundStyle(Color.textMuted.opacity(0.5))
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 10)
        .animation(.spring(duration: 0.5, bounce: 0.2).delay(delay), value: appeared)
    }

    // MARK: - Budget Radar

    private var budgetRadar: some View {
        let healthColor: Color = vm.budgetHealthScore > 70 ? .signalPrimary : vm.budgetHealthScore > 40 ? .signalWarn : .signalDanger

        return HStack(spacing: 10) {
            radarCard(
                label: "Здоровье бюджета",
                value: vm.budgetHealthScore,
                suffix: "/100",
                color: healthColor,
                icon: "shield.checkered",
                gauge: vm.budgetHealthScore
            )
            radarCard(
                label: "Оптимизация",
                value: vm.optimizationPotential,
                suffix: "%",
                color: .signalSecondary,
                icon: "target",
                gauge: vm.optimizationPotential
            )
            radarCard(
                label: "Плотность",
                value: vm.subscriptionDensity,
                suffix: "/кат",
                color: Color(hex: 0xA78BFA),
                icon: "circle.hexagongrid",
                gauge: min(100, vm.subscriptionDensity * 20),
                decimals: 1
            )
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 20)
        .animation(.spring(duration: 0.5).delay(0.15), value: appeared)
    }

    private func radarCard(label: String, value: Double, suffix: String, color: Color, icon: String, gauge: Double, decimals: Int = 0) -> some View {
        HudPanel(accent: color) {
            HStack(spacing: 10) {
                CircularGauge(value: gauge, color: color, size: 42, lineWidth: 3)
                    .overlay {
                        Image(systemName: icon)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(color.opacity(0.7))
                    }

                VStack(alignment: .leading, spacing: 3) {
                    AnimatedNumber(
                        value: value,
                        suffix: suffix,
                        font: .system(size: 16, weight: .heavy, design: .monospaced),
                        decimals: decimals
                    )
                    .foregroundStyle(color)
                    .shadow(color: color.opacity(0.3), radius: 4)

                    Text(label)
                        .font(.system(size: 8, weight: .semibold, design: .monospaced))
                        .tracking(0.4)
                        .textCase(.uppercase)
                        .foregroundStyle(Color.textMuted)
                        .lineLimit(1)
                }
            }
            .padding(12)
        }
    }

    // MARK: - Donut + Accordion

    private var donutAndAccordion: some View {
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
                        donutChart
                    }
                }
                .padding(18)
            }

            // Expansion panel
            if let cat = vm.selectedCategory,
               let item = vm.categories.first(where: { $0.category == cat }) {
                donutExpansionPanel(category: cat, item: item)
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
                        categoryAccordion
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

    // MARK: - Donut Chart

    private var donutChart: some View {
        ZStack {
            // Orbit ring
            Circle()
                .stroke(style: StrokeStyle(lineWidth: 0.5, dash: [3, 8]))
                .foregroundStyle(Color.signalPrimary.opacity(0.06))
                .frame(width: 240, height: 240)
                .rotationEffect(.degrees(orbitAngle))
                .onAppear {
                    withAnimation(.linear(duration: 60).repeatForever(autoreverses: false)) {
                        orbitAngle = 360
                    }
                }

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
            .sensoryFeedback(.selection, trigger: vm.selectedCategory)
        }
        .frame(height: 260)
    }

    @State private var orbitAngle: Double = 0

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

    // MARK: - Donut Expansion Panel

    private func donutExpansionPanel(category: String, item: CategoryItem) -> some View {
        let catServices = vm.services(for: category)
        let catTotal = catServices.reduce(0.0) { $0 + $1.monthlyAmount }

        return HudPanel(accent: Color(hexString: item.color)) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    CategoryIconView(category: category, size: 16, color: Color(hexString: item.color))
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
                                            colors: [Color(hexString: item.color).opacity(0.6), Color(hexString: item.color)],
                                            startPoint: .leading, endPoint: .trailing
                                        )
                                    )
                                    .frame(width: geo.size.width * share, height: 3)
                                    .shadow(color: Color(hexString: item.color).opacity(0.3), radius: 4)
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

    // MARK: - Category Accordion

    private var categoryAccordion: some View {
        VStack(spacing: 6) {
            let maxTotal = vm.categories.first?.total ?? 1

            ForEach(Array(vm.categories.prefix(8).enumerated()), id: \.element.id) { idx, item in
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

    // MARK: - Area Chart

    private var areaChartSection: some View {
        Group {
            if !vm.periods.isEmpty && vm.periods.contains(where: { $0.total > 0 }) {
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        sectionLabel("Динамика расходов", icon: "chart.xyaxis.line")
                        Spacer()
                        // Legend
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
                        Chart(vm.periodsWithAvg) { item in
                            AreaMark(
                                x: .value("Период", item.period),
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
                                x: .value("Период", item.period),
                                y: .value("Сумма", item.total)
                            )
                            .foregroundStyle(Color.signalPrimary)
                            .lineStyle(StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round))
                            .interpolationMethod(.catmullRom)

                            // Moving average (dashed)
                            LineMark(
                                x: .value("Период", item.period),
                                y: .value("Среднее", item.movingAvg)
                            )
                            .foregroundStyle(Color.signalSecondary.opacity(0.4))
                            .lineStyle(StrokeStyle(lineWidth: 1.5, lineCap: .round, dash: [6, 4]))
                            .interpolationMethod(.catmullRom)

                            // Points
                            PointMark(
                                x: .value("Период", item.period),
                                y: .value("Сумма", item.total)
                            )
                            .foregroundStyle(Color.signalPrimary)
                            .symbolSize(item.period == vm.periodsWithAvg.last?.period ? 40 : 16)
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
                                    .foregroundStyle(Color.textMuted.opacity(0.5))
                                AxisGridLine()
                                    .foregroundStyle(Color.signalPrimary.opacity(0.04))
                            }
                        }
                        .frame(height: 200)
                        .padding(16)
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

    // MARK: - Bar Chart

    private var barChartSection: some View {
        Group {
            if !vm.services.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    sectionLabel("Топ сервисов по стоимости", icon: "chart.bar.fill")

                    HudPanel(accent: .signalSecondary) {
                        let ranked = vm.rankedServices.prefix(10)
                        Chart(Array(ranked), id: \.service.merchant) { entry in
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
                                        medalBadge(rank: entry.rank)
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
                        .frame(height: CGFloat(min(ranked.count, 10)) * 38 + 16)
                        .padding(16)
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

    private func medalBadge(rank: Int) -> some View {
        let color: Color = rank == 1 ? Color(hex: 0xFFD700) : rank == 2 ? Color(hex: 0xC0C0C0) : Color(hex: 0xCD7F32)
        return ZStack {
            Circle().fill(color.opacity(0.15)).frame(width: 16, height: 16)
            Circle().stroke(color, lineWidth: 1).frame(width: 16, height: 16)
            Text("#\(rank)")
                .font(.system(size: 7, weight: .bold, design: .monospaced))
                .foregroundStyle(color)
        }
    }

    // MARK: - Recommendations

    private var recommendationsSection: some View {
        Group {
            if !vm.recommendations.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    sectionLabel("Рекомендации", icon: "lightbulb.fill")

                    // Savings counter
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
                        recoCard(rec: rec, index: idx)
                    }
                }
            }
        }
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 24)
        .animation(.spring(duration: 0.5).delay(0.35), value: appeared)
    }

    private func recoCard(rec: RecommendationItem, index: Int) -> some View {
        let color = recoColor(rec.type)
        let isHigh = rec.priority == .HIGH

        return HudPanel(accent: color) {
            HStack(alignment: .top, spacing: 10) {
                // Priority left indicator
                Rectangle()
                    .fill(
                        LinearGradient(colors: [color.opacity(0.8), color.opacity(0.1)],
                                       startPoint: .top, endPoint: .bottom)
                    )
                    .frame(width: 3)
                    .opacity(isHigh ? alarmOpacity : 1)

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

    @State private var alarmOpacity: Double = 1.0

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

    // MARK: - Scores

    private var scoresSection: some View {
        Group {
            if !vm.scores.isEmpty {
                VStack(alignment: .leading, spacing: 12) {
                    sectionLabel("Здоровье подписок", icon: "heart.text.square.fill")

                    // Filter tabs
                    scoreFilterPicker

                    if vm.filteredScores.isEmpty {
                        HudPanel(accent: .signalPrimary) {
                            Text("Нет подписок в этой категории")
                                .font(.system(size: 13))
                                .foregroundStyle(Color.textMuted)
                                .frame(maxWidth: .infinity)
                                .padding(24)
                        }
                    } else {
                        ForEach(Array(vm.filteredScores.prefix(6).enumerated()), id: \.element.id) { idx, score in
                            scoreCard(score: score)
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

    private var scoreFilterPicker: some View {
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

    private func scoreCard(score: ScoreItem) -> some View {
        let riskColor = churnColor(score.churnRisk)
        let isHigh = score.churnRisk == .HIGH

        return HudPanel(accent: riskColor) {
            HStack(spacing: 12) {
                // Priority border
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

                // Circular gauge
                CircularGauge(value: Double(score.valueScore), color: riskColor, size: 42, lineWidth: 3, style: .semi)
                    .overlay {
                        Text("\(score.valueScore)")
                            .font(.system(size: 12, weight: .heavy, design: .monospaced))
                            .foregroundStyle(riskColor)
                            .offset(y: -2)
                    }

                // Risk badge
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

    // MARK: - Helpers

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

    private var loadingState: some View {
        VStack(spacing: 16) {
            OrbitIndicator(size: 60, duration: 3)
            Text("Обработка телеметрии...")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.textSecondary)
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
