package com.neverzero.cloud.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Article
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Today
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.neverzero.cloud.ui.theme.Bg
import com.neverzero.cloud.ui.theme.Ink
import com.neverzero.cloud.ui.theme.Muted
import com.neverzero.cloud.ui.theme.Rule

enum class Tab(val label: String, val icon: ImageVector) {
    Today("Today", Icons.Filled.Today),
    Doc("Doc", Icons.Filled.Article),
    Agents("Agents", Icons.Filled.Groups),
    Activity("Activity", Icons.Filled.Bolt),
}

@Composable
fun BottomNav(
    current: Tab,
    onSelect: (Tab) -> Unit,
    onCompose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .fillMaxWidth()
            .background(Bg)
            .border(width = 1.dp, color = Rule, shape = androidx.compose.foundation.shape.RoundedCornerShape(0.dp)),
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceAround,
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .padding(horizontal = 4.dp),
        ) {
            NavSlot(Tab.Today, current, onSelect)
            NavSlot(Tab.Doc, current, onSelect)
            // Center FAB
            Box(
                Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(Ink)
                    .clickable { onCompose() },
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Add, contentDescription = "Compose", tint = Bg)
            }
            NavSlot(Tab.Agents, current, onSelect)
            NavSlot(Tab.Activity, current, onSelect)
        }
    }
}

@Composable
private fun NavSlot(tab: Tab, current: Tab, onSelect: (Tab) -> Unit) {
    val active = tab == current
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable { onSelect(tab) }
            .padding(horizontal = 8.dp, vertical = 6.dp),
    ) {
        Icon(
            tab.icon,
            contentDescription = tab.label,
            tint = if (active) Ink else Muted,
            modifier = Modifier.size(22.dp),
        )
        Text(
            tab.label,
            fontSize = 10.sp,
            color = if (active) Ink else Muted,
        )
    }
}
