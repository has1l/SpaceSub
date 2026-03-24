package dev.squad52.spacesub.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.foundation.Canvas
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.models.*
import dev.squad52.spacesub.ui.components.AreaSparkline
import dev.squad52.spacesub.ui.components.CircularGauge
import dev.squad52.spacesub.ui.components.DonutChart
import dev.squad52.spacesub.ui.components.DonutSegment
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.HorizontalBarSegment
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.components.TrendSparkline
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.AnalyticsViewModel
import dev.squad52.spacesub.viewmodels.PeriodPreset
import dev.squad52.spacesub.viewmodels.ScoreFilter
import java.text.NumberFormat
import java.util.Locale

private fun formatRub(amount: Double): String {
    val nf = NumberFormat.getIntegerInstance(Locale.forLanguageTag("ru-RU"))
    return "${nf.format(amount.toLong())} ₽"
}

private fun parseHexColor(hex: String): Color {
    return try {
        Color(android.graphics.Color.parseColor(hex))
    } catch (_: Exception) {
        SignalPrimary
    }
}

@Composable
fun AnalyticsScreen(viewModel: AnalyticsViewModel) {
    val overview by viewModel.overview.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val services by viewModel.services.collectAsState()
    val periods by viewModel.periods.collectAsState()
    val scores by viewModel.scores.collectAsState()
    val recommendations by viewModel.recommendations.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val selectedPeriod by viewModel.selectedPeriod.collectAsState()
    val scoreFilter by viewModel.scoreFilter.collectAsState()

    var selectedCatIndex by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(Unit) { viewModel.load() }

    SpaceBackground {
        if (isLoading && overview == null) {
            FullScreenSpinner()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                // ── Header ──
                item { AnalyticsHeader() }

                // ── Period Picker ──
                item {
                    PeriodPicker(
                        selected = selectedPeriod,
                        onSelect = { viewModel.changePeriod(it) }
                    )
                }

                // ── Hero Card ──
                if (overview != null) {
                    item {
                        HeroCard(
                            overview = overview!!,
                            periodTotals = periods.map { it.total.toFloat() }
                        )
                    }

                    // ── Budget Radar ──
                    item {
                        BudgetRadar(
                            healthScore = viewModel.budgetHealthScore,
                            optimizationPotential = viewModel.optimizationPotential,
                            density = viewModel.subscriptionDensity
                        )
                    }
                }

                // ── Donut + Categories ──
                if (categories.isNotEmpty()) {
                    item {
                        SectionLabel("Категории")
                    }
                    item {
                        DonutSection(
                            categories = categories,
                            selectedIndex = selectedCatIndex,
                            onSelect = { selectedCatIndex = it }
                        )
                    }

                    // Expansion panel for selected category
                    item {
                        AnimatedVisibility(
                            visible = selectedCatIndex != null && selectedCatIndex!! < categories.size,
                            enter = expandVertically() + fadeIn(),
                            exit = shrinkVertically() + fadeOut()
                        ) {
                            if (selectedCatIndex != null && selectedCatIndex!! < categories.size) {
                                val cat = categories[selectedCatIndex!!]
                                CategoryExpansionPanel(
                                    category = cat,
                                    services = viewModel.servicesForCategory(cat.category),
                                    onClose = { selectedCatIndex = null }
                                )
                            }
                        }
                    }

                    // Category accordion
                    item {
                        SectionLabel("Распределение")
                    }
                    item {
                        CategoryAccordion(categories = categories)
                    }
                }

                // ── Area Chart ──
                if (periods.isNotEmpty()) {
                    item { SectionLabel("Динамика расходов") }
                    item { PeriodAreaChart(periods = periods) }
                }

                // ── Services Bar Chart ──
                if (services.isNotEmpty()) {
                    item { SectionLabel("Топ сервисов") }
                    item { ServicesBarSection(services = viewModel.rankedServices().take(6)) }
                }

                // ── Recommendations ──
                if (recommendations.isNotEmpty()) {
                    item { SectionLabel("Рекомендации") }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            recommendations.forEach { reco ->
                                RecommendationCard(reco)
                            }
                        }
                    }
                }

                // ── Scores ──
                if (scores.isNotEmpty()) {
                    item { SectionLabel("Здоровье подписок") }
                    item {
                        ScoreFilterRow(
                            selected = scoreFilter,
                            onSelect = { viewModel.changeScoreFilter(it) }
                        )
                    }
                    item {
                        val filtered = viewModel.filteredScores()
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (filtered.isEmpty()) {
                                SpaceCard(glowColor = SignalPrimary) {
                                    Text(
                                        text = "Нет подписок в этой категории",
                                        fontSize = 13.sp,
                                        color = TextMuted,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(24.dp),
                                        textAlign = TextAlign.Center
                                    )
                                }
                            } else {
                                filtered.take(6).forEach { score ->
                                    ScoreCard(score)
                                }
                            }
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

// ═══════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════

@Composable
private fun AnalyticsHeader() {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            text = "Аналитика",
            style = TextStyle(
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
            )
        )
        Text(
            text = "ТЕЛЕМЕТРИЯ РАСХОДОВ · ДИАГНОСТИКА · РЕКОМЕНДАЦИИ",
            fontSize = 9.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextMuted,
            letterSpacing = 1.sp
        )
    }
}

// ── Period Picker ──

@Composable
private fun PeriodPicker(
    selected: PeriodPreset,
    onSelect: (PeriodPreset) -> Unit
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(SignalPrimary.copy(alpha = 0.04f))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(0.dp)
    ) {
        PeriodPreset.entries.forEach { preset ->
            val isSelected = preset == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .then(
                        if (isSelected) Modifier.background(SignalPrimary)
                        else Modifier
                    )
                    .clickable { onSelect(preset) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = preset.label,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected) SpaceBlack else TextSecondary
                )
            }
        }
    }
}

