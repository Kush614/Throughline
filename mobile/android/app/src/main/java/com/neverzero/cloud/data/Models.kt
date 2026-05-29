package com.neverzero.cloud.data

import androidx.compose.ui.graphics.Color

enum class AgentState { Working, Idle }

data class Agent(
    val id: String,
    val name: String,
    val glyph: String,
    val role: String,
    val color: Color,
    val provider: String,
    val model: String,
    val state: AgentState,
    val statusShort: String,
    val currentTask: String,
    val tokensPerHr: String,
    val costDay: String,
    val skills: List<String>,
    val memoryRead: String,
    val memoryWrite: String,
    val lastSeen: String,
)

data class Person(
    val id: String,
    val name: String,
    val initials: String,
    val role: String,
    val tone: Color,
    val online: Boolean,
)

enum class SkillGroup { Plan, Research, Build, Review, Memory }

data class Skill(
    val name: String,
    val group: SkillGroup,
    val desc: String,
    val by: String,
)

data class ActivityEvent(
    val actor: String,
    val verb: String,
    val target: String? = null,
    val live: Boolean,
    val whenLabel: String,
    val note: String? = null,
    val preview: String? = null,
)

data class MemoryPin(
    val text: String,
    val source: String,
    val whenLabel: String,
)

data class Todo(
    val id: Int,
    val title: String,
    val done: Boolean = false,
    val byId: String,
    val isAgent: Boolean = false,
    val color: Color? = null,
    val tag: String? = null,
    val due: String? = null,
    val progress: Int? = null,
)
