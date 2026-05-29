package com.neverzero.cloud.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColors = lightColorScheme(
    primary = Ink,
    onPrimary = Bg,
    secondary = InkSoft,
    onSecondary = Bg,
    background = Bg,
    onBackground = Ink,
    surface = Bg,
    onSurface = Ink,
    surfaceVariant = BgSoft,
    onSurfaceVariant = InkSoft,
    outline = Rule,
    outlineVariant = RuleStrong,
)

@Composable
fun NeverZeroTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = NeverZeroTypography,
        content = content,
    )
}
