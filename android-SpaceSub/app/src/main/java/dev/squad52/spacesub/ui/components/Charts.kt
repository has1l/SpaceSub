package dev.squad52.spacesub.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin
import kotlin.math.sqrt

// ─── Donut Chart ───

data class DonutSegment(
    val value: Float,
    val color: Color,
    val label: String
)

@Composable
fun DonutChart(
    segments: List<DonutSegment>,
    modifier: Modifier = Modifier,
    selectedIndex: Int? = null,
    onSegmentTap: (Int?) -> Unit = {},
    centerContent: @Composable () -> Unit = {}
) {
    val animProgress = remember { Animatable(0f) }
    LaunchedEffect(segments) {
        animProgress.snapTo(0f)
        animProgress.animateTo(1f, tween(800))
    }

    val total = segments.sumOf { it.value.toDouble() }.toFloat()
    if (total == 0f) return

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        Canvas(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(segments) {
                    detectTapGestures { offset ->
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val dx = offset.x - center.x
                        val dy = offset.y - center.y
                        val dist = sqrt(dx * dx + dy * dy)
                        val outerR = min(size.width, size.height) / 2f
                        val innerR = outerR * 0.6f

                        if (dist < innerR || dist > outerR) {
                            onSegmentTap(null)
                            return@detectTapGestures
                        }

                        var angle = Math.toDegrees(atan2(dy.toDouble(), dx.toDouble())).toFloat()
                        angle = (angle + 90f) % 360f
                        if (angle < 0f) angle += 360f

                        var cumulative = 0f
                        for ((i, seg) in segments.withIndex()) {
                            val sweep = seg.value / total * 360f
                            if (angle in cumulative..(cumulative + sweep)) {
                                onSegmentTap(if (selectedIndex == i) null else i)
                                return@detectTapGestures
                            }
                            cumulative += sweep
                        }
                    }
                }
        ) {
            val stroke = size.minDimension * 0.18f
            val diameter = size.minDimension - stroke
            val topLeft = Offset(
                (size.width - diameter) / 2f,
                (size.height - diameter) / 2f
            )
            val arcSize = Size(diameter, diameter)
            val gap = 3f

            var startAngle = -90f
            for ((i, seg) in segments.withIndex()) {
                val sweep = (seg.value / total * 360f - gap).coerceAtLeast(0f) * animProgress.value
                val alpha = if (selectedIndex == null || selectedIndex == i) 1f else 0.2f

                drawArc(
                    color = seg.color.copy(alpha = alpha),
                    startAngle = startAngle,
                    sweepAngle = sweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round)
                )

                // Glow on selected
                if (selectedIndex == i) {
                    drawArc(
                        color = seg.color.copy(alpha = 0.15f),
                        startAngle = startAngle,
                        sweepAngle = sweep,
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(width = stroke + 8f, cap = StrokeCap.Round)
                    )
                }

                startAngle += seg.value / total * 360f
            }
        }
        centerContent()
    }
}

// ─── Area Sparkline Chart ───

@Composable
fun AreaSparkline(
    data: List<Float>,
    color: Color,
    modifier: Modifier = Modifier
) {
    if (data.size < 2) return

    val animProgress = remember { Animatable(0f) }
    LaunchedEffect(data) {
        animProgress.snapTo(0f)
        animProgress.animateTo(1f, tween(900))
    }

    Canvas(modifier = modifier) {
        val maxVal = data.max()
        val minVal = data.min()
        val range = if (maxVal - minVal > 0f) maxVal - minVal else 1f
        val padY = 4f

        val points = data.mapIndexed { i, v ->
            val x = i.toFloat() / (data.size - 1) * size.width * animProgress.value
            val y = size.height - padY - ((v - minVal) / range) * (size.height - padY * 2)
            Offset(x, y)
        }

        // Filled gradient area
        val fillPath = Path().apply {
            moveTo(points.first().x, size.height)
            points.forEach { lineTo(it.x, it.y) }
            lineTo(points.last().x, size.height)
            close()
        }
        drawPath(
            fillPath,
            Brush.verticalGradient(
                listOf(color.copy(alpha = 0.25f), color.copy(alpha = 0.0f))
            )
        )

        // Line
        val linePath = Path().apply {
            points.forEachIndexed { i, p ->
                if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y)
            }
        }
        drawPath(linePath, color, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round))

        // End dot
        if (animProgress.value > 0.9f) {
            val last = points.last()
            drawCircle(color, 4.dp.toPx(), last)
            drawCircle(color.copy(alpha = 0.3f), 8.dp.toPx(), last)
        }
    }
}

