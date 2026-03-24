package dev.squad52.spacesub.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import dev.squad52.spacesub.models.BillingCycle
import dev.squad52.spacesub.models.CreateSubscriptionRequest
import dev.squad52.spacesub.models.DetectedSubscription
import dev.squad52.spacesub.models.Subscription
import dev.squad52.spacesub.ui.components.FullScreenSpinner
import dev.squad52.spacesub.ui.components.MetricCard
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.SubscriptionsViewModel
import java.time.LocalDate
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import kotlin.math.ceil

@Composable
fun SubscriptionsScreen(viewModel: SubscriptionsViewModel) {
    val summary by viewModel.summary.collectAsState()
    val active by viewModel.active.collectAsState()
    val upcoming by viewModel.upcoming.collectAsState()
    val manualSubs by viewModel.manualSubs.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val error by viewModel.error.collectAsState()
    val cancellingId by viewModel.cancellingId.collectAsState()
    val showAddDialog by viewModel.showAddDialog.collectAsState()
    val editingSub by viewModel.editingSub.collectAsState()

    var confirmCancelId by remember { mutableStateOf<String?>(null) }
    var confirmDeleteId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) { viewModel.load() }

    // Cancel detected subscription confirmation dialog
    if (confirmCancelId != null) {
        AlertDialog(
            onDismissRequest = { confirmCancelId = null },
            title = {
                Text(
                    "Отменить подписку?",
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    "Автоплатёж в банке будет отменён. Новых списаний не будет.",
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = confirmCancelId
                        confirmCancelId = null
                        if (id != null) viewModel.cancelSubscription(id)
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SignalDanger)
                ) {
                    Text("Отменить подписку", fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmCancelId = null }) {
                    Text("Назад", color = TextMuted)
                }
            },
            containerColor = SpaceCardBg,
            titleContentColor = TextPrimary,
            textContentColor = TextSecondary
        )
    }

    // Delete manual subscription confirmation dialog
    if (confirmDeleteId != null) {
        AlertDialog(
            onDismissRequest = { confirmDeleteId = null },
            title = {
                Text(
                    "Удалить подписку?",
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary
                )
            },
            text = {
                Text(
                    "Подписка будет удалена без возможности восстановления.",
                    color = TextSecondary
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = confirmDeleteId
                        confirmDeleteId = null
                        if (id != null) viewModel.deleteManual(id)
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SignalDanger)
                ) {
                    Text("Удалить", fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmDeleteId = null }) {
                    Text("Отмена", color = TextMuted)
                }
            },
            containerColor = SpaceCardBg,
            titleContentColor = TextPrimary,
            textContentColor = TextSecondary
        )
    }

    // Add / Edit dialog
    if (showAddDialog) {
        AddEditSubscriptionDialog(
            editingSub = editingSub,
            onDismiss = { viewModel.closeDialog() },
            onSave = { request ->
                val sub = editingSub
                if (sub != null) {
                    viewModel.updateManual(sub.id, request)
                } else {
                    viewModel.createManual(request)
                }
            }
        )
    }

    Scaffold(
        containerColor = Color.Transparent,
        floatingActionButton = {
            FloatingActionButton(
                onClick = { viewModel.openAddDialog() },
                containerColor = SignalPrimary,
                contentColor = SpaceBlack,
                shape = CircleShape
            ) {
                Icon(Icons.Default.Add, contentDescription = "Добавить подписку")
            }
        }
    ) { innerPadding ->
        SpaceBackground {
            if (isLoading && summary == null) {
                FullScreenSpinner()
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp)
                        .padding(innerPadding),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    item { Spacer(modifier = Modifier.height(8.dp)) }

                    // Header
                    item {
                        Column {
                            Text(
                                text = "Подписки",
                                style = TextStyle(
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                                )
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Обнаруженные и ручные подписки",
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
                        items(upcoming, key = { "upcoming_${it.id}" }) { sub ->
                            UpcomingSubCard(sub)
                        }
                    }

                    // Manual subscriptions
                    if (manualSubs.isNotEmpty()) {
                        item {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Ручные подписки",
                                    fontSize = 16.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = TextPrimary
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "${manualSubs.size}",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = SignalSecondary
                                )
                            }
                        }
                        items(manualSubs, key = { "manual_${it.id}" }) { sub ->
                            ManualSubCard(
                                sub = sub,
                                onEdit = { viewModel.openEditDialog(sub) },
                                onDelete = { confirmDeleteId = sub.id }
                            )
                        }
                    }

                    // Active detected
                    if (active.isEmpty() && manualSubs.isEmpty() && !isLoading) {
                        item { SubsEmptyState() }
                    } else if (active.isNotEmpty()) {
                        item {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Обнаруженные подписки",
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
                        items(active, key = { "active_${it.id}" }) { sub ->
                            DetectedSubCard(
                                sub = sub,
                                isCancelling = cancellingId == sub.id,
                                onCancel = { confirmCancelId = sub.id }
                            )
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
private fun DetectedSubCard(
    sub: DetectedSubscription,
    isCancelling: Boolean = false,
    onCancel: () -> Unit = {}
) {
    val days = daysUntil(sub.nextExpectedCharge)
    val isUpcoming = days in 0..7
    val lowConfidence = sub.confidence < 0.65

    SpaceCard(glowColor = if (sub.isActive) SignalPrimary else null) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(modifier = Modifier.fillMaxWidth()) {
                if (sub.logoUrl != null) {
                    AsyncImage(
                        model = sub.logoUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(32.dp)
                            .clip(RoundedCornerShape(6.dp)),
                        contentScale = ContentScale.Fit
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                }
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

            // Cancel button
            if (sub.isActive) {
                HorizontalDivider(color = SignalPrimary.copy(alpha = 0.05f))
                OutlinedButton(
                    onClick = onCancel,
                    enabled = !isCancelling,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    border = BorderStroke(1.dp, SignalDanger.copy(alpha = 0.15f)),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = SignalDanger.copy(alpha = 0.06f),
                        contentColor = SignalDanger.copy(alpha = 0.7f)
                    )
                ) {
                    if (isCancelling) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(14.dp),
                            strokeWidth = 2.dp,
                            color = SignalDanger
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Text(
                        text = if (isCancelling) "Отмена..." else "Отменить подписку",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
private fun ManualSubCard(
    sub: Subscription,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val days = daysUntil(sub.nextBilling)

    SpaceCard(glowColor = if (sub.isActive) SignalSecondary else null) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = sub.name,
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
                        text = "/${sub.periodType.shortLabel}",
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
                if (!sub.category.isNullOrBlank()) {
                    StatusBadge(text = sub.category, color = SignalSecondary)
                }
                if (days in 0..7) {
                    StatusBadge(text = "Скоро списание", color = SignalWarning)
                }
            }

            HorizontalDivider(color = SignalSecondary.copy(alpha = 0.05f))

            SubMetaRow(
                "Следующее списание",
                formatDate(sub.nextBilling),
                extra = if (days >= 0) (if (days == 0) "сегодня" else "через $days дн.") else null,
                warn = days in 0..3
            )

            if (!sub.description.isNullOrBlank()) {
                SubMetaRow("Описание", sub.description)
            }

            HorizontalDivider(color = SignalSecondary.copy(alpha = 0.05f))

            // Edit / Delete buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onEdit) {
                    Icon(
                        imageVector = Icons.Default.Edit,
                        contentDescription = "Редактировать",
                        tint = SignalSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(onClick = onDelete) {
                    Icon(
                        imageVector = Icons.Default.Delete,
                        contentDescription = "Удалить",
                        tint = SignalDanger.copy(alpha = 0.7f),
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AddEditSubscriptionDialog(
    editingSub: Subscription?,
    onDismiss: () -> Unit,
    onSave: (CreateSubscriptionRequest) -> Unit
) {
    val isEdit = editingSub != null

    var name by remember(editingSub) { mutableStateOf(editingSub?.name ?: "") }
    var amount by remember(editingSub) { mutableStateOf(editingSub?.amount?.let { if (it == it.toInt().toDouble()) it.toInt().toString() else it.toString() } ?: "") }
    var selectedCycle by remember(editingSub) { mutableStateOf(editingSub?.periodType ?: BillingCycle.MONTHLY) }
    var nextBilling by remember(editingSub) {
        mutableStateOf(
            editingSub?.nextBilling?.take(10) ?: LocalDate.now().plusMonths(1).format(DateTimeFormatter.ISO_LOCAL_DATE)
        )
    }
    var category by remember(editingSub) { mutableStateOf(editingSub?.category ?: "") }
    var cycleExpanded by remember { mutableStateOf(false) }

    val spaceTextFieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = TextPrimary,
        unfocusedTextColor = TextPrimary,
        cursorColor = SignalPrimary,
        focusedBorderColor = SignalPrimary,
        unfocusedBorderColor = SpaceCardBorder,
        focusedLabelColor = SignalPrimary,
        unfocusedLabelColor = TextMuted,
        focusedContainerColor = SpaceDarkBlue,
        unfocusedContainerColor = SpaceDarkBlue
    )

    val canSave = name.isNotBlank() && amount.toDoubleOrNull() != null && amount.toDouble() > 0

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = if (isEdit) "Редактировать" else "Новый спутник",
                fontWeight = FontWeight.Bold,
                style = TextStyle(
                    brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                )
            )
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Название") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = spaceTextFieldColors
                )

                OutlinedTextField(
                    value = amount,
                    onValueChange = { newVal ->
                        if (newVal.isEmpty() || newVal.matches(Regex("^\\d*\\.?\\d*$"))) {
                            amount = newVal
                        }
                    },
                    label = { Text("Сумма (₽)") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = spaceTextFieldColors
                )

                ExposedDropdownMenuBox(
                    expanded = cycleExpanded,
                    onExpandedChange = { cycleExpanded = it }
                ) {
                    OutlinedTextField(
                        value = selectedCycle.russianName,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Период") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = cycleExpanded) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                        shape = RoundedCornerShape(12.dp),
                        colors = spaceTextFieldColors
                    )
                    ExposedDropdownMenu(
                        expanded = cycleExpanded,
                        onDismissRequest = { cycleExpanded = false },
                        containerColor = SpaceCardBg
                    ) {
                        BillingCycle.entries.forEach { cycle ->
                            DropdownMenuItem(
                                text = { Text(cycle.russianName, color = TextPrimary) },
                                onClick = {
                                    selectedCycle = cycle
                                    cycleExpanded = false
                                }
                            )
                        }
                    }
                }

                OutlinedTextField(
                    value = nextBilling,
                    onValueChange = { newVal ->
                        if (newVal.length <= 10 && newVal.matches(Regex("^[\\d-]*$"))) {
                            nextBilling = newVal
                        }
                    },
                    label = { Text("Следующее списание (ГГГГ-ММ-ДД)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = spaceTextFieldColors
                )

                OutlinedTextField(
                    value = category,
                    onValueChange = { category = it },
                    label = { Text("Категория") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = spaceTextFieldColors
                )
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    val parsedAmount = amount.toDoubleOrNull() ?: return@TextButton
                    val dateStr = "${nextBilling}T00:00:00.000Z"
                    onSave(
                        CreateSubscriptionRequest(
                            name = name.trim(),
                            amount = parsedAmount,
                            billingCycle = selectedCycle,
                            nextBilling = dateStr,
                            category = category.trim().ifBlank { null }
                        )
                    )
                },
                enabled = canSave,
                colors = ButtonDefaults.textButtonColors(
                    contentColor = SignalPrimary,
                    disabledContentColor = TextMuted
                )
            ) {
                Text(
                    text = if (isEdit) "Сохранить" else "Вывести на орбиту",
                    fontWeight = FontWeight.Bold
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Отмена", color = TextMuted)
            }
        },
        containerColor = SpaceCardBg,
        titleContentColor = TextPrimary,
        textContentColor = TextSecondary
    )
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
