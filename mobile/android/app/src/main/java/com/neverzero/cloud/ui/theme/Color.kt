package com.neverzero.cloud.ui.theme

import androidx.compose.ui.graphics.Color

// Background & surface tones (mirrors --bg, --bg-soft, --bg-sunken in CSS)
val Bg        = Color(0xFFFFFFFF)
val BgSoft    = Color(0xFFFAF9F5)
val BgSunken  = Color(0xFFF3F2EC)

// Ink ladder
val Ink       = Color(0xFF0A0A09)
val InkSoft   = Color(0xFF2A2A26)
val Muted     = Color(0xFF7A7975)
val Faint     = Color(0xFFB5B3AD)
val Whisper   = Color(0xFFD8D6D0)

// Hairlines
val Rule        = Color(0xFFECECEA)
val RuleStrong  = Color(0xFFD8D6D0)

// Live-pulse green (oklch(0.62 0.12 150) sRGB approximation)
val LiveGreen = Color(0xFF63A574)

// Agent identity colors — low-chroma, identical luminance per design.
// oklch(0.55 0.075 <hue>) → sRGB
val AgentIris  = Color(0xFF6F5CA7)  // violet  · hue 285
val AgentForge = Color(0xFFA86A4F)  // clay    · hue 35
val AgentAtlas = Color(0xFF4E7E8A)  // teal    · hue 200
val AgentLoop  = Color(0xFF7A7B47)  // olive   · hue 95
val AgentBeam  = Color(0xFFA45A82)  // rose    · hue 340
