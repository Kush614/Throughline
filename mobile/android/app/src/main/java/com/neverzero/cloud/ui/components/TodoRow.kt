package com.neverzero.cloud.ui.components

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.data.Todo
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.BgSunken
import com.neverzero.cloud.ui.theme.Ink
import com.neverzero.cloud.ui.theme.InkSoft
import com.neverzero.cloud.ui.theme.Muted
import com.neverzero.cloud.ui.theme.NeverZeroMono
import com.neverzero.cloud.ui.theme.Rule
import com.neverzero.cloud.ui.theme.RuleStrong

@Composable
fun TodoRow(
    todo: Todo,
    onToggle: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.Top,
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
    ) {
        val checked = todo.done
        Box(
            Modifier
                .size(18.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(if (checked) Ink else Bg)
                .border(1.2.dp, if (checked) Ink else RuleStrong, RoundedCornerShape(4.dp))
                .clickable { onToggle() },
            contentAlignment = Alignment.Center,
        ) {
            if (checked) {
                Icon(Icons.Filled.Check, contentDescription = null, tint = Bg, modifier = Modifier.size(12.dp))
            }
        }
        Spacer(Modifier.width(10.dp))

        Column(Modifier.fillMaxWidth()) {
            Text(
                text = todo.title,
                fontSize = 14.5.sp,
                color = if (checked) Muted else Ink,
                textDecoration = if (checked) TextDecoration.LineThrough else null,
            )

            val actorName = if (todo.isAgent) {
                SampleData.agentById(todo.byId)?.name
            } else {
                SampleData.personById(todo.byId)?.name
            }
            val glyph = if (todo.isAgent) {
                SampleData.agentById(todo.byId)?.glyph
            } else {
                SampleData.personById(todo.byId)?.initials
            }
            val tone = if (todo.isAgent) todo.color else SampleData.personById(todo.byId)?.tone

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(top = 4.dp),
            ) {
                if (actorName != null && glyph != null && tone != null) {
                    AgentAvatar(glyph = glyph, color = tone, isAgent = todo.isAgent, size = 14.dp)
                    Text(actorName.split(' ').first(), fontSize = 11.sp, color = Muted)
                }
                todo.tag?.let {
                    Text(
                        it,
                        fontSize = 10.5.sp,
                        color = Muted,
                        fontFamily = NeverZeroMono,
                        modifier = Modifier
                            .background(BgSunken, RoundedCornerShape(3.dp))
                            .padding(horizontal = 5.dp, vertical = 1.dp),
                    )
                }
                todo.due?.let {
                    Text(
                        it,
                        fontSize = 10.5.sp,
                        color = InkSoft,
                        fontFamily = NeverZeroMono,
                        modifier = Modifier
                            .background(BgSunken, RoundedCornerShape(3.dp))
                            .padding(horizontal = 5.dp, vertical = 1.dp),
                    )
                }
            }

            todo.progress?.let { p ->
                Box(
                    Modifier
                        .padding(top = 8.dp)
                        .width(80.dp)
                        .height(3.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(BgSunken),
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(p / 100f)
                            .height(3.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(todo.color ?: Ink),
                    )
                }
            }
        }
    }
    Box(Modifier.fillMaxWidth().height(1.dp).background(Rule))
}
