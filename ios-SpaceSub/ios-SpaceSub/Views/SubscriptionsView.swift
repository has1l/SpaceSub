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

                    if vm.active.isEmpty && vm.manualSubs.isEmpty && !vm.isLoading {
                        SubsEmptyState()
                    } else if !vm.active.isEmpty {
                        SubsActiveSection(
                            active: vm.active,
                            cancellingId: vm.cancellingId,
                            onCancel: { id in vm.requestCancel(id: id) }
                        )
                    }

                    if !vm.manualSubs.isEmpty {
                        SubsManualSection(
                            subs: vm.manualSubs,
                            deletingId: vm.deletingManualId,
                            onEdit: { sub in vm.editingSub = sub },
                            onDelete: { id in vm.requestDeleteManual(id: id) }
                        )
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
                .padding(.bottom, 80)
            }
            .refreshable { await vm.load() }

            // FAB — add manual subscription
            VStack {
                Spacer()
                HStack {
                    Spacer()
                    Button {
                        vm.showAddSheet = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 56, height: 56)
                            .background(SpaceGradient.signalButton)
                            .clipShape(Circle())
                            .shadow(color: Color.signalPrimary.opacity(0.4), radius: 16, x: 0, y: 4)
                    }
                    .buttonStyle(.plain)
                    .padding(.trailing, 20)
                    .padding(.bottom, 24)
                }
            }

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
        .sheet(isPresented: Binding(
            get: { vm.showAddSheet },
            set: { vm.showAddSheet = $0 }
        )) {
            SubscriptionFormSheet(
                title: "Новый спутник",
                onSave: { body in
                    Task {
                        await vm.createManual(body)
                        vm.showAddSheet = false
                    }
                },
                onCancel: { vm.showAddSheet = false }
            )
        }
        .sheet(item: Binding(
            get: { vm.editingSub },
            set: { vm.editingSub = $0 }
        )) { sub in
            SubscriptionFormSheet(
                title: "Редактировать",
                existing: sub,
                onSave: { body in
                    Task {
                        await vm.updateManual(id: sub.id, body)
                        vm.editingSub = nil
                    }
                },
                onCancel: { vm.editingSub = nil }
            )
        }
        .alert("Отменить подписку?", isPresented: Binding(
            get: { vm.showCancelConfirm },
            set: { if !$0 { vm.dismissCancel() } }
        )) {
            Button("Отменить подписку", role: .destructive) {
                Task { await vm.confirmCancel() }
            }
            Button("Назад", role: .cancel) {
                vm.dismissCancel()
            }
        } message: {
            Text("Автоплатёж в банке будет отменён. Новых списаний не будет.")
        }
        .alert("Удалить подписку?", isPresented: Binding(
            get: { vm.showDeleteManualConfirm },
            set: { if !$0 { vm.dismissDeleteManual() } }
        )) {
            Button("Удалить", role: .destructive) {
                Task { await vm.confirmDeleteManual() }
            }
            Button("Назад", role: .cancel) {
                vm.dismissDeleteManual()
            }
        } message: {
            Text("Подписка будет удалена без возможности восстановления.")
        }
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
    var cancellingId: String?
    var onCancel: (String) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Все активные подписки", icon: "dot.radiowaves.left.and.right") {
                Text("\(active.count)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.signalPrimary)
            }

            ForEach(active) { sub in
                DetectedSubscriptionCard(
                    sub: sub,
                    isCancelling: cancellingId == sub.id,
                    onCancel: { onCancel(sub.id) }
                )
            }
        }
    }
}

