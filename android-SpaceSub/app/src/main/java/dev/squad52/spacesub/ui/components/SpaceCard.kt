package dev.squad52.spacesub.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import dev.squad52.spacesub.ui.theme.SpaceCardBg
import dev.squad52.spacesub.ui.theme.SpaceCardBorder

@Composable
fun SpaceCard(
    modifier: Modifier = Modifier,
    glowColor: Color? = null,
    cornerRadius: Dp = 16.dp,
    padding: Dp = 16.dp,
    content: @Composable BoxScope.() -> Unit
) {
    val shape = RoundedCornerShape(cornerRadius)
    val borderColor = glowColor?.copy(alpha = 0.3f) ?: SpaceCardBorder

    Box(
        modifier = modifier
            .clip(shape)
            .background(SpaceCardBg)
            .border(1.dp, borderColor, shape)
            .padding(padding),
        content = content
    )
}
