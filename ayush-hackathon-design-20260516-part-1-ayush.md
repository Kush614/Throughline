# NeverZero Mission Control - Part 1: Ayush Workstream

Source: `C:\Users\ayush\.gstack\projects\gstack-x-gbrain-agentroom\ayush-hackathon-design-20260516-locked.md`

## Goal

Own the core product primitives for the hackathon demo:

- Agent Registry
- Work Ledger
- Project Memory
- Resume Packet (`.nzr`)

This workstream should make the product real even if every visual surface is temporarily backed by fixtures.

## Pitch To Keep In Mind

NeverZero Mission Control is the control plane for AI-native engineering teams. It helps agents across Claude Code, Cursor, Codex, custom scripts, and other runtimes coordinate work, preserve memory, and resume from past state.

The strongest mental model is:

> Git for agent context.

## Dependency Rule

Minimize dependencies by keeping the core local-first.

- Use plain markdown, JSON, and newline-delimited JSON where possible.
- Avoid adding databases, queues, frameworks, or external services unless they are required for the sponsor demo.
- Treat GBrain as a pluggable storage backend, not as the only way the demo can run.
- Keep ZeroEntropy and The Hog optional from the core path.
- The teammate can build against the shared file contract below before the core implementation is finished.

## Shared Contract With Teammate

Create and maintain these files during the demo:

```text
.nz/
  room.json
  ledger.ndjson
  memory.json
  handoff/
    latest.nzr.json
```

### `.nz/room.json`

```json
{
  "room_id": "demo-room",
  "project": "NeverZero Mission Control",
  "agents": [
    {
      "id": "agent-codex-1",
      "name": "Codex",
      "runtime": "codex",
      "machine": "ayush-laptop",
      "status": "working",
      "current_task": "build registry",
      "last_heartbeat": "2026-05-16T12:00:00-07:00"
    }
  ]
}
```

### `.nz/ledger.ndjson`

Each line is one event.

```json
{"ts":"2026-05-16T12:00:00-07:00","agent_id":"agent-codex-1","type":"task_claimed","task":"build registry"}
{"ts":"2026-05-16T12:01:00-07:00","agent_id":"agent-codex-1","type":"decision","summary":"Use local JSON files as the fallback state store"}
```

### `.nz/memory.json`

```json
{
  "goals": ["registry", "ledger", "memory", "handoff"],
  "constraints": ["48-hour hackathon", "live demo must not crash"],
  "decisions": [
    {
      "summary": "Local-first state store",
      "reason": "Keeps the demo alive even if sponsor APIs fail"
    }
  ],
  "rejected_approaches": [],
  "files_touched": []
}
```

### `.nz/handoff/latest.nzr.json`

```json
{
  "goal": "Continue the current agent task",
  "current_state": "registry is implemented; ledger writes are pending",
  "completed_work": [],
  "open_tasks": [],
  "decisions": [],
  "failed_attempts": [],
  "next_best_action": "run the next CLI command and append to the ledger",
  "memory_pointers": []
}
```

## Build Scope

### 1. Local State Store

Implement the `.nz/` directory as the single source of truth for the demo.

Minimum viable behavior:

- `room.json` stores active agents.
- `ledger.ndjson` appends every important event.
- `memory.json` stores persistent project context.
- `handoff/latest.nzr.json` stores the latest resume packet.

### 2. CLI Commands

Build the smallest useful `nz` command surface.

Required:

```text
nz init
nz join --name <name> --runtime <runtime>
nz heartbeat --agent <agent-id>
nz claim --agent <agent-id> --task <task>
nz log --agent <agent-id> --type <type> --summary <summary>
nz memory set --key <key> --value <value>
nz handoff --agent <agent-id>
nz resume
```

Nice to have:

```text
nz status
nz conflict-check --task <task>
```

### 3. Agent Registry

Make agent presence visible through `room.json`.

Required fields:

- Agent ID
- Name
- Runtime
- Machine
- Status
- Current task
- Last heartbeat

Demo moment:

- Start two agents.
- Show both registered.
- Kill or stop one.
- Show heartbeat age changing.

### 4. Work Ledger

Append one ledger event for each meaningful action.

Required event types:

- `agent_joined`
- `heartbeat`
- `task_claimed`
- `task_released`
- `decision`
- `failure`
- `handoff_created`
- `resume_consumed`

Demo moment:

- Ask what happened in the room.
- Show a chronological answer from the ledger.

### 5. Project Memory

Persist project context so a new agent can resume without re-explanation.

Minimum structure:

- Goals
- Constraints
- Decisions with reasoning
- Rejected approaches
- Files touched
- Agent capabilities

Demo moment:

- Add a decision.
- Start a new agent.
- Show it can read the decision immediately.

### 6. Resume Packet

Generate a portable `.nzr` JSON packet.

Required fields:

- Goal
- Current state
- Completed work
- Open tasks
- Decisions
- Failed attempts
- Next best action
- Memory pointers

Demo moment:

- Agent dies.
- New agent runs `nz resume`.
- It continues from the packet in under 30 seconds.

## Sponsor Integration Boundaries

### GBrain

Primary sponsor integration for this workstream.

Plan:

1. Run `/setup-gbrain`.
2. Add a storage adapter boundary.
3. Keep local JSON as the fallback adapter.
4. Sync memory and ledger summaries to GBrain only after local flow works.

Do not let GBrain setup block the local demo path.

### ZeroEntropy

Only expose an optional compression hook:

```text
nz handoff --compress
```

If credentials are not ready, generate the resume packet without compression.

### The Hog

No direct dependency in this workstream. The teammate can own it as a research-agent demo card or optional ledger event source.

### GStack

Use GStack only where it helps agent registration. The CLI contract should work without GStack-specific assumptions.

## Demo Script Owned By Ayush

1. `nz init`
2. `nz join --name Codex --runtime codex`
3. `nz claim --task "build registry"`
4. `nz log --type decision --summary "Use local-first state store"`
5. `nz handoff`
6. Stop the current agent.
7. Start another runtime.
8. `nz resume`

Success condition:

- The new agent knows the goal, current state, open task, and latest decision.

## Deliverables

- A working local `.nz/` state store.
- Minimal `nz` CLI commands.
- Demo-ready registry, ledger, memory, and handoff flows.
- GBrain adapter only after the local flow works.
- Fixture files that the teammate can use without waiting for the CLI.

## What Not To Own

- Full web UI polish.
- Landing page or marketing page.
- The Hog research workflow.
- Mobile demo.
- Enterprise auth, SaaS, billing, Docker, or production conflict resolution.

## End Of Day Checklist

- `/setup-gbrain` attempted and result recorded.
- Local-first state store works without external credentials.
- Teammate has stable sample `.nz/` files.
- Resume packet can be generated and consumed.
- Live demo can run from a clean folder.