private struct DetectedSubscriptionCard: View {
    let sub: DetectedSubscription
    var isCancelling: Bool = false
    var onCancel: () -> Void = {}

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
                    if let logoUrl = sub.logoUrl, let url = URL(string: logoUrl) {
                        AsyncImage(url: url) { image in
                            image.resizable().aspectRatio(contentMode: .fit)
                        } placeholder: {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color.signalPrimary.opacity(0.1))
                        }
                        .frame(width: 32, height: 32)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                    }

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

                if sub.isActive {
                    Divider()
                        .overlay(Color.signalPrimary.opacity(0.05))

                    Button(action: onCancel) {
                        HStack(spacing: 6) {
                            if isCancelling {
                                ProgressView()
                                    .scaleEffect(0.7)
                                    .tint(Color.signalDanger)
                            }
                            Text(isCancelling ? "Отмена..." : "Отменить подписку")
                                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.signalDanger.opacity(0.06))
                        .foregroundStyle(Color.signalDanger.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.signalDanger.opacity(0.1), lineWidth: 1)
                        )
                    }
                    .disabled(isCancelling)
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

                Text("Синхронизируйте банк или добавьте подписку вручную с помощью кнопки «+»")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.textMuted)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
        }
    }
}

// MARK: - Manual Subscriptions Section

private struct SubsManualSection: View {
    let subs: [Subscription]
    var deletingId: String?
    var onEdit: (Subscription) -> Void = { _ in }
    var onDelete: (String) -> Void = { _ in }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader("Ручные подписки", icon: "pencil.and.list.clipboard") {
                Text("\(subs.count)")
                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.signalPrimary)
            }

            ForEach(subs) { sub in
                ManualSubscriptionCard(
                    sub: sub,
                    isDeleting: deletingId == sub.id,
                    onEdit: { onEdit(sub) },
                    onDelete: { onDelete(sub.id) }
                )
            }
        }
    }
}

private struct ManualSubscriptionCard: View {
    let sub: Subscription
    var isDeleting: Bool = false
    var onEdit: () -> Void = {}
    var onDelete: () -> Void = {}

    private var days: Int {
        guard let date = DateFormatting.parseISO(sub.nextBilling) else { return -1 }
        return Int(ceil(date.timeIntervalSince(Date()) / 86400))
    }
    private var isUpcoming: Bool { days >= 0 && days <= 7 }

    var body: some View {
        SpaceCard(glowing: sub.isActive) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(sub.name)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundStyle(Color.textPrimary)
                            .lineLimit(1)

                        Text(sub.periodType.russianName)
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(Color.textMuted)
                    }

                    Spacer()

                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(Int(sub.amount)) \(sub.currency == "RUB" ? "\u{20BD}" : sub.currency)")
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
                        StatusBadge(text: "Неактивна", variant: .dim)
                    }

                    if isUpcoming {
                        StatusBadge(text: "Скоро списание", variant: .warn)
                    }

                    if let category = sub.category, !category.isEmpty {
                        StatusBadge(text: category, variant: .dim, showDot: false)
                    }
                }

                Divider()
                    .overlay(Color.signalPrimary.opacity(0.05))

                VStack(spacing: 6) {
                    SubsMetaRow(
                        label: "Следующее списание",
                        value: DateFormatting.formatDate(sub.nextBilling),
                        extra: days >= 0 ? (days == 0 ? "сегодня" : "через \(days) дн.") : nil,
                        warn: days >= 0 && days <= 3
                    )

                    if let desc = sub.description, !desc.isEmpty {
                        SubsMetaRow(label: "Описание", value: desc)
                    }
                }

                Divider()
                    .overlay(Color.signalPrimary.opacity(0.05))

                HStack(spacing: 10) {
                    Button(action: onEdit) {
                        HStack(spacing: 6) {
                            Image(systemName: "pencil")
                                .font(.system(size: 11, weight: .semibold))
                            Text("Изменить")
                                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.signalPrimary.opacity(0.06))
                        .foregroundStyle(Color.signalPrimary.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.signalPrimary.opacity(0.1), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)

                    Button(action: onDelete) {
                        HStack(spacing: 6) {
                            if isDeleting {
                                ProgressView()
                                    .scaleEffect(0.7)
                                    .tint(Color.signalDanger)
                            } else {
                                Image(systemName: "trash")
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            Text(isDeleting ? "..." : "Удалить")
                                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.signalDanger.opacity(0.06))
                        .foregroundStyle(Color.signalDanger.opacity(0.7))
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .stroke(Color.signalDanger.opacity(0.1), lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(isDeleting)
                }
            }
        }
    }
}

