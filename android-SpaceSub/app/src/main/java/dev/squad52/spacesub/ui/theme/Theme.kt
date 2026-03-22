package dev.squad52.spacesub.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val SpaceColorScheme = darkColorScheme(
    primary = SignalPrimary,
    secondary = SignalSecondary,
    tertiary = SignalAccent,
    background = SpaceBlack,
    surface = SpaceCardBg,
    surfaceVariant = SpaceDarkBlue,
    error = SignalDanger,
    onPrimary = Color.White,
    onSecondary = Color.White,
    onTertiary = Color.Black,
    onBackground = TextPrimary,
    onSurface = TextPrimary,
    onSurfaceVariant = TextSecondary,
    onError = Color.White,
    outline = SpaceCardBorder,
)

@Composable
fun SpaceSubTheme(content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = SpaceBlack.toArgb()
            window.navigationBarColor = SpaceBlack.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = false
                isAppearanceLightNavigationBars = false
            }
        }
    }

    MaterialTheme(
        colorScheme = SpaceColorScheme,
        typography = SpaceTypography,
        content = content
    )
}
