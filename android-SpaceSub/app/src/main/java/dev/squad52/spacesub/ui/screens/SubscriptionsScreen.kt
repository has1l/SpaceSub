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
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.models.DetectedSubscription
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.MetricCard
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.SubscriptionsViewModel
import java.time.ZonedDateTime
import java.time.temporal.ChronoUnit
import kotlin.math.ceil

@Composable
fun SubscriptionsScreen(viewModel: SubscriptionsViewModel) {
    val summary by viewModel.summary.collectAsState()
    val active by viewModel.active.collectAsState()
    val upcoming by viewModel.upcoming.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    SpaceBackground {
        if (isLoading && summary == null) {
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
                            text = "Обнаруженные подписки",
                            style = TextStyle(
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Автоматически обнаруженные повторяющиеся платежи",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }
                }

                // Summary metrics
                if (summary != null) {
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            MetricCard(
                                title = "Активных спутников",
                                value = "${summary!!.activeCount}",
                                accentColor = SignalPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "Скоро списание",
                                value = "${summary!!.upcomingNext7Days.size}",
                                accentColor = SignalWarning,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Upcoming
                if (upcoming.isNotEmpty()) {
                    item {
                        Text(
                            text = "Ближайшие списания",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    items(upcoming, key = { it.id }) { sub ->
                        UpcomingSubCard(sub)
                    }
                }

                // Active
                if (active.isEmpty() && !isLoading) {
                    item { SubsEmptyState() }
                } else if (active.isNotEmpty()) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "Все активные подписки",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "${active.size}",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = SignalPrimary
                            )
                        }
                    }
                    items(active, key = { it.id }) { sub ->
                        DetectedSubCard(sub)
                    }
                }

                if (error != null) {
                    item {
                        SpaceCard(glowColor = SignalDanger) {
                            Text(
                                text = error!!,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = SignalDanger.copy(alpha = 0.8f)
                            )
                        }
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun UpcomingSubCard(sub: DetectedSubscription) {
    val days = daysUntil(sub.nextExpectedCharge)

    SpaceCard(glowColor = SignalWarning) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(SignalWarning)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = sub.merchant,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = if (days == 0) "Сегодня" else "Через $days дн.",
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                color = SignalWarning
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "${sub.amount.toInt()} ₽",
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary
            )
        }
    }
}

@Composable
private fun DetectedSubCard(sub: DetectedSubscription) {
    val days = daysUntil(sub.nextExpectedCharge)
    val isUpcoming = days in 0..7
    val lowConfidence = sub.confidence < 0.65

    SpaceCard(glowColor = if (sub.isActive) SignalPrimary else null) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = sub.merchant,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Text(
                        text = sub.periodType.russianName,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextMuted
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${sub.amount.toInt()} ₽",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                    Text(
                        text = sub.periodType.shortLabel,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextMuted
                    )
                }
            }

            // Badges
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                StatusBadge(
                    text = if (sub.isActive) "На орбите" else "Сошла с орбиты",
                    color = if (sub.isActive) SignalSuccess else TextMuted
                )
                if (isUpcoming) StatusBadge(text = "Скоро списание", color = SignalWarning)
                if (lowConfidence) StatusBadge(text = "Слабый сигнал", color = SignalDanger)
            }

            HorizontalDivider(color = SignalPrimary.copy(alpha = 0.05f))

            SubMetaRow("Последнее списание", formatDate(sub.lastChargeDate))
            SubMetaRow(
                "Следующее",
                formatDate(sub.nextExpectedCharge),
                extra = if (days >= 0) (if (days == 0) "сегодня" else "через $days дн.") else null,
                warn = days in 0..3
            )
            SubMetaRow("Транзакций", "${sub.transactionCount}")
            SubMetaRow("Сила сигнала", "${(sub.confidence * 100).toInt()}%", warn = lowConfidence)
        }
    }
}

@Composable
private fun StatusBadge(text: String, color: Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(text = text, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = color)
    }
}

@Composable
private fun SubMetaRow(label: String, value: String, extra: String? = null, warn: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = TextMuted.copy(alpha = 0.6f)
        )
        Spacer(modifier = Modifier.weight(1f))
        Text(
            text = value + if (extra != null) " ($extra)" else "",
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = if (warn) SignalWarning else TextSecondary
        )
    }
}

@Composable
private fun SubsEmptyState() {
    SpaceCard(glowColor = SignalPrimary) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Подписки ещё не обнаружены",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary.copy(alpha = 0.7f)
            )
            Text(
                text = "Синхронизируйте банк — система обнаружит повторяющиеся платежи",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )
        }
    }
}

private fun daysUntil(dateStr: String?): Int {
    if (dateStr == null) return -1
    return try {
        val target = ZonedDateTime.parse(dateStr)
        val now = ZonedDateTime.now()
        ceil(ChronoUnit.HOURS.between(now, target) / 24.0).toInt()
    } catch (_: Exception) { -1 }
}

private fun formatDate(iso: String?): String {
    if (iso == null) return "—"
    return try {
        val zdt = ZonedDateTime.parse(iso)
        zdt.format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"))
    } catch (_: Exception) { iso.take(10) }
}
