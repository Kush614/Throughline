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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.data.Agent
import com.neverzero.cloud.data.AgentState
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.ui.components.AgentAvatar
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
import com.neverzero.cloud.ui.theme.RuleStrong

@Composable
fun TodayScreen(onOpenAgent: (String) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .background(Bg),
    ) {
        AppHeader(subtitle = "Today")

        // Greeting block
        Column(Modifier.padding(horizontal = 18.dp, vertical = 14.dp)) {
            Text(
                "Tue · 12:04 · Acme Robotics",
                fontSize = 11.sp, color = Muted, fontFamily = NeverZeroMono,
                modifier = Modifier.padding(bottom = 6.dp),
            )
            Text(
                buildAnnotatedString {
                    append("Good afternoon, Sam. ")
                    withStyle(SpanStyle(color = Ink, fontWeight = FontWeight.SemiBold)) {
                        append("Iris is mid-research")
                    }
                    append(" and Forge just opened PR #284. 4 things shipped while you were away.")
                },
                fontSize = 16.sp, color = InkSoft,
            )
            Row(
                modifier = Modifier
                    .padding(top = 14.dp)
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(BgSoft)
                    .border(1.dp, Rule, RoundedCornerShape(10.dp))
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                StatCell("2", "working")
                StatCell("7/12", "plan done")
                StatCell("18", "decisions")
                StatCell("14s", "last sync")
            }
        }

        // Handoff banner
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .padding(horizontal = 18.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(BgSoft)
                .border(1.dp, Rule, RoundedCornerShape(10.dp))
                .padding(12.dp),
        ) {
            Box(
                Modifier
                    .size(28.dp)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Bg)
                    .border(1.dp, RuleStrong, RoundedCornerShape(6.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text("⟿", color = InkSoft, fontSize = 14.sp)
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "Continued from your laptop",
                    color = Ink, fontWeight = FontWeight.Medium, fontSize = 13.sp,
                )
                Text(
                    "You left off in Section 03 · Iris's research block",
                    color = Muted, fontSize = 12.sp,
                )
            }
            Text("14s", color = Muted, fontSize = 11.sp, fontFamily = NeverZeroMono)
        }

        Spacer(Modifier.height(18.dp))

        SectionHeader(left = "Live now", right = "2 agents")
        SampleData.agents.filter { it.state == AgentState.Working }.forEach { a ->
            LiveAgentCard(agent = a, onOpenAgent = { onOpenAgent(a.id) })
        }

        Spacer(Modifier.height(8.dp))
        SectionHeader(left = "Due today · 3", right = "Plan")
        Column(Modifier.padding(horizontal = 18.dp)) {
            SampleData.todos.filter { !it.done }.take(3).forEach { TodoRow(it) }
        }

        Spacer(Modifier.height(12.dp))
        SectionHeader(left = "Pinned memory", right = "3 items")
        Column(
            Modifier
                .padding(horizontal = 18.dp, vertical = 4.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(BgSoft)
                .border(1.dp, Rule, RoundedCornerShape(10.dp))
                .padding(14.dp),
        ) {
            Text(
                "DECISION · MAY 12",
                fontSize = 9.5.sp, color = Faint, fontFamily = NeverZeroMono,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                SampleData.memory.first().text,
                color = InkSoft, fontSize = 13.5.sp,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "pinned by Sam · referenced by 4 agents",
                color = Muted, fontSize = 11.sp, fontFamily = NeverZeroMono,
            )
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun AppHeader(subtitle: String) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .background(Bg)
            .padding(horizontal = 18.dp, vertical = 14.dp),
    ) {
        // Brand logo box
        Box(
            Modifier
                .size(22.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(Ink),
            contentAlignment = Alignment.Center,
        ) {
            Text("+", color = Bg, fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text("Acme · Atlas", fontSize = 10.5.sp, color = Muted, fontFamily = NeverZeroMono)
            Text(subtitle, fontSize = 16.sp, color = Ink, fontWeight = FontWeight.SemiBold)
        }
        Row(horizontalArrangement = Arrangement.spacedBy((-6).dp)) {
            SampleData.people.filter { it.online }.take(2).forEach { p ->
                Box(
                    Modifier
                        .size(22.dp)
                        .clip(CircleShape)
                        .background(p.tone)
                        .border(2.dp, Bg, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(p.initials, color = Bg, fontSize = 9.sp, fontWeight = FontWeight.SemiBold)
                }
            }
            SampleData.agents.filter { it.state == AgentState.Working }.forEach { a ->
                AgentAvatar(glyph = a.glyph, color = a.color, isAgent = true, size = 22.dp)
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(1.dp).background(Rule))
}

@Composable
private fun StatCell(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, fontSize = 18.sp, color = Ink, fontWeight = FontWeight.SemiBold)
        Text(label, fontSize = 10.5.sp, color = Muted, fontFamily = NeverZeroMono)
    }
}

@Composable
fun SectionHeader(left: String, right: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(left, fontSize = 11.sp, color = InkSoft, fontWeight = FontWeight.SemiBold, fontFamily = NeverZeroMono, letterSpacing = 1.sp)
        Text(right, fontSize = 11.sp, color = Faint, fontFamily = NeverZeroMono)
    }
}

@Composable
fun LiveAgentCard(agent: Agent, onOpenAgent: () -> Unit) {
    Column(
        Modifier
            .padding(horizontal = 18.dp, vertical = 8.dp)
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Bg)
            .border(1.dp, Rule, RoundedCornerShape(12.dp)),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(12.dp),
        ) {
            AgentAvatar(agent.glyph, agent.color, isAgent = true, size = 28.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(agent.name, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                Text("${agent.role} · ${agent.provider}", fontSize = 11.sp, color = Muted, fontFamily = NeverZeroMono)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(6.dp).clip(CircleShape).background(LiveGreen))
                Spacer(Modifier.width(5.dp))
                Text(
                    if (agent.id == "iris") "live · 0:42" else agent.statusShort,
                    fontSize = 11.sp, color = agent.color, fontWeight = FontWeight.Medium,
                )
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(Rule))
        Column(Modifier.padding(12.dp)) {
            Text(
                agent.currentTask,
                fontSize = 13.sp, color = InkSoft,
            )
            if (agent.id == "iris") {
                Spacer(Modifier.height(8.dp))
                Box(
                    Modifier
                        .fillMaxWidth()
                        .background(BgSoft, RoundedCornerShape(6.dp))
                        .border(0.dp, Color.Transparent, RoundedCornerShape(6.dp))
                        .padding(10.dp),
                ) {
                    Column {
                        Text(
                            "“Drop-off at step 3 in 7 of 12 apps — the consent screen.”",
                            fontSize = 12.5.sp, color = InkSoft,
                        )
                        Text(
                            "Iris · synthesizing 12 sources",
                            fontSize = 10.sp, color = Muted, fontFamily = NeverZeroMono,
                            modifier = Modifier.padding(top = 4.dp),
                        )
                    }
                }
            }
        }
        Row(
            Modifier
                .fillMaxWidth()
                .background(BgSoft)
                .padding(8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            PillButton(label = "Open", primary = false, onClick = onOpenAgent)
            PillButton(label = "Hand off →", primary = true, onClick = {})
            Spacer(Modifier.weight(1f))
        }
    }
}

@Composable
private fun PillButton(label: String, primary: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (primary) Ink else BgSunken)
            .border(1.dp, if (primary) Ink else Rule, RoundedCornerShape(6.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (primary) Bg else InkSoft,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}
