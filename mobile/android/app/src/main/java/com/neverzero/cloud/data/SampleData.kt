package com.neverzero.cloud.data

import androidx.compose.ui.graphics.Color
import com.neverzero.cloud.ui.theme.AgentAtlas
import com.neverzero.cloud.ui.theme.AgentBeam
import com.neverzero.cloud.ui.theme.AgentForge
import com.neverzero.cloud.ui.theme.AgentIris
import com.neverzero.cloud.ui.theme.AgentLoop

/** Static seed data — mirrors the data.jsx fixtures from the web prototype. */
object SampleData {

    val agents: List<Agent> = listOf(
        Agent(
            id = "iris", name = "Iris", glyph = "IR", role = "research-agent",
            color = AgentIris, provider = "ZeroEntropy", model = "ze-retriever-2",
            state = AgentState.Working, statusShort = "reading 12 docs",
            currentTask = "Comparing onboarding patterns across 12 SaaS workspaces. " +
                "Surfacing 3 contradictions in our spec.",
            tokensPerHr = "14.2K", costDay = "0.42",
            skills = listOf("research", "cite", "summarize", "crawl"),
            memoryRead = "project + workspace",
            memoryWrite = "project notes only",
            lastSeen = "",
        ),
        Agent(
            id = "forge", name = "Forge", glyph = "FG", role = "build-agent",
            color = AgentForge, provider = "GStack", model = "gs-coder-7b",
            state = AgentState.Working, statusShort = "PR #284",
            currentTask = "Wiring the onboarding flow against the new auth provider. " +
                "14 files touched, 2 tests pending.",
            tokensPerHr = "38.6K", costDay = "1.20",
            skills = listOf("scaffold", "refactor", "test", "deploy", "lint"),
            memoryRead = "codebase + project",
            memoryWrite = "PR drafts, branch notes",
            lastSeen = "",
        ),
        Agent(
            id = "atlas", name = "Atlas", glyph = "AT", role = "planning-agent",
            color = AgentAtlas, provider = "GBrain", model = "gb-planner-l",
            state = AgentState.Idle, statusShort = "", lastSeen = "4m",
            currentTask = "", tokensPerHr = "2.1K", costDay = "0.08",
            skills = listOf("plan", "decompose", "schedule", "estimate"),
            memoryRead = "project + decisions",
            memoryWrite = "plans, todos",
        ),
        Agent(
            id = "loop", name = "Loop", glyph = "LP", role = "review-agent",
            color = AgentLoop, provider = "The Hog", model = "hog-judge-3",
            state = AgentState.Idle, statusShort = "", lastSeen = "12m",
            currentTask = "", tokensPerHr = "5.4K", costDay = "0.18",
            skills = listOf("review", "critique", "factcheck", "redteam"),
            memoryRead = "all reads",
            memoryWrite = "review notes",
        ),
        Agent(
            id = "beam", name = "Beam", glyph = "BM", role = "deploy-agent",
            color = AgentBeam, provider = "Lightsprint", model = "ls-runner-1",
            state = AgentState.Idle, statusShort = "", lastSeen = "2h",
            currentTask = "", tokensPerHr = "0.8K", costDay = "0.04",
            skills = listOf("deploy", "rollback", "monitor", "staging"),
            memoryRead = "deploy logs",
            memoryWrite = "release notes",
        ),
    )

    val people: List<Person> = listOf(
        Person("sam",   "Sam Aoki",    "SA", "PM",       Color(0xFF5B6770), true),
        Person("yuna",  "Yuna Park",   "YP", "Design",   Color(0xFFA55A3F), true),
        Person("diego", "Diego Marín", "DM", "Eng lead", Color(0xFF4F6A52), true),
        Person("priya", "Priya Shah",  "PS", "GTM",      Color(0xFF6A5A85), false),
    )