// ── Hero Card ──

@Composable
private fun HeroCard(overview: AnalyticsOverview, periodTotals: List<Float>) {
    SpaceCard(glowColor = SignalPrimary) {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                text = "ПОТРАЧЕНО ЗА ПЕРИОД",
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextMuted,
                letterSpacing = 1.2.sp
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = formatRub(overview.periodTotal),
                    fontSize = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.weight(1f))

                if (overview.trend.changePct != 0.0) {
                    Column(horizontalAlignment = Alignment.End) {
                        TrendBadge(changePct = overview.trend.changePct)
                        Spacer(modifier = Modifier.height(4.dp))
                        TrendSparkline(
                            data = periodTotals.ifEmpty { listOf(overview.trend.prevMonth.toFloat(), overview.trend.currentMonth.toFloat()) },
                            color = if (overview.trend.changePct >= 0) SignalDanger else SignalPrimary,
                            modifier = Modifier.size(width = 56.dp, height = 18.dp)
                        )
                    }
                }
            }

            // 4 Mini Stats
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                MiniStat("ПОДПИСОК", "${overview.activeCount}", SignalPrimary)
                MiniStat("В МЕСЯЦ", formatRub(overview.mrr), SignalSecondary)
                MiniStat("В ГОД", formatRub(overview.arr), Color(0xFFA78BFA))
                MiniStat("СКОРО", "${overview.upcomingCount}", SignalWarning)
            }
        }
    }
}

@Composable
private fun TrendBadge(changePct: Double) {
    val isUp = changePct >= 0
    val color = if (isUp) SignalDanger else SignalPrimary
    val arrow = if (isUp) "▲" else "▼"

    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(50))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp)
    ) {
        Text(text = arrow, fontSize = 8.sp, color = color)
        Text(
            text = String.format("%.1f%%", kotlin.math.abs(changePct)),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = color
        )
    }
}

@Composable
private fun MiniStat(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            fontSize = 13.sp,
            fontWeight = FontWeight.ExtraBold,
            color = color
        )
        Spacer(modifier = Modifier.height(2.dp))
        Text(
            text = label,
            fontSize = 7.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextMuted.copy(alpha = 0.5f),
            letterSpacing = 0.3.sp
        )
    }
}

// ── Budget Radar ──

