package com.neverzero.cloud.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.BgSunken
import com.neverzero.cloud.ui.theme.InkSoft

/**
 * Two-mode avatar. Agents get a dashed ring in their identity color. People get a
 * filled circle in their tone color. Mirrors `.av` / `.av[data-agent=1]` in the
 * web prototype.
 */
@Composable
fun AgentAvatar(
    glyph: String,
    color: Color,
    isAgent: Boolean,
    modifier: Modifier = Modifier,
    size: Dp = 26.dp,
) {
    val ring = Modifier
        .size(size)
        .clip(CircleShape)
        .then(
            if (isAgent) {
                Modifier
                    .background(Bg)
                    .drawBehind {
                        drawCircle(
                            color = color,
                            style = Stroke(
                                width = 1.4.dp.toPx(),
                                pathEffect = PathEffect.dashPathEffect(
                                    floatArrayOf(3.dp.toPx(), 2.dp.toPx()),
                                    0f,
                                ),
                            ),
                        )
                    }
            } else {
                Modifier.background(if (color == Color.Unspecified) BgSunken else color)
            }
        )

    Box(modifier = modifier.then(ring), contentAlignment = Alignment.Center) {
        Text(
            text = glyph,
            color = if (isAgent) color else Bg.takeIf { color != BgSunken } ?: InkSoft,
            fontSize = (size.value * 0.42f).sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
