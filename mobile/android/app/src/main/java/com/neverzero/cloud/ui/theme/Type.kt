package com.neverzero.cloud.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// The web design uses Geist + Geist Mono. We fall back to the system sans /
// monospace so the app stays self-contained — drop Geist fonts in res/font/
// later and reference them here if you want pixel-parity with the web.
val NeverZeroSans: FontFamily = FontFamily.SansSerif
val NeverZeroMono: FontFamily = FontFamily.Monospace

val NeverZeroTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.SemiBold,
        fontSize = 38.sp, lineHeight = 42.sp, letterSpacing = (-0.5).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.SemiBold,
        fontSize = 24.sp, lineHeight = 28.sp, letterSpacing = (-0.3).sp,
    ),
    titleLarge = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp, lineHeight = 24.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.Medium,
        fontSize = 16.sp, lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.Normal,
        fontSize = 15.sp, lineHeight = 22.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.Normal,
        fontSize = 14.sp, lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = NeverZeroSans, fontWeight = FontWeight.Normal,
        fontSize = 12.sp, lineHeight = 16.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = NeverZeroMono, fontWeight = FontWeight.Medium,
        fontSize = 10.sp, lineHeight = 12.sp, letterSpacing = 0.8.sp,
    ),
)
