package com.neverzero.cloud.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.data.ActivityEvent
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.BgSunken
import com.neverzero.cloud.ui.theme.Ink
import com.neverzero.cloud.ui.theme.InkSoft
import com.neverzero.cloud.ui.theme.Muted
import com.neverzero.cloud.ui.theme.NeverZeroMono
import com.neverzero.cloud.ui.theme.Rule

@Composable
fun ActivityRow(event: ActivityEvent, modifier: Modifier = Modifier) {
    val agent = SampleData.agentById(event.actor)
    val person = SampleData.personById(event.actor)
    val isAgent = agent != null
    val glyph = agent?.glyph ?: person?.initials ?: "?"
    val name = agent?.name ?: person?.name ?: "Unknown"
    val color = agent?.color ?: person?.tone ?: Muted

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 10.dp),
    ) {
        AgentAvatar(glyph = glyph, color = color, isAgent = isAgent, size = 22.dp)
        Spacer(Modifier.width(10.dp))
        Column(Modifier.fillMaxWidth()) {
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(color = Ink, fontWeight = FontWeight.Medium)) {
                        append(name)
                    }
                    append(' ')
                    withStyle(SpanStyle(color = InkSoft)) { append(event.verb) }
                    event.target?.let {
                        append(' ')
                        withStyle(
                            SpanStyle(
                                color = InkSoft,
                                fontFamily = NeverZeroMono,
                            ),
                        ) {
                            append(it)
                        }
                    }
                    event.note?.let {
                        withStyle(SpanStyle(color = Muted)) { append(" · $it") }
                    }
                },
                fontSize = 12.5.sp,
            )
            Text(
                event.whenLabel,
                fontSize = 10.5.sp,
                color = Muted,
                fontFamily = NeverZeroMono,
                modifier = Modifier.padding(top = 2.dp),
            )
            event.preview?.let { preview ->
                Box(
                    Modifier
                        .padding(top = 6.dp)
                        .fillMaxWidth()
                        .background(Bg, RoundedCornerShape(4.dp))
                        .border(1.dp, Rule, RoundedCornerShape(4.dp))
                        .padding(horizontal = 10.dp, vertical = 8.dp),
                ) {
                    Text(preview, fontSize = 12.sp, color = InkSoft)
                }
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(1.dp).background(Rule))
}