// MARK: - Subscription Form Sheet

private struct SubscriptionFormSheet: View {
    let title: String
    var existing: Subscription? = nil
    var onSave: (CreateSubscriptionRequest) -> Void
    var onCancel: () -> Void

    @State private var name: String = ""
    @State private var amount: String = ""
    @State private var billingCycle: BillingCycle = .monthly
    @State private var nextBilling: Date = Date()
    @State private var category: String = ""
    @State private var isSaving = false

    private var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
            && Double(amount.replacingOccurrences(of: ",", with: ".")) != nil
            && Double(amount.replacingOccurrences(of: ",", with: "."))! > 0
    }

    var body: some View {
        ZStack {
            Color.spaceVoid.ignoresSafeArea()
            SpaceBackground()

            ScrollView(.vertical, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 20) {

                    // Header
                    HStack {
                        Text(title)
                            .font(.system(size: 22, weight: .bold, design: .rounded))
                            .foregroundStyle(
                                LinearGradient(
                                    colors: [Color.signalPrimary, Color.signalSecondary],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )

                        Spacer()

                        Button(action: onCancel) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 24))
                                .foregroundStyle(Color.textMuted)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.top, 8)

                    // Name
                    SpaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Название")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                                .tracking(0.5)

                            TextField("Spotify, Netflix...", text: $name)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color.textPrimary)
                                .tint(Color.signalPrimary)
                                .autocorrectionDisabled()
                        }
                    }

                    // Amount
                    SpaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Сумма, \u{20BD}")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                                .tracking(0.5)

                            TextField("199", text: $amount)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color.textPrimary)
                                .tint(Color.signalPrimary)
                                .keyboardType(.decimalPad)
                        }
                    }

                    // Billing cycle
                    SpaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Период")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                                .tracking(0.5)

                            Picker("Период", selection: $billingCycle) {
                                ForEach(BillingCycle.allCases, id: \.self) { cycle in
                                    Text(cycle.russianName).tag(cycle)
                                }
                            }
                            .pickerStyle(.segmented)
                            .tint(Color.signalPrimary)
                        }
                    }

                    // Next billing date
                    SpaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Следующее списание")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                                .tracking(0.5)

                            DatePicker(
                                "",
                                selection: $nextBilling,
                                displayedComponents: .date
                            )
                            .datePickerStyle(.compact)
                            .labelsHidden()
                            .tint(Color.signalPrimary)
                            .environment(\.locale, Locale(identifier: "ru_RU"))
                        }
                    }

                    // Category
                    SpaceCard {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Категория")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color.textMuted)
                                .tracking(0.5)

                            TextField("Музыка, Видео, Облако...", text: $category)
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Color.textPrimary)
                                .tint(Color.signalPrimary)
                                .autocorrectionDisabled()
                        }
                    }

                    // Save
                    GlowButton(
                        title: existing == nil ? "Запустить на орбиту" : "Сохранить",
                        icon: existing == nil ? "paperplane.fill" : "checkmark",
                        isLoading: isSaving
                    ) {
                        save()
                    }
                    .disabled(!isValid)
                    .opacity(isValid ? 1 : 0.5)
                    .padding(.top, 4)
                }
                .padding(SpaceMetrics.screenPadding)
                .padding(.bottom, 20)
            }
        }
        .onAppear {
            if let sub = existing {
                name = sub.name
                amount = String(format: "%.0f", sub.amount)
                billingCycle = sub.periodType
                category = sub.category ?? ""
                if let date = DateFormatting.parseISO(sub.nextBilling) {
                    nextBilling = date
                }
            }
        }
    }

    private func save() {
        guard isValid else { return }
        isSaving = true

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]

        let parsedAmount = Double(amount.replacingOccurrences(of: ",", with: ".")) ?? 0

        let body = CreateSubscriptionRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            amount: parsedAmount,
            periodType: billingCycle,
            nextBilling: formatter.string(from: nextBilling),
            category: category.trimmingCharacters(in: .whitespaces).isEmpty
                ? nil
                : category.trimmingCharacters(in: .whitespaces)
        )

        onSave(body)
    }
}
