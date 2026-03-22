package dev.squad52.spacesub.ui.screens

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.ui.components.GlowButton
import dev.squad52.spacesub.ui.components.SpaceBackground
import dev.squad52.spacesub.ui.theme.SignalPrimary
import dev.squad52.spacesub.ui.theme.SignalSecondary
import dev.squad52.spacesub.ui.theme.TextSecondary

@Composable
fun LoginScreen(onLogin: () -> Unit) {
    var showContent by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) { showContent = true }

    val scale by animateFloatAsState(
        targetValue = if (showContent) 1f else 0.8f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = 300f),
        label = "scale"
    )
    val alpha by animateFloatAsState(
        targetValue = if (showContent) 1f else 0f,
        animationSpec = spring(stiffness = 200f),
        label = "alpha"
    )

    SpaceBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Spacer(modifier = Modifier.weight(1f))

            // Logo area
            Box(
                modifier = Modifier
                    .scale(scale)
                    .alpha(alpha),
                contentAlignment = Alignment.Center
            ) {
                // Orbit rings would go here - simplified to text logo
                Text(
                    text = "S",
                    style = TextStyle(
                        fontSize = 64.sp,
                        fontWeight = FontWeight.Bold,
                        brush = Brush.horizontalGradient(
                            listOf(SignalPrimary, SignalSecondary)
                        )
                    )
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            Text(
                text = "SpaceSub",
                style = TextStyle(
                    fontSize = 34.sp,
                    fontWeight = FontWeight.Bold,
                    brush = Brush.horizontalGradient(
                        listOf(SignalPrimary, SignalSecondary)
                    )
                ),
                modifier = Modifier.alpha(alpha)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = "Центр управления подписками",
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = TextSecondary,
                modifier = Modifier.alpha(alpha)
            )

            Spacer(modifier = Modifier.weight(1f))

            GlowButton(
                text = "Войти через Яндекс",
                onClick = onLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .alpha(alpha)
            )

            Spacer(modifier = Modifier.height(60.dp))
        }
    }
}