@Composable
private fun BudgetRadar(
    healthScore: Double,
    optimizationPotential: Double,
    density: Double
) {
    val healthColor = when {
        healthScore > 70 -> SignalPrimary
        healthScore > 40 -> SignalWarning
        else -> SignalDanger
    }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        RadarCard(
            label = "ЗДОРОВЬЕ БЮДЖЕТА",
            value = "${healthScore.toInt()}/100",
            gaugeValue = healthScore.toFloat(),
            color = healthColor,
            modifier = Modifier.weight(1f)
        )
        RadarCard(
            label = "ОПТИМИЗАЦИЯ",
            value = "${optimizationPotential.toInt()}%",
            gaugeValue = optimizationPotential.toFloat(),
            color = SignalSecondary,
            modifier = Modifier.weight(1f)
        )
        RadarCard(
            label = "ПЛОТНОСТЬ",
            value = String.format("%.1f/кат", density),
            gaugeValue = (density * 20).toFloat().coerceAtMost(100f),
            color = Color(0xFFA78BFA),
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun RadarCard(
    label: String,
    value: String,
    gaugeValue: Float,
    color: Color,
    modifier: Modifier = Modifier
) {
    SpaceCard(modifier = modifier, glowColor = color, padding = 10.dp) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            CircularGauge(
                value = gaugeValue,
                color = color,
                size = 34.dp,
                lineWidth = 2.5.dp
            )
            Text(
                text = value,
                fontSize = 12.sp,
                fontWeight = FontWeight.ExtraBold,
                color = color
            )
            Text(
                text = label,
                fontSize = 7.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextMuted,
                letterSpacing = 0.3.sp,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
        }
    }
}

// ── Section Label ──

@Composable
private fun SectionLabel(text: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = text.uppercase(),
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            color = TextMuted.copy(alpha = 0.6f),
            letterSpacing = 0.8.sp
        )
        Spacer(modifier = Modifier.width(10.dp))
        Box(
            modifier = Modifier
                .weight(1f)
                .height(1.dp)
                .background(
                    Brush.horizontalGradient(
                        listOf(SignalPrimary.copy(alpha = 0.15f), Color.Transparent)
                    )
                )
        )
    }
}

// ── Donut Section ──

@Composable
private fun DonutSection(
    categories: List<CategoryItem>,
    selectedIndex: Int?,
    onSelect: (Int?) -> Unit
) {
    SpaceCard(glowColor = SignalSecondary) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = "НАЖМИТЕ НА СЕКТОР ДЛЯ ДЕТАЛИЗАЦИИ",
                fontSize = 8.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextMuted.copy(alpha = 0.4f),
                letterSpacing = 0.8.sp
            )

            val segments = categories.map { cat ->
                DonutSegment(
                    value = cat.total.toFloat(),
                    color = parseHexColor(cat.color),
                    label = cat.category
                )
            }

            DonutChart(
                segments = segments,
                selectedIndex = selectedIndex,
                onSegmentTap = onSelect,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(240.dp)
            ) {
                // Center content
                if (selectedIndex != null && selectedIndex < categories.size) {
                    val cat = categories[selectedIndex]
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "${cat.percent.toInt()}%",
                            fontSize = 22.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = parseHexColor(cat.color)
                        )
                        Text(
                            text = cat.category,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary,
                            maxLines = 1
                        )
                    }
                } else {
                    val total = categories.sumOf { it.total }
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = formatRub(total),
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextPrimary
                        )
                        Text(
                            text = "ВСЕГО/МЕС",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextMuted,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }
        }
    }
}

// ── Category Expansion Panel ──

@Composable
private fun CategoryExpansionPanel(
    category: CategoryItem,
    services: List<ServiceItem>,
    onClose: () -> Unit
) {
    val catColor = parseHexColor(category.color)
    val catTotal = services.sumOf { it.monthlyAmount }

    SpaceCard(glowColor = catColor) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(catColor)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = category.category,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = "${services.size} подписок · ${formatRub(catTotal)}/мес",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextMuted
                )
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = "×",
                    fontSize = 16.sp,
                    color = TextMuted,
                    modifier = Modifier.clickable { onClose() }
                )
            }

            if (services.isEmpty()) {
                Text(
                    text = "Нет подписок в этой категории",
                    fontSize = 12.sp,
                    color = TextMuted
                )
            } else {
                services.forEach { svc ->
                    val share = if (catTotal > 0) (svc.monthlyAmount / catTotal).toFloat() else 0f
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                text = svc.merchant,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = TextPrimary.copy(alpha = 0.7f),
                                modifier = Modifier.weight(1f)
                            )
                            Text(
                                text = "${formatRub(svc.monthlyAmount)}/мес",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary.copy(alpha = 0.8f)
                            )
                        }
                        HorizontalBarSegment(
                            fraction = share,
                            color = catColor,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}

// ── Category Accordion ──

