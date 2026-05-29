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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.data.AgentState
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.ui.components.AgentAvatar
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.BgSoft
import com.neverzero.cloud.ui.theme.BgSunken
import com.neverzero.cloud.ui.theme.Faint
import com.neverzero.cloud.ui.theme.Ink
import com.neverzero.cloud.ui.theme.InkSoft
import com.neverzero.cloud.ui.theme.Muted
import com.neverzero.cloud.ui.theme.NeverZeroMono
import com.neverzero.cloud.ui.theme.Rule

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AgentDetailSheet(agentId: String, onDismiss: () -> Unit) {
    val agent = SampleData.agentById(agentId) ?: return
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Bg) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                AgentAvatar(agent.glyph, agent.color, isAgent = true, size = 44.dp)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(agent.name, fontSize = 22.sp, color = Ink, fontWeight = FontWeight.SemiBold)
                    Text("${agent.role} · ${agent.provider}", fontSize = 12.sp, color = Muted, fontFamily = NeverZeroMono)
                }
                if (agent.state == AgentState.Working) {
                    Text("working", color = agent.color, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                } else {
                    Text("idle · ${agent.lastSeen}", color = Muted, fontSize = 11.sp)
                }
            }

            Spacer(Modifier.height(18.dp))

            // 2x2 metric grid
            Column(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .border(1.dp, Rule, RoundedCornerShape(10.dp)),
            ) {
                Row {
                    MetricCell("PROVIDER", agent.provider, Modifier.weight(1f))
                    Box(Modifier.width(1.dp).background(Rule))
                    MetricCell("MODEL", agent.model, Modifier.weight(1f))
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(Rule))
                Row {
                    MetricCell("TOKENS / HR", agent.tokensPerHr, Modifier.weight(1f))
                    Box(Modifier.width(1.dp).background(Rule))
                    MetricCell("COST / DAY", "$${agent.costDay}", Modifier.weight(1f))
                }
            }

            if (agent.state == AgentState.Working) {
                Spacer(Modifier.height(16.dp))
                Text("CURRENTLY", fontSize = 10.sp, color = Faint, letterSpacing = 1.sp, fontFamily = NeverZeroMono, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                Text(agent.currentTask, fontSize = 14.sp, color = InkSoft)
            }

            Spacer(Modifier.height(16.dp))
            Text("SKILLS GRANTED", fontSize = 10.sp, color = Faint, letterSpacing = 1.sp, fontFamily = NeverZeroMono, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                agent.skills.take(4).forEach { s ->
                    Text(
                        "/$s",
                        fontSize = 11.sp, color = InkSoft, fontFamily = NeverZeroMono,
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(BgSunken)
                            .border(1.dp, Rule, RoundedCornerShape(999.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            Text("MEMORY ACCESS", fontSize = 10.sp, color = Faint, letterSpacing = 1.sp, fontFamily = NeverZeroMono, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(6.dp))
            Text("Read · ${agent.memoryRead}", color = InkSoft, fontSize = 13.sp)
            Text("Write · ${agent.memoryWrite}", color = InkSoft, fontSize = 13.sp)

            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun MetricCell(label: String, value: String, modifier: Modifier = Modifier) {
    Column(modifier.padding(12.dp)) {
        Text(label, fontSize = 10.sp, color = Muted, letterSpacing = 1.sp, fontFamily = NeverZeroMono, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(2.dp))
        Text(value, fontSize = 13.sp, color = InkSoft, fontFamily = NeverZeroMono)
    }
}
