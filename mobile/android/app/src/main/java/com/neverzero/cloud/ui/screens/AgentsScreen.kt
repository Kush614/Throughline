package com.neverzero.cloud.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.data.AgentState
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.ui.components.AgentAvatar
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.BgSoft
import com.neverzero.cloud.ui.theme.Ink
import com.neverzero.cloud.ui.theme.InkSoft
import com.neverzero.cloud.ui.theme.LiveGreen
import com.neverzero.cloud.ui.theme.Muted
import com.neverzero.cloud.ui.theme.NeverZeroMono
import com.neverzero.cloud.ui.theme.Rule
import com.neverzero.cloud.ui.theme.RuleStrong

@Composable
fun AgentsScreen(onOpenAgent: (String) -> Unit) {
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .background(Bg),
    ) {
        AppHeader(subtitle = "Agents")

        SectionHeader(
            left = "On this project · ${SampleData.agents.size}",
            right = "${SampleData.agents.count { it.state == AgentState.Working }} working",
        )

        Column(Modifier.padding(horizontal = 18.dp)) {
            SampleData.agents.forEach { a ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenAgent(a.id) }
                        .padding(vertical = 12.dp),
                ) {
                    AgentAvatar(a.glyph, a.color, isAgent = true, size = 34.dp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(a.name, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, color = Ink)
                        Text(
                            "${a.role} · ${a.provider}",
                            fontSize = 12.sp, color = Muted, fontFamily = NeverZeroMono,
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        if (a.state == AgentState.Working) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.size(6.dp).clip(CircleShape).background(LiveGreen))
                                Spacer(Modifier.width(5.dp))
                                Text(a.statusShort, fontSize = 11.sp, color = a.color, fontWeight = FontWeight.Medium)
                            }
                        } else {
                            Text("idle", fontSize = 11.sp, color = Muted)
                            Text(a.lastSeen, fontSize = 10.sp, color = Muted, fontFamily = NeverZeroMono)
                        }
                    }
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(Rule))
            }
        }

        Spacer(Modifier.height(12.dp))

        SectionHeader(left = "Workspace agents", right = "+12 available")
        Text(
            "Bring in more agents from your Acme workspace — billing scopes to the project.",
            fontSize = 12.5.sp, color = Muted,
            modifier = Modifier.padding(horizontal = 18.dp),
        )

        Box(
            Modifier
                .padding(horizontal = 18.dp, vertical = 12.dp)
                .fillMaxWidth()
                .clip(RoundedCornerShape(10.dp))
                .background(Bg)
                .border(1.dp, RuleStrong, RoundedCornerShape(10.dp))
                .padding(12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                "+ Invite an agent",
                fontSize = 13.sp, color = InkSoft, fontWeight = FontWeight.Medium,
            )
        }

        Spacer(Modifier.height(20.dp))
    }
}