@Composable
private fun CategoryAccordion(categories: List<CategoryItem>) {
    val maxTotal = categories.maxOfOrNull { it.total } ?: 1.0

    SpaceCard(glowColor = Color(0xFFA78BFA)) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            categories.forEach { cat ->
                val catColor = parseHexColor(cat.color)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(catColor)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = cat.category,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary.copy(alpha = 0.7f),
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = formatRub(cat.total),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = catColor
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "${cat.percent.toInt()}%",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextMuted
                        )
                    }
                    HorizontalBarSegment(
                        fraction = (cat.total / maxTotal).toFloat(),
                        color = catColor,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

// ── Period Area Chart ──

@Composable
private fun PeriodAreaChart(periods: List<PeriodItem>) {
    // Compute moving average (window=3) same as iOS
    val movingAvgs = periods.indices.map { i ->
        val window = periods.subList(maxOf(0, i - 2), i + 1)
        window.map { it.total }.average().toFloat()
    }
    val totals = periods.map { it.total.toFloat() }

    SpaceCard(glowColor = SignalPrimary) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            // First / last period labels
            if (periods.size > 1) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(formatPeriodLabel(periods.first().period), fontSize = 9.sp, color = TextMuted)
                    Text(formatPeriodLabel(periods.last().period), fontSize = 9.sp, color = TextMuted)
                }
            }

            SmoothAreaChart(
                totals = totals,
                movingAvgs = movingAvgs,
                modifier = Modifier.fillMaxWidth().height(130.dp)
            )

            // Legend
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.width(14.dp).height(2.dp).background(SignalPrimary, RoundedCornerShape(1.dp)))
                    Text("Расходы", fontSize = 8.sp, color = TextMuted)
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.width(14.dp).height(2.dp).background(SignalSecondary.copy(alpha = 0.4f), RoundedCornerShape(1.dp)))
                    Text("Среднее", fontSize = 8.sp, color = TextMuted)
                }
            }
        }
    }
}

@Composable
private fun SmoothAreaChart(
    totals: List<Float>,
    movingAvgs: List<Float>,
    modifier: Modifier = Modifier
) {
    val animProgress = remember { androidx.compose.animation.core.Animatable(0f) }
    LaunchedEffect(totals) {
        animProgress.snapTo(0f)
        animProgress.animateTo(1f, androidx.compose.animation.core.tween(900))
    }

    Canvas(modifier = modifier) {
        if (totals.size < 2) return@Canvas
        val n = totals.size
        val maxVal = (totals + movingAvgs).max().coerceAtLeast(1f)
        val padY = 4f

        fun xAt(i: Int) = i.toFloat() / (n - 1) * size.width * animProgress.value
        fun yAt(v: Float) = size.height - padY - (v / maxVal) * (size.height - padY * 2)

        // Build smooth bezier path from points
        fun smoothPath(vals: List<Float>): Path {
            val pts = vals.indices.map { androidx.compose.ui.geometry.Offset(xAt(it), yAt(vals[it])) }
            val path = Path()
            path.moveTo(pts[0].x, pts[0].y)
            for (i in 1 until pts.size) {
                val prev = pts[i - 1]; val curr = pts[i]
                val cp1 = if (i == 1)
                    androidx.compose.ui.geometry.Offset(prev.x + (curr.x - prev.x) / 3, prev.y + (curr.y - prev.y) / 3)
                else
                    androidx.compose.ui.geometry.Offset(prev.x + (curr.x - pts[i-2].x) / 6, prev.y + (curr.y - pts[i-2].y) / 6)
                val cp2 = if (i == pts.size - 1)
                    androidx.compose.ui.geometry.Offset(curr.x - (curr.x - prev.x) / 3, curr.y - (curr.y - prev.y) / 3)
                else
                    androidx.compose.ui.geometry.Offset(curr.x - (pts[i+1].x - prev.x) / 6, curr.y - (pts[i+1].y - prev.y) / 6)
                path.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y)
            }
            return path
        }

        val totalPath = smoothPath(totals)

        // Gradient fill
        val fillPath = Path().apply {
            moveTo(0f, size.height)
            addPath(totalPath)
            lineTo(xAt(n - 1), size.height)
            close()
        }
        drawPath(fillPath, brush = androidx.compose.ui.graphics.Brush.verticalGradient(
            listOf(SignalPrimary.copy(alpha = 0.25f), SignalPrimary.copy(alpha = 0f))
        ))

        // Main line
        drawPath(totalPath, color = SignalPrimary,
            style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))

        // Moving avg dashed line
        drawPath(smoothPath(movingAvgs), color = SignalSecondary.copy(alpha = 0.4f),
            style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round,
                pathEffect = androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(12f, 8f))))
    }
}

// ── Services Bar Section ──

