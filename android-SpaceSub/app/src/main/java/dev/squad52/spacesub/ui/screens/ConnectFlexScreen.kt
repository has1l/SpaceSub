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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.ui.components.GlowButton
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.components.SpaceCard
import dev.squad52.spacesub.ui.theme.*
import dev.squad52.spacesub.viewmodels.ConnectFlexViewModel

@Composable
fun ConnectFlexScreen(
    viewModel: ConnectFlexViewModel,
    onNavigateToDashboard: () -> Unit
) {
    val code by viewModel.code.collectAsState()
    val isCodeLoading by viewModel.isCodeLoading.collectAsState()
    val isOAuthLoading by viewModel.isOAuthLoading.collectAsState()
    val success by viewModel.success.collectAsState()
    val error by viewModel.error.collectAsState()
    val context = LocalContext.current

    SpaceBackground {
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
                        text = "Подключить Flex Bank",
                        style = TextStyle(
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Bold,
                            brush = Brush.horizontalGradient(listOf(SignalPrimary, SignalSecondary))
                        )
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Свяжите банковский спутник со SpaceSub",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = TextSecondary
                    )
                }
            }

            // Error
            if (error != null) {
                item {
                    SpaceCard(glowColor = SignalDanger) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(SignalDanger)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Text(
                                text = error!!,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Medium,
                                color = SignalDanger.copy(alpha = 0.8f)
                            )
                        }
                    }
                }
            }

            // Success
            if (success) {
                item {
                    SpaceCard(glowColor = SignalPrimary) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(SignalPrimary)
                            )
                            Spacer(modifier = Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = "Flex Bank успешно подключён!",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SignalPrimary
                                )
                                Text(
                                    text = "Перейти к панели управления →",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = SignalPrimary.copy(alpha = 0.7f),
                                    modifier = Modifier.padding(top = 2.dp)
                                )
                            }
                        }
                    }
                }
            }

            // Method 1: Code
            item {
                SpaceCard(glowColor = SignalPrimary) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(SignalPrimary.copy(alpha = 0.08f))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "СПОСОБ 01",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = SignalPrimary,
                                letterSpacing = 2.sp
                            )
                        }

                        Text(
                            text = "Код подключения",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )

                        Text(
                            text = "Сгенерируйте код в Flex Bank и введите его здесь. Код действует 5 минут.",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextMuted
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            OutlinedTextField(
                                value = code,
                                onValueChange = { viewModel.updateCode(it) },
                                placeholder = {
                                    Text(
                                        text = "FB-XXXXXX",
                                        color = TextMuted,
                                        letterSpacing = 3.sp
                                    )
                                },
                                textStyle = TextStyle(
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    letterSpacing = 3.sp,
                                    textAlign = TextAlign.Center,
                                    color = TextPrimary
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = SignalPrimary,
                                    unfocusedBorderColor = SignalPrimary.copy(alpha = 0.12f),
                                    cursorColor = SignalPrimary,
                                    focusedContainerColor = SpaceDarkBlue,
                                    unfocusedContainerColor = SpaceDarkBlue
                                ),
                                shape = RoundedCornerShape(12.dp),
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )

                            GlowButton(
                                text = if (isCodeLoading) "..." else "OK",
                                onClick = { viewModel.connectByCode() },
                                enabled = !isCodeLoading && viewModel.isCodeValid
                            )
                        }
                    }
                }
            }

            // Divider
            item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(1.dp)
                            .background(SignalPrimary.copy(alpha = 0.06f))
                    )
                    Text(
                        text = "ИЛИ",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextMuted.copy(alpha = 0.3f),
                        letterSpacing = 2.sp,
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(1.dp)
                            .background(SignalPrimary.copy(alpha = 0.06f))
                    )
                }
            }

            // Method 2: OAuth
            item {
                SpaceCard {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(SignalSecondary.copy(alpha = 0.08f))
                                .padding(horizontal = 8.dp, vertical = 3.dp)
                        ) {
                            Text(
                                text = "СПОСОБ 02",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = SignalSecondary,
                                letterSpacing = 2.sp
                            )
                        }

                        Text(
                            text = "Через Яндекс",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = TextPrimary
                        )

                        Text(
                            text = "Авторизуйтесь через Яндекс для автоматического подключения",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium,
                            color = TextMuted,
                            textAlign = TextAlign.Center
                        )

                        GlowButton(
                            text = if (isOAuthLoading) "Перенаправление..." else "Подключить через Яндекс",
                            onClick = { viewModel.startOAuth(context) },
                            enabled = !isOAuthLoading,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(80.dp)) }
        }
    }
}
