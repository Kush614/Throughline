package com.neverzero.cloud.ui.screens

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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.ui.components.TodoRow
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.BgSoft
import com.neverzero.cloud.ui.theme.BgSunken
import com.neverzero.cloud.ui.theme.Faint
import com.neverzero.cloud.ui.theme.Ink
import com.neverzero.cloud.ui.theme.InkSoft
import com.neverzero.cloud.ui.theme.LiveGreen
import com.neverzero.cloud.ui.theme.Muted
import com.neverzero.cloud.ui.theme.NeverZeroMono
import com.neverzero.cloud.ui.theme.Rule

@Composable
fun DocScreen(onOpenAgent: (String) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .background(Bg),
    ) {
        AppHeader(subtitle = "Q3 Launch plan")

        Column(Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(LiveGreen))
                Spacer(Modifier.width(6.dp))
                Text("live", color = LiveGreen, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                Spacer(Modifier.width(8.dp))
                Text("·", color = Muted, fontSize = 11.sp)
                Spacer(Modifier.width(8.dp))
                Text("Updated 14s ago", color = Muted, fontSize = 11.sp, fontFamily = NeverZeroMono)
            }
            Spacer(Modifier.height(8.dp))
            Text("Atlas — Q3 Launch", fontSize = 26.sp, fontWeight = FontWeight.SemiBold, color = Ink)
            Spacer(Modifier.height(4.dp))
            Text(
                "Shared layer for AI-native work. Beta Jun 6 · Public Jul 14.",
                fontSize = 13.sp, color = Muted,
            )

            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                StatPill("Plan", "7/12", false, Modifier.weight(1f))
                StatPill("Agents", "2 working", true, Modifier.weight(1f))
                StatPill("Decisions", "18", false, Modifier.weight(1f))
                StatPill("Ship", "Jul 14", false, Modifier.weight(1f))
            }
        }

        SectionHeader(left = "02 · Plan", right = "${SampleData.todos.count { it.done }}/${SampleData.todos.size}")
        Column(Modifier.padding(horizontal = 18.dp)) {
            SampleData.todos.forEach { TodoRow(it) }
        }

        Spacer(Modifier.height(16.dp))

        SectionHeader(left = "06 · Skills here", right = "5 ready")
        Row(
            modifier = Modifier
                .padding(horizontal = 18.dp, vertical = 4.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            listOf(
                "/research" to "ZeroEntropy",
                "/scaffold" to "GStack",
                "/review" to "The Hog",
                "/deploy" to "Lightsprint",
            ).forEach { (name, by) ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(Bg)
                        .border(1.dp, Rule, RoundedCornerShape(999.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Text(name, fontSize = 11.sp, color = InkSoft, fontFamily = NeverZeroMono)
                    Spacer(Modifier.width(4.dp))
                    Text(by, fontSize = 9.sp, color = Faint)
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun StatPill(label: String, value: String, live: Boolean, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(8.dp))
            .background(BgSoft)
            .border(1.dp, Rule, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Text(label, fontSize = 9.5.sp, color = Muted, fontFamily = NeverZeroMono)
        Spacer(Modifier.height(2.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (live) {
                Box(Modifier.size(5.dp).clip(CircleShape).background(LiveGreen))
                Spacer(Modifier.width(5.dp))
            }
            Text(value, fontSize = 13.sp, color = Ink, fontWeight = FontWeight.SemiBold)
        }
    }
}