@Composable
private fun ServicesBarSection(services: List<ServiceItem>) {
    val maxAmount = services.maxOfOrNull { it.monthlyAmount } ?: 1.0

    SpaceCard(glowColor = SignalPrimary) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            services.forEach { svc ->
                val svcColor = parseHexColor(svc.color)
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = svc.merchant,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary.copy(alpha = 0.85f),
                            modifier = Modifier.weight(1f),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "${formatRub(svc.monthlyAmount)}/мес",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = svcColor
                        )
                    }
                    HorizontalBarSegment(
                        fraction = (svc.monthlyAmount / maxAmount).toFloat(),
                        color = svcColor,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

// ── Recommendations ──

@Composable
private fun RecommendationCard(reco: RecommendationItem) {
    val color = when (reco.type) {
        RecoType.CANCEL -> SignalDanger
        RecoType.REVIEW -> SignalWarning
        RecoType.DOWNGRADE -> SignalPrimary
        RecoType.CONSOLIDATE -> Color(0xFFFFA500)
    }
    val typeLabel = when (reco.type) {
        RecoType.CANCEL -> "Отменить"
        RecoType.REVIEW -> "Проверить"
        RecoType.DOWNGRADE -> "Сменить план"
        RecoType.CONSOLIDATE -> "Дубликат"
    }

    SpaceCard(glowColor = color) {
        Row(modifier = Modifier.fillMaxWidth()) {
            // Colored left bar
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(64.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(color.copy(alpha = 0.8f), color.copy(alpha = 0.1f))
                        )
                    )
            )
            Spacer(modifier = Modifier.width(12.dp))

            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = reco.merchant,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary,
                        modifier = Modifier.weight(1f)
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(color.copy(alpha = 0.12f))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = typeLabel,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = color
                        )
                    }
                }

                Text(
                    text = reco.reason,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.Bottom
                ) {
                    Text(
                        text = "−${formatRub(reco.potentialSavings)}",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = SignalPrimary
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "в год",
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextMuted
                    )
                }
            }
        }
    }
}

// ── Score Filter ──

@Composable
private fun ScoreFilterRow(
    selected: ScoreFilter,
    onSelect: (ScoreFilter) -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(2.dp)
    ) {
        ScoreFilter.entries.forEach { filter ->
            val isSelected = filter == selected
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(
                        if (isSelected) SignalPrimary else Color.White.copy(alpha = 0.03f)
                    )
                    .clickable { onSelect(filter) }
                    .padding(horizontal = 12.dp, vertical = 5.dp)
            ) {
                Text(
                    text = filter.label,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (isSelected) SpaceBlack else TextMuted
                )
            }
        }
    }
}

// ── Score Card ──

@Composable
private fun ScoreCard(score: ScoreItem) {
    val riskColor = when (score.churnRisk) {
        ChurnRisk.LOW -> SignalSuccess
        ChurnRisk.MEDIUM -> SignalWarning
        ChurnRisk.HIGH -> SignalDanger
    }
    val riskLabel = when (score.churnRisk) {
        ChurnRisk.LOW -> "Низкий"
        ChurnRisk.MEDIUM -> "Средний"
        ChurnRisk.HIGH -> "Высокий"
    }

    SpaceCard(glowColor = riskColor) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Left color bar
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .height(48.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(riskColor.copy(alpha = 0.8f), riskColor.copy(alpha = 0.1f))
                        )
                    )
            )

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = score.merchant,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextPrimary.copy(alpha = 0.85f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (score.churnRisk == ChurnRisk.HIGH) {
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .clip(CircleShape)
                                .background(SignalDanger)
                        )
                    }
                }
                Text(
                    text = "${score.label} · ${formatRub(score.monthlyAmount)}/мес",
                    fontSize = 10.sp,
                    color = TextMuted
                )
            }

            // Gauge
            Box(contentAlignment = Alignment.Center) {
                CircularGauge(
                    value = score.valueScore.toFloat(),
                    color = riskColor,
                    size = 42.dp,
                    lineWidth = 3.dp,
                    isSemi = true
                )
                Text(
                    text = "${score.valueScore.toInt()}",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = riskColor,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            // Risk badge
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(riskColor.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 3.dp)
            ) {
                Text(
                    text = riskLabel,
                    fontSize = 9.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = riskColor
                )
            }
        }
    }
}

private fun formatPeriodLabel(period: String): String {
    val months = listOf("янв","фев","мар","апр","май","июн","июл","авг","сен","окт","ноя","дек")
    val parts = period.split("-")
    if (parts.size < 2) return period
    val second = parts[1]
    if (second.startsWith("W")) {
        val week = second.drop(1).toIntOrNull() ?: return period
        return "Н${week.toString().padStart(2, '0')}"
    }
    val m = second.toIntOrNull() ?: return period
    return if (m in 1..12) months[m - 1] else period
}