    val skills: List<Skill> = listOf(
        Skill("plan",      SkillGroup.Plan,     "Decompose a goal into a dated work plan", "GBrain"),
        Skill("decompose", SkillGroup.Plan,     "Break a task into sub-tasks with deps",   "GBrain"),
        Skill("research",  SkillGroup.Research, "Gather sources, summarize, cite",         "ZeroEntropy"),
        Skill("compete",   SkillGroup.Research, "Build a competitor matrix from scratch",  "ZeroEntropy"),
        Skill("interview", SkillGroup.Research, "Draft user interview script + analyze",   "ZeroEntropy"),
        Skill("scaffold",  SkillGroup.Build,    "Stand up a new feature scaffold + tests", "GStack"),
        Skill("refactor",  SkillGroup.Build,    "Refactor with safety net + perf budget",  "GStack"),
        Skill("review",    SkillGroup.Review,   "Critique a draft against the project goal", "The Hog"),
        Skill("factcheck", SkillGroup.Review,   "Verify claims against pinned memory",     "The Hog"),
        Skill("redteam",   SkillGroup.Review,   "Stress test a plan or release",           "The Hog"),
        Skill("remember",  SkillGroup.Memory,   "Pin a fact to project memory",            "NeverZero"),
        Skill("recall",    SkillGroup.Memory,   "Surface forgotten work from any project", "ZeroEntropy"),
        Skill("compress",  SkillGroup.Memory,   "Collapse old turns into a recap",         "NeverZero"),
        Skill("deploy",    SkillGroup.Build,    "Ship to staging or prod",                 "Lightsprint"),
    )

    val events: List<ActivityEvent> = listOf(
        ActivityEvent("iris", "cited 4 sources for", "Onboarding flow", live = true,
            whenLabel = "12:02 · 14s ago",
            preview = "\"Drop-off occurs at step 3 in 7 of 12 reviewed apps — the consent screen.\" " +
                "— Pricing Page Patterns, 2025"),
        ActivityEvent("forge", "pushed", "auth/oauth-rewrite", live = true,
            whenLabel = "11:58 · 4m ago", note = "14 files · 2 tests pending"),
        ActivityEvent("sam", "pinned", "memory.pricing.tier-3", live = true,
            whenLabel = "11:51 · 11m ago"),
        ActivityEvent("iris", "handed off to", "Atlas", live = false, whenLabel = "11:48"),
        ActivityEvent("yuna", "commented on", "Onboarding step 3", live = false, whenLabel = "11:30"),
        ActivityEvent("loop", "flagged blocker on", "PR #281", live = false, whenLabel = "09:15"),
        ActivityEvent("atlas", "replanned", "Q3 milestones", live = false, whenLabel = "09:02"),
        ActivityEvent("diego", "merged", "PR #280", live = false, whenLabel = "08:44"),
    )

    val memory: List<MemoryPin> = listOf(
        MemoryPin(
            text = "Pricing has three tiers: Solo, Team, Workspace. Workspace gets agent SSO and " +
                "shared memory — keep this distinction sharp in copy.",
            source = "Decision · pinned by Sam", whenLabel = "May 12",
        ),
        MemoryPin(
            text = "Onboarding must show one real agent doing real work within 60 seconds of signup. " +
                "No screencast, no preamble.",
            source = "NPS survey · Iris recalled it", whenLabel = "Apr 30",
        ),
        MemoryPin(
            text = "Never use \"AI assistant\". Always \"agent\" or by name (Iris, Forge, etc).",
            source = "Brand voice · Yuna", whenLabel = "Apr 14",
        ),
    )

    val todos: List<Todo> = listOf(
        Todo(1, "Lock pricing tiers (Solo / Team / Workspace)", done = true,  byId = "sam",   tag = "#decision"),
        Todo(2, "Draft launch narrative — shared layer for AI-native work", done = true, byId = "yuna"),
        Todo(3, "Competitor matrix — 12 workspaces, retention + agent depth",
            done = true, byId = "iris", isAgent = true, color = AgentIris, tag = "/research"),
        Todo(4, "Land onboarding flow — show one real agent in <60s",
            byId = "yuna", tag = "spec v3", due = "Tue"),
        Todo(5, "Wire OAuth + agent SSO across providers",
            byId = "forge", isAgent = true, color = AgentForge, tag = "PR #284", progress = 62),
        Todo(6, "Audit retrieval quality on ZeroEntropy index",
            byId = "iris", isAgent = true, color = AgentIris, tag = "/research", progress = 38),
        Todo(7, "Benchmark cold-start latency vs. 3 incumbents", byId = "diego", due = "Thu"),
        Todo(8, "Red-team the launch plan against renewal risk",
            byId = "loop", isAgent = true, color = AgentLoop, tag = "/redteam"),
    )

    fun agentById(id: String): Agent? = agents.firstOrNull { it.id == id }
    fun personById(id: String): Person? = people.firstOrNull { it.id == id }
}
