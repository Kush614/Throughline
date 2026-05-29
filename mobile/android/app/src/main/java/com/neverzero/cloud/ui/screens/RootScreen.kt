package com.neverzero.cloud.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.weight
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.systemBars
import com.neverzero.cloud.ui.components.BottomNav
import com.neverzero.cloud.ui.components.Tab
import com.neverzero.cloud.ui.theme.Bg

@Composable
fun RootScreen() {
    var current by remember { mutableStateOf(Tab.Today) }
    var composeOpen by remember { mutableStateOf(false) }
    var selectedAgentId by remember { mutableStateOf<String?>(null) }

    val insets = WindowInsets.systemBars.asPaddingValues()
    val ld = LocalLayoutDirection.current

    Column(
        Modifier
            .fillMaxSize()
            .background(Bg)
            .padding(
                top = insets.calculateTopPadding(),
                start = insets.calculateStartPadding(ld),
                end = insets.calculateEndPadding(ld),
            ),
    ) {
        Column(Modifier.weight(1f)) {
            when (current) {
                Tab.Today -> TodayScreen(onOpenAgent = { selectedAgentId = it })
                Tab.Doc -> DocScreen(onOpenAgent = { selectedAgentId = it })
                Tab.Agents -> AgentsScreen(onOpenAgent = { selectedAgentId = it })
                Tab.Activity -> ActivityScreen()
            }
        }
        BottomNav(
            current = current,
            onSelect = { current = it },
            onCompose = { composeOpen = true },
            modifier = Modifier.padding(bottom = insets.calculateBottomPadding()),
        )
    }

    if (composeOpen) {
        ComposeSheet(onDismiss = { composeOpen = false })
    }
    selectedAgentId?.let { id ->
        AgentDetailSheet(agentId = id, onDismiss = { selectedAgentId = null })
    }
}
