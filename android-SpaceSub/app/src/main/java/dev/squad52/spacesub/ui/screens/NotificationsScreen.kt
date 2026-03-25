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
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.R
import dev.squad52.spacesub.models.AppNotification
import dev.squad52.spacesub.models.NotificationSettings
import dev.squad52.spacesub.models.NotificationType
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.NotificationsViewModel
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

@Composable
fun NotificationsScreen(
    viewModel: NotificationsViewModel,
    onBack: () -> Unit
) {
    val notifications by viewModel.notifications.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val settings by viewModel.settings.collectAsState()
    val unread = notifications.count { !it.isRead }

    LaunchedEffect(Unit) {
        viewModel.load()
        viewModel.loadSettings()
    }

    SpaceBackground {
        if (isLoading && notifications.isEmpty()) {
            FullScreenSpinner()
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Spacer(modifier = Modifier.height(8.dp)) }

                // Header
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.ic_arrow_back),
                            contentDescription = "Назад",
                            modifier = Modifier
                                .size(22.dp)
                                .clickable(onClick = onBack),
                            tint = TextSecondary
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Уведомления",
                                style = TextStyle(
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                                )
                            )
                        }
                        if (unread > 0) {
                            Text(
                                text = "Прочитать все",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = SignalPrimary,
                                modifier = Modifier.clickable { viewModel.markAllRead() }
                            )
                        }
                    }
                }

                if (notifications.isEmpty()) {
                    item {
                        SpaceCard {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = "Нет уведомлений",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = TextSecondary
                                )
                            }
                        }
                    }
                }

                items(notifications, key = { it.id }) { notification ->
                    NotificationCard(
                        notification = notification,
                        onClick = {
                            if (!notification.isRead) viewModel.markRead(notification.id)
                        }
                    )
                }

                // Settings section
                if (settings != null) {
                    item {
                        NotifSettingsSection(
                            settings = settings!!,
                            onEmailToggle = { viewModel.updateEmailNotifications(it) },
                            onDaysChange = { viewModel.updateDaysBefore(it) }
                        )
                    }
                }

                item { Spacer(modifier = Modifier.height(80.dp)) }
            }
        }
    }
}

@Composable
private fun NotificationCard(notification: AppNotification, onClick: () -> Unit) {
    val typeColor = when (notification.type) {
        NotificationType.BILLING_REMINDER -> SignalPrimary
        NotificationType.PRICE_CHANGE -> SignalWarning
        NotificationType.NEW_TRANSACTION -> SignalSecondary
        NotificationType.SYSTEM -> TextMuted
    }

    SpaceCard(
        glowColor = if (!notification.isRead) typeColor else null,
        modifier = Modifier.clickable(onClick = onClick)
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(if (!notification.isRead) typeColor else Color.Transparent)
                    .align(Alignment.Top)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = notification.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = if (!notification.isRead) TextPrimary else TextSecondary
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = notification.message,
                    fontSize = 12.sp,
                    color = TextMuted
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = formatTime(notification.createdAt),
                fontSize = 10.sp,
                color = TextMuted
            )
        }
    }
}

private fun formatTime(iso: String): String {
    return try {
        val zdt = ZonedDateTime.parse(iso)
        zdt.format(DateTimeFormatter.ofPattern("dd.MM HH:mm"))
    } catch (_: Exception) { "" }
}

@Composable
private fun NotifSettingsSection(
    settings: NotificationSettings,
    onEmailToggle: (Boolean) -> Unit,
    onDaysChange: (Int) -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        // Section header
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Настройки",
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextMuted
            )
        }

        SpaceCard {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Email toggle row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Email-уведомления",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary
                        )
                        Text(
                            text = "Отправлять на почту при новых списаниях",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                    Switch(
                        checked = settings.emailNotifications,
                        onCheckedChange = onEmailToggle,
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = SpaceBlack,
                            checkedTrackColor = SignalPrimary,
                            uncheckedThumbColor = TextMuted,
                            uncheckedTrackColor = SpaceCardBg
                        )
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))
                Divider(color = TextMuted.copy(alpha = 0.1f))
                Spacer(modifier = Modifier.height(4.dp))

                // Days before row
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Напоминать за",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextPrimary
                        )
                        Text(
                            text = "Дней до списания",
                            fontSize = 11.sp,
                            color = TextMuted
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(
                                    if (settings.daysBefore > 1) SignalPrimary.copy(alpha = 0.15f)
                                    else TextMuted.copy(alpha = 0.05f)
                                )
                                .clickable(enabled = settings.daysBefore > 1) {
                                    onDaysChange(settings.daysBefore - 1)
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "−",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (settings.daysBefore > 1) SignalPrimary else TextMuted.copy(alpha = 0.3f)
                            )
                        }
                        Text(
                            text = "${settings.daysBefore} дн",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = SignalPrimary,
                            modifier = Modifier.padding(horizontal = 12.dp)
                        )
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .clip(CircleShape)
                                .background(
                                    if (settings.daysBefore < 7) SignalPrimary.copy(alpha = 0.15f)
                                    else TextMuted.copy(alpha = 0.05f)
                                )
                                .clickable(enabled = settings.daysBefore < 7) {
                                    onDaysChange(settings.daysBefore + 1)
                                },
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "+",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (settings.daysBefore < 7) SignalPrimary else TextMuted.copy(alpha = 0.3f)
                            )
                        }
                    }
                }
            }
        }
    }
}
