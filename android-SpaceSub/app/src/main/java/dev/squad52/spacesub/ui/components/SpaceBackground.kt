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

private data class Star(val x: Float, val y: Float, val radius: Float, val alpha: Float)

@Composable
fun SpaceBackground(
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    val stars = remember {
        List(40) {
            Star(
                x = Random.nextFloat(),
                y = Random.nextFloat(),
                radius = Random.nextFloat() * 1.2f + 0.4f,
                alpha = Random.nextFloat() * 0.3f + 0.1f
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
            stars.forEach { star ->
                drawCircle(
                    color = Color.White.copy(alpha = star.alpha),
                    radius = star.radius,
                    center = Offset(star.x * size.width, star.y * size.height)
                )
            }
        }
        content()
    }
}
