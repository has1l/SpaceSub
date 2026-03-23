package dev.squad52.spacesub.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.R
import dev.squad52.spacesub.models.BankConnection
import dev.squad52.spacesub.models.BankConnectionStatus
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.GlowButton
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.DashboardViewModel
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onLogout: () -> Unit,
    onConnect: () -> Unit,
    onNotifications: () -> Unit
) {
    val connections by viewModel.connections.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val isSyncing by viewModel.isSyncing.collectAsState()
    val syncResult by viewModel.syncResult.collectAsState()
    val error by viewModel.error.collectAsState()
    val unreadCount by viewModel.unreadCount.collectAsState()

    LaunchedEffect(Unit) { viewModel.load() }

    SpaceBackground {
        if (isLoading && connections.isEmpty()) {
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
                    DashboardHeader(
                        onLogout = onLogout,
                        onNotifications = onNotifications,
                        unreadCount = unreadCount
                    )
                }

                // Sync result banner
                if (syncResult != null) {
                    item {
                        SpaceCard(glowColor = if (syncResult!!.contains("Ошибка")) SignalDanger else SignalSecondary) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(
                                    text = syncResult!!,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = if (syncResult!!.contains("Ошибка")) SignalDanger else SignalSecondary,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "×",
                                    fontSize = 16.sp,
                                    color = TextMuted,
                                    modifier = Modifier.clickable { viewModel.dismissSyncResult() }
                                )
                            }
                        }
                    }
                }

                // Connect button
                item {
                    GlowButton(
                        text = "Подключить спутник",
                        onClick = onConnect,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                // Bank connections or empty state
                if (connections.isEmpty()) {
                    item { EmptyDashboard(onConnect = onConnect) }
                } else {
                    item {
                        Text(
                            text = "Банковские связи",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )
                    }
                    items(connections, key = { it.id }) { conn ->
                        BankConnectionCard(
                            connection = conn,
                            isSyncing = isSyncing,
                            onSync = { viewModel.syncBank() }
                        )
                    }
                }

                // Error
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
private fun DashboardHeader(
    onLogout: () -> Unit,
    onNotifications: () -> Unit,
    unreadCount: Int
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "SPACESUB",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = SignalPrimary.copy(alpha = 0.5f),
                letterSpacing = 2.sp
            )
            Text(
                text = "Центр управления",
                style = TextStyle(
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                )
            )
            Text(
                text = "Управляйте банковскими спутниками",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = TextSecondary
            )
        }

        // Bell icon
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(SignalPrimary.copy(alpha = 0.06f))
                .clickable(onClick = onNotifications),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_bell),
                contentDescription = "Уведомления",
                modifier = Modifier.size(18.dp),
                tint = if (unreadCount > 0) SignalPrimary else TextMuted
            )
            if (unreadCount > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(14.dp)
                        .clip(CircleShape)
                        .background(SignalDanger),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "$unreadCount",
                        fontSize = 8.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(8.dp))

        // Logout
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(SignalPrimary.copy(alpha = 0.06f))
                .clickable(onClick = onLogout),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_logout),
                contentDescription = "Выйти",
                modifier = Modifier.size(18.dp),
                tint = TextMuted
            )
        }
    }
}

@Composable
private fun EmptyDashboard(onConnect: () -> Unit) {
    SpaceCard(glowColor = SignalPrimary) {
        Column(
            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Нет подключённых спутников",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextSecondary.copy(alpha = 0.7f)
            )
            Text(
                text = "Подключите банк, чтобы начать мониторинг подписок",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )
            GlowButton(text = "Подключить Flex Bank", onClick = onConnect)
        }
    }
}

@Composable
private fun BankConnectionCard(
    connection: BankConnection,
    isSyncing: Boolean,
    onSync: () -> Unit
) {
    val statusLabel = when (connection.status) {
        BankConnectionStatus.CONNECTED -> "На орбите"
        BankConnectionStatus.EXPIRED -> "Сигнал потерян"
        BankConnectionStatus.ERROR -> "Авария"
        BankConnectionStatus.DISCONNECTED -> "Отключён"
    }
    val statusColor = when (connection.status) {
        BankConnectionStatus.CONNECTED -> SignalSuccess
        BankConnectionStatus.EXPIRED -> SignalWarning
        BankConnectionStatus.ERROR -> SignalDanger
        BankConnectionStatus.DISCONNECTED -> TextMuted
    }

    SpaceCard(glowColor = if (connection.status == BankConnectionStatus.CONNECTED) SignalPrimary else null) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = connection.provider,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(4.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = statusLabel,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = statusColor
                    )
                }
            }

            if (connection.lastSyncAt != null) {
                MetaRow("Последняя синхронизация", formatDate(connection.lastSyncAt))
            }
            MetaRow("Подключён", formatDate(connection.createdAt))

            HorizontalDivider(color = SignalPrimary.copy(alpha = 0.05f))

            GlowButton(
                text = if (isSyncing) "Синхронизация..." else "Синхронизировать",
                onClick = onSync,
                enabled = !isSyncing,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun MetaRow(label: String, value: String) {
    Row(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = TextMuted.copy(alpha = 0.6f)
        )
        Spacer(modifier = Modifier.weight(1f))
        Text(
            text = value,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            color = TextSecondary
        )
    }
}

private fun formatDate(iso: String): String {
    return try {
        val zdt = ZonedDateTime.parse(iso)
        zdt.format(DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"))
    } catch (_: Exception) {
        iso.take(10)
    }
}
