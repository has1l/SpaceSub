package dev.squad52.spacesub.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import dev.squad52.spacesub.ui.theme.SpaceBlack
import dev.squad52.spacesub.ui.theme.SpaceDarkBlue
import kotlin.random.Random

@Composable
fun SpaceBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val stars = remember {
        List(80) {
            Triple(
                Random.nextFloat(),
                Random.nextFloat(),
                Random.nextFloat() * 1.5f + 0.5f
            )
        }
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(SpaceBlack, SpaceDarkBlue, SpaceBlack)
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            stars.forEach { (x, y, radius) ->
                drawCircle(
                    color = Color.White.copy(alpha = Random.nextFloat() * 0.4f + 0.1f),
                    radius = radius,
                    center = Offset(x * size.width, y * size.height)
                )
            }
        }
        content()
    }
}
