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
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.models.TimelineEntry
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.MetricCard
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.ForecastViewModel
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun ForecastScreen(viewModel: ForecastViewModel) {
    val forecast by viewModel.forecast.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    SpaceBackground {
        if (isLoading && forecast == null) {
            FullScreenSpinner()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                item {
                    Column {
                        Text(
                            text = "Прогноз",
                            style = TextStyle(
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                            )
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Траектория расходов",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextSecondary
                        )
                    }
                }

                if (forecast != null) {
                    // Metric cards
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            MetricCard(
                                title = "7 дней",
                                value = "${forecast!!.next7DaysTotal.toInt()} ₽",
                                accentColor = SignalPrimary,
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "30 дней",
                                value = "${forecast!!.next30DaysTotal.toInt()} ₽",
                                accentColor = SignalSecondary,
                                modifier = Modifier.weight(1f)
                            )
                            MetricCard(
                                title = "12 мес",
                                value = "${forecast!!.next12MonthsTotal.toInt()} ₽",
                                accentColor = SignalAccent,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }

                    // Timeline
                    if (forecast!!.upcomingTimeline.isNotEmpty()) {
                        item {
                            Text(
                                text = "Хронология списаний",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextPrimary
                            )
                        }

                        itemsIndexed(
                            forecast!!.upcomingTimeline,
                            key = { i, entry -> "${entry.merchant}_${entry.chargeDate}_$i" }
                        ) { index, entry ->
                            TimelineItem(
                                entry = entry,
                                isLast = index == forecast!!.upcomingTimeline.lastIndex
                            )
                        }
                    } else {
                        item {
                            SpaceCard(glowColor = SignalPrimary) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 20.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = "Нет предстоящих списаний",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Medium,
                                        color = TextSecondary
                                    )
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

@Composable
private fun TimelineItem(entry: TimelineEntry, isLast: Boolean) {
    Row(modifier = Modifier.fillMaxWidth()) {
        // Timeline line + dot
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.width(24.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(SignalPrimary)
            )
            if (!isLast) {
                Box(
                    modifier = Modifier
                        .width(2.dp)
                        .height(60.dp)
                        .background(SignalPrimary.copy(alpha = 0.15f))
                )
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        SpaceCard(modifier = Modifier.weight(1f)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = entry.merchant,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimary
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = entry.periodType.russianName,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextMuted
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = formatDateRussian(entry.chargeDate),
                        fontSize = 11.sp,
                        color = TextSecondary
                    )
                }
                Text(
                    text = "${entry.amount.toInt()} ₽",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = SignalPrimary
                )
            }
        }
    }
}

private fun formatDateRussian(iso: String): String {
    return try {
        val zdt = ZonedDateTime.parse(iso)
        zdt.format(DateTimeFormatter.ofPattern("d MMMM yyyy", Locale("ru")))
    } catch (_: Exception) { iso.take(10) }
}
