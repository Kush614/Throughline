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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
fun ComposeSheet(onDismiss: () -> Unit) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var text by remember { mutableStateOf("") }
    var assignedTo by remember { mutableStateOf("atlas") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Bg) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(18.dp),
        ) {
            Text(
                "COMPOSE",
                fontSize = 10.sp, color = Faint, fontFamily = NeverZeroMono,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(4.dp))
            Text("New thought", fontSize = 22.sp, color = Ink, fontWeight = FontWeight.SemiBold)

            Spacer(Modifier.height(16.dp))

            // Input box
            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(BgSoft)
                    .border(1.dp, Rule, RoundedCornerShape(10.dp))
                    .padding(14.dp),
            ) {
                if (text.isEmpty()) {
                    Text(
                        "Ask, plan, or invoke a skill…",
                        color = Muted, fontSize = 14.sp,
                    )
                }
                BasicTextField(
                    value = text,
                    onValueChange = { text = it },
                    textStyle = TextStyle(color = Ink, fontSize = 14.sp),
                    modifier = Modifier.fillMaxWidth().height(96.dp),
                )
            }

            Spacer(Modifier.height(18.dp))

            // Assign to chips
            Text(
                "ASSIGN TO",
                fontSize = 10.sp, color = Faint, fontFamily = NeverZeroMono,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                SampleData.agents.forEach { a ->
                    val selected = assignedTo == a.id
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(if (selected) BgSunken else Bg)
                            .border(1.dp, if (selected) Ink else Rule, RoundedCornerShape(999.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                    ) {
                        AgentAvatar(a.glyph, a.color, isAgent = true, size = 18.dp)
                        Spacer(Modifier.width(6.dp))
                        Text(a.name, fontSize = 12.sp, color = Ink, fontWeight = FontWeight.Medium)
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                "SKILLS",
                fontSize = 10.sp, color = Faint, fontFamily = NeverZeroMono,
                letterSpacing = 1.sp,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(8.dp))
            // 2-column skills grid
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                SampleData.skills.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { skill ->
                            Column(
                                Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(BgSoft)
                                    .border(1.dp, Rule, RoundedCornerShape(10.dp))
                                    .padding(10.dp),
                            ) {
                                Text("/${skill.name}", fontSize = 13.sp, color = Ink, fontFamily = NeverZeroMono, fontWeight = FontWeight.Medium)
                                Text(skill.desc, fontSize = 11.sp, color = Muted)
                                Spacer(Modifier.height(2.dp))
                                Text(skill.by, fontSize = 10.sp, color = Faint, fontFamily = NeverZeroMono)
                            }
                        }
                        if (row.size == 1) Box(Modifier.weight(1f))
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            Box(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(Ink)
                    .padding(vertical = 14.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text("Send to ${SampleData.agentById(assignedTo)?.name ?: "Atlas"} →", color = Bg, fontWeight = FontWeight.Medium, fontSize = 14.sp)
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}