// ─── Horizontal Bar Chart ───

data class BarItem(
    val label: String,
    val value: Float,
    val color: Color
)

@Composable
fun HorizontalBarSegment(
    fraction: Float,
    color: Color,
    modifier: Modifier = Modifier
) {
    val animProgress = remember { Animatable(0f) }
    LaunchedEffect(fraction) {
        animProgress.snapTo(0f)
        animProgress.animateTo(fraction, spring(stiffness = Spring.StiffnessLow))
    }

    Canvas(modifier = modifier.height(4.dp)) {
        // Track
        drawRoundRect(
            color = Color.White.copy(alpha = 0.04f),
            size = Size(size.width, size.height),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )
        // Fill
        drawRoundRect(
            brush = Brush.horizontalGradient(
                listOf(color.copy(alpha = 0.5f), color)
            ),
            size = Size(size.width * animProgress.value, size.height),
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(2f, 2f)
        )
    }
}

// ─── Circular Gauge ───

@Composable
fun CircularGauge(
    value: Float,
    color: Color,
    modifier: Modifier = Modifier,
    size: Dp = 42.dp,
    lineWidth: Dp = 3.dp,
    isSemi: Boolean = false
) {
    val animValue = remember { Animatable(0f) }
    LaunchedEffect(value) {
        animValue.animateTo(value.coerceIn(0f, 100f), tween(800))
    }

    Canvas(modifier = modifier.size(size)) {
        val strokeW = lineWidth.toPx()
        val pad = strokeW / 2
        val arcSize = Size(this.size.width - strokeW, this.size.height - strokeW)
        val topLeft = Offset(pad, pad)

        if (isSemi) {
            // Background arc (bottom half = 180 degrees)
            drawArc(
                color = Color.White.copy(alpha = 0.04f),
                startAngle = 180f,
                sweepAngle = 180f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeW, cap = StrokeCap.Round)
            )
            // Value arc
            drawArc(
                color = color,
                startAngle = 180f,
                sweepAngle = animValue.value / 100f * 180f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeW, cap = StrokeCap.Round)
            )
        } else {
            // Full circle background
            drawArc(
                color = Color.White.copy(alpha = 0.04f),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeW, cap = StrokeCap.Round)
            )
            // Value arc
            drawArc(
                color = color,
                startAngle = -90f,
                sweepAngle = animValue.value / 100f * 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeW, cap = StrokeCap.Round)
            )
        }

        // Glow
        val glowAngle = if (isSemi) {
            180f + animValue.value / 100f * 180f
        } else {
            -90f + animValue.value / 100f * 360f
        }
        val rad = Math.toRadians(glowAngle.toDouble())
        val cx = this.size.width / 2f
        val cy = this.size.height / 2f
        val r = (this.size.width - strokeW) / 2f
        val px = cx + r * cos(rad).toFloat()
        val py = cy + r * sin(rad).toFloat()
        drawCircle(
            color = color.copy(alpha = 0.4f),
            radius = strokeW * 2f,
            center = Offset(px, py)
        )
    }
}

// ─── Trend Sparkline (mini) ───

@Composable
fun TrendSparkline(
    data: List<Float>,
    color: Color,
    modifier: Modifier = Modifier
) {
    if (data.size < 2) return

    val animProgress = remember { Animatable(0f) }
    LaunchedEffect(data) {
        animProgress.snapTo(0f)
        animProgress.animateTo(1f, tween(700))
    }

    Canvas(modifier = modifier) {
        val maxVal = data.max()
        val minVal = data.min()
        val range = if (maxVal - minVal > 0f) maxVal - minVal else 1f

        val points = data.takeLast(6).mapIndexed { i, v ->
            val x = i.toFloat() / (minOf(data.size, 6) - 1) * size.width * animProgress.value
            val y = size.height - ((v - minVal) / range) * (size.height - 4f) - 2f
            Offset(x, y)
        }

        val path = Path().apply {
            points.forEachIndexed { i, p ->
                if (i == 0) moveTo(p.x, p.y) else lineTo(p.x, p.y)
            }
        }
        drawPath(path, color, style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round))

        // End dot
        if (animProgress.value > 0.9f && points.isNotEmpty()) {
            val last = points.last()
            drawCircle(color, 2.5.dp.toPx(), last)
            drawCircle(color.copy(alpha = 0.4f), 5.dp.toPx(), last)
        }
    }
}
