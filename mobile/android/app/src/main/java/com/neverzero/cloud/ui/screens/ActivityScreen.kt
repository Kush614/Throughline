package com.neverzero.cloud.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.neverzero.cloud.data.SampleData
import com.neverzero.cloud.ui.components.ActivityRow
import com.neverzero.cloud.ui.theme.Bg

@Composable
fun ActivityScreen() {
    Column(
        Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .background(Bg),
    ) {
        AppHeader(subtitle = "Activity")

        val live = SampleData.events.filter { it.live }
        val earlier = SampleData.events.filter { !it.live }

        SectionHeader(left = "Live", right = "${live.size} now")
        Column(Modifier.padding(horizontal = 18.dp)) {
            live.forEach { ActivityRow(it) }
        }

        Spacer(Modifier.height(12.dp))

        SectionHeader(left = "Earlier today", right = "${earlier.size}")
        Column(Modifier.padding(horizontal = 18.dp)) {
            earlier.forEach { ActivityRow(it) }
        }

        Spacer(Modifier.height(20.dp))
    }
}
