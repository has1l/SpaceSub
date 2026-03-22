package dev.squad52.spacesub.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.models.*
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.MetricCard
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.AnalyticsViewModel

@Composable
fun AnalyticsScreen(viewModel: AnalyticsViewModel) {
    val overview by viewModel.overview.collectAsState()
    val categories by viewModel.categories.collectAsState()
    val services by viewModel.services.collectAsState()
    val scores by viewModel.scores.collectAsState()
    val recommendations by viewModel.recommendations.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    SpaceBackground {
        if (isLoading && overview == null) {
            FullScreenSpinner()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                // Header
                item {
                    Column {
                        Text(
                            text = "Аналитика",
                            style = TextStyle(
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                            )
                        )
                        Text(
                            text = "Допамин-банкинг",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }
                }

                // Overview metrics
                if (overview != null) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            MetricCard(
                                title = "MRR",
                                value = "${overview!!.mrr.toInt()} ₽",
                                accentColor = SignalPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "ARR",
                                value = "${overview!!.arr.toInt()} ₽",
                                accentColor = SignalSecondary,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            MetricCard(
                                title = "Активных",
                                value = "${overview!!.activeCount}",
                                accentColor = SignalSuccess,
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "Скоро",
                                value = "${overview!!.upcomingCount}",
                                accentColor = SignalWarning,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Trend
                    item {
                        SpaceCard {
                            Column {
                                Text(
                                    text = "Тренд расходов",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text("Текущий месяц", fontSize = 10.sp, color = TextMuted)
                                        Text(
                                            "${overview!!.trend.currentMonth.toInt()} ₽",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = SignalPrimary
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("Прошлый месяц", fontSize = 10.sp, color = TextMuted)
                                        Text(
                                            "${overview!!.trend.prevMonth.toInt()} ₽",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextSecondary
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.height(6.dp))
                                val pct = overview!!.trend.changePct
                                val pctColor = if (pct <= 0) SignalSuccess else SignalDanger
                                Text(
                                    text = "${if (pct > 0) "+" else ""}${String.format("%.1f", pct)}%",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = pctColor
                                )
                            }
                        }
                    }
                }

                // Categories
                if (categories.isNotEmpty()) {
                    item {
                        Text(
                            text = "По категориям",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    items(categories) { cat ->
                        CategoryRow(cat)
                    }
                }

                // Services
                if (services.isNotEmpty()) {
                    item {
                        Text(
                            text = "По сервисам",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    items(services) { svc ->
                        SpaceCard {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = svc.merchant,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = TextPrimary
                                    )
                                    Text(
                                        text = svc.category,
                                        fontSize = 10.sp,
                                        color = TextMuted
                                    )
                                }
                                Text(
                                    text = "${svc.monthlyAmount.toInt()} ₽/мес",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SignalPrimary
                                )
                            }
                        }
                    }
                }

                // Scores
                if (scores.isNotEmpty()) {
                    item {
                        Text(
                            text = "Оценка подписок",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    items(scores) { score ->
                        ScoreCard(score)
                    }
                }

                // Recommendations
                if (recommendations.isNotEmpty()) {
                    item {
                        Text(
                            text = "Рекомендации",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    items(recommendations) { reco ->
                        RecommendationCard(reco)
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun CategoryRow(cat: CategoryItem) {
    val color = try {
        Color(android.graphics.Color.parseColor(cat.color))
    } catch (_: Exception) { SignalPrimary }

    SpaceCard {
        Column {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(color)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = cat.category,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "${cat.total.toInt()} ₽",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = color
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "${cat.percent.toInt()}%",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextMuted
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
            LinearProgressIndicator(
                progress = { (cat.percent.toFloat() / 100f).coerceIn(0f, 1f) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .clip(RoundedCornerShape(2.dp)),
                color = color,
                trackColor = color.copy(alpha = 0.1f),
                strokeCap = StrokeCap.Round
            )
        }
    }
}

@Composable
private fun ScoreCard(score: ScoreItem) {
    val riskColor = when (score.churnRisk) {
        ChurnRisk.LOW -> SignalSuccess
        ChurnRisk.MEDIUM -> SignalWarning
        ChurnRisk.HIGH -> SignalDanger
    }

    SpaceCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = score.merchant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = score.label,
                    fontSize = 10.sp,
                    color = TextMuted
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = "${(score.valueScore * 100).toInt()}%",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = riskColor
                )
                Text(
                    text = "${score.monthlyAmount.toInt()} ₽/мес",
                    fontSize = 10.sp,
                    color = TextSecondary
                )
            }
        }
    }
}

@Composable
private fun RecommendationCard(reco: RecommendationItem) {
    val prioColor = when (reco.priority) {
        RecoPriority.HIGH -> SignalDanger
        RecoPriority.MEDIUM -> SignalWarning
        RecoPriority.LOW -> SignalPrimary
    }
    val typeLabel = when (reco.type) {
        RecoType.CANCEL -> "Отменить"
        RecoType.REVIEW -> "Пересмотреть"
        RecoType.DOWNGRADE -> "Понизить план"
        RecoType.CONSOLIDATE -> "Объединить"
    }

    SpaceCard(glowColor = prioColor) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(prioColor.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = typeLabel,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = prioColor
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = reco.merchant,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "-${reco.potentialSavings.toInt()} ₽",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = SignalSuccess
                )
            }
            Text(
                text = reco.reason,
                fontSize = 12.sp,
                color = TextMuted
            )
        }
    }
}
