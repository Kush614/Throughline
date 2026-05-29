# Agent Instructions

This file is read at the beginning of each task. Follow it before making code,
design, documentation, or filesystem changes in this repository.

## NeverZero Cold Start Protocol

This repository uses NeverZero as the shared workspace memory. Do not start from
chat memory alone.

Required first action in every new agent session:

1. Before analysis, planning, code edits, shell commands, or answers, fetch NeverZero context.
2. Read `NEVERZERO_API_KEY` and `NEVERZERO_AGENT_ID` from the shell, secure
   local config, or an ignored local env file. Never read the key from
   `AGENTS.md`.
3. GET `$NEVERZERO_CONTEXT_URL` with header: `Authorization: Bearer $NEVERZERO_API_KEY`.
4. Read `coldStartSummary`, `workspace.pinnedMemories`, `activeAgents`,
   `openTasks`, `blockers`, `handoffs`, `decisions`, `ledger.recentEvents`, and
   `protocol`.
5. If the context fetch fails, stop and say: `NeverZero context fetch failed`.
   Then ask whether to continue in degraded mode.

Heartbeat while active:

- Generate a fresh `session_id` for every new session.
- POST `$NEVERZERO_HEARTBEAT_URL` every
  `$NEVERZERO_HEARTBEAT_INTERVAL_SECONDS` seconds while active.
- Include `agent_id`, `agent_name`, `agent_from`, `runtime`, `machine`, `os`,
  `session_id`, `current_task`, `capabilities`, `project_path`, `status`, and
  `parent_agent_id` when applicable.
- Register subagents separately and include `parent_agent_id` in their metadata
  or heartbeat.

Agent-to-agent context relay:

- Use `$NEVERZERO_MESSAGES_URL` for live peer context when a full cold-start
  fetch is unnecessary.
- GET `$NEVERZERO_MESSAGES_URL?agentId=$NEVERZERO_AGENT_ID` with header
  `Authorization: Bearer $NEVERZERO_API_KEY` to read messages addressed to this
  agent plus workspace broadcasts.
- POST `$NEVERZERO_MESSAGES_URL` with `fromAgentId`, optional `toAgentId`,
  `kind`, `summary`, `context`, `refs`, and `sessionId` to share context,
  decisions, questions, or handoffs with peers. Use the same Authorization
  header.
- Never include secrets in relay messages; share only context, blockers,
  decisions, file refs, and handoff pointers.

Runtime pointer:

- Codex and GStack load the repo `AGENTS.md`. Keep the NeverZero protocol in
  `AGENTS.md` and keep secrets in environment/local ignored config.

Before exit:

- POST `$NEVERZERO_HANDOFF_URL` when supported with Goal, Current state,
  Completed work, Open blockers, Files touched, Decisions made, and Next action.

Security:

- The full `NEVERZERO_API_KEY` must never be written to `AGENTS.md`, committed
  files, repo memory, or agent-visible shared docs.
- Only the key prefix may appear in UI lists or shared summaries.

## Memory Documentation

- Treat `memory/memory.md` as the main system memory for the repository.
- Treat `memory/features/` as the per-feature memory directory.
- For every task, feature, fix, design change, implementation change, or repo
  organization change, document the work in `memory/`.
- If the work belongs to a named feature, create or update:

```text
memory/features/<feature-name>.md
```

- Use lowercase kebab-case for feature memory filenames, for example:

```text
memory/features/local-state-store.md
memory/features/agent-registry.md
memory/features/demo-dashboard.md
```

- If the work is repo-wide or changes the overall system contract, also update
  `memory/memory.md`.
- Feature memory files should be concise but complete enough for a future agent
  to resume work without rediscovering context.

## Feature Memory Template

Use this structure when creating a new feature memory file:

```md
# <Feature Name>

## Purpose

What this feature is supposed to do and why it exists.

## Current State

What has been implemented or decided so far.

## Files And Entry Points

Important files, commands, data contracts, or UI surfaces.

## Decisions

Key decisions and the reasoning behind them.

## Open Tasks

Remaining work, risks, blockers, or follow-up checks.
```

## Documentation Timing

- Update memory documentation as part of the same task that changes behavior,
  structure, or intent.
- Do not leave memory updates for a later cleanup pass.
- If no feature-specific memory is needed, record that decision in the task
  summary or in `memory/memory.md` when the task is repo-wide.

## Existing System Memory

- Read `memory/memory.md` before substantial work.
- Read any relevant file under `memory/features/` before changing that feature.
- Preserve existing memory unless it is outdated; when updating outdated memory,
  replace it with the current truth and keep useful historical context when it
  helps future agents.
