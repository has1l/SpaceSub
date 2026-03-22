package dev.squad52.spacesub.ui.components

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import dev.squad52.spacesub.ui.theme.SignalPrimary
import dev.squad52.spacesub.ui.theme.TextMuted

@Composable
fun MetricCard(
    title: String,
    value: String,
    accentColor: Color = SignalPrimary,
    modifier: Modifier = Modifier
) {
    SpaceCard(
        modifier = modifier.fillMaxWidth(),
        glowColor = accentColor
    ) {
        Column {
            Text(
                text = title,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = value,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = accentColor
            )
        }
    }
}
