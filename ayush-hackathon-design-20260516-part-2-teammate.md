# NeverZero Mission Control - Part 2: Teammate Workstream

Source: `C:\Users\ayush\.gstack\projects\gstack-x-gbrain-agentroom\ayush-hackathon-design-20260516-locked.md`

## Goal

Own the demo surface and optional integrations around the core NeverZero primitives.

This workstream should make the product understandable in a live hackathon demo while staying unblocked by the core implementation.

Primary focus:

- Demo dashboard
- Room view
- Agent presence visualization
- Ledger timeline
- Memory and handoff preview
- Sponsor visibility for GStack, ZeroEntropy, The Hog, and GBrain

## Pitch To Keep In Mind

NeverZero Mission Control makes AI work multiplayer.

It shows that agents are no longer isolated sessions. They are registered, coordinated, remembered, and resumable.

The demo should make this obvious in seconds:

- Multiple agents are in one room.
- One claims work.
- Another sees the claim and avoids a conflict.
- A dead agent can be resumed by another runtime.
- The system remembers decisions without a human re-explaining context.

## Dependency Rule

Minimize dependencies by building against static fixture files first.

- Do not wait for the CLI or backend to be finished.
- Read from local JSON and newline-delimited JSON files.
- Avoid adding auth, databases, queues, state-management libraries, or backend frameworks.
- Keep sponsor APIs behind mockable wrappers.
- If an API key or external tool is missing, show a realistic local fallback.

The dashboard should work from files in `.nz/` before it talks to anything else.

## Shared Contract With Ayush

Build against this file shape:

```text
.nz/
  room.json
  ledger.ndjson
  memory.json
  handoff/
    latest.nzr.json
```

Ayush owns generating these files. This workstream owns rendering them clearly.

If the files are not ready, create local fixtures with the same shape and swap them later.

## Build Scope

### 1. Demo Dashboard

Create one focused screen for the live demo.

Recommended layout:

- Top bar: room name, demo status, active agent count
- Left panel: agent registry
- Center panel: work ledger timeline
- Right panel: project memory and latest handoff packet
- Bottom strip: sponsor integration status

Keep it operational, not marketing-heavy. The first screen should be the actual product surface.

### 2. Agent Registry View

Render agents from `.nz/room.json`.

For each agent show:

- Name
- Runtime
- Machine
- Current task
- Status
- Last heartbeat age

States to support:

- Working
- Idle
- Stale
- Dead or disconnected

Demo moment:

- Two agents appear in the same room.
- One becomes stale after heartbeat stops.

### 3. Work Ledger Timeline

Render `.nz/ledger.ndjson` as a chronological event stream.

Required event styles:

- Agent joined
- Heartbeat
- Task claimed
- Task released
- Decision
- Failure
- Handoff created
- Resume consumed

Demo moment:

- Audience sees the room history build up live.
- The timeline explains what happened without narration.

### 4. Conflict Avoidance Demo

Build a simple visual state for conflicting task claims.

Input can be a fixture line in `ledger.ndjson`, for example:

```json
{"ts":"2026-05-16T12:10:00-07:00","agent_id":"agent-cursor-1","type":"conflict_detected","task":"build registry","summary":"Codex already claimed this task"}
```

Demo moment:

- Agent A claims a task.
- Agent B tries the same task.
- UI shows Agent B yielding.

This can be simulated if the core CLI is not ready.

### 5. Project Memory View

Render `.nz/memory.json`.

Show:

- Goals
- Constraints
- Decisions
- Rejected approaches
- Files touched

Demo moment:

- A decision appears once and survives across agent sessions.

### 6. Resume Packet Preview

Render `.nz/handoff/latest.nzr.json`.

Show:

- Goal
- Current state
- Completed work
- Open tasks
- Failed attempts
- Next best action

Demo moment:

- Agent dies.
- New runtime consumes the packet.
- UI shows the handoff chain.

## Sponsor Integration Surfaces

These should be visible without making the demo fragile.

### GBrain

Show as the memory backend.

UI states:

- Local fallback active
- GBrain connected
- Last memory sync time

If GBrain is not ready, show local fallback and keep demo moving.

### GStack

Show as a native agent runtime.

UI states:

- GStack agent registered
- Skill metadata detected
- Heartbeat active

If GStack agent registration is not wired yet, use a fixture agent with runtime `gstack`.

### ZeroEntropy

Show as optional context compression.

UI states:

- Compression unavailable
- Resume packet uncompressed
- Resume packet compressed
- Estimated context reduction

If credentials are missing, use a mock compressed-state badge and label it as demo mode.

### The Hog

Show as a research-agent source.

UI states:

- Research source unavailable
- Research agent produced evidence
- Evidence appended to ledger

If credentials are missing, seed one fixture event:

```json
{"ts":"2026-05-16T12:15:00-07:00","agent_id":"agent-research-1","type":"research_evidence","summary":"Agent sprawl validated by Gartner and cloud vendor product launches"}
```

## Demo Script Owned By Teammate

1. Open the dashboard.
2. Show room with multiple agents.
3. Show Agent A claiming work.
4. Show Agent B detecting conflict and yielding.
5. Show memory with a durable decision.
6. Show latest resume packet.
7. Toggle or display sponsor status strip.
8. Keep the page usable even if sponsor credentials are not ready.

Success condition:

- A judge understands the product primitives without reading the full design doc.

## Fixture Data To Prepare

Create or request these fixtures from Ayush:

```text
fixtures/
  room.json
  ledger.ndjson
  memory.json
  latest.nzr.json
```

The dashboard can load from `fixtures/` first, then switch to `.nz/` when Ayush's CLI is ready.

## What Not To Own

- CLI implementation.
- Storage adapter internals.
- GBrain setup.
- Resume packet generation logic.
- Production auth, billing, enterprise self-hosting, or domain setup.

## End Of Day Checklist

- Dashboard runs locally.
- Dashboard renders fixture files without a backend.
- Registry, ledger, memory, and handoff panels are visible.
- Conflict-yield demo can be shown from fixture data.
- Sponsor strip has graceful fallback states.
- Ayush can replace fixtures with real `.nz/` files without UI changes.
