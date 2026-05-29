# Dynamic Agent Presence

## Purpose

Show only the most relevant agents in document presence surfaces while allowing
the registered workspace roster to grow beyond the visible list.

## Current State

- `app/workstation/_client/data.ts` exports `MAX_VISIBLE_DOC_AGENTS`,
  `getTopActiveAgents`, and `countWorkingAgents`.
- `getTopActiveAgents` filters to active attached agents, ranks working agents
  ahead of idle agents, ranks idle agents by recent `lastSeen`, preserves
  registration order for ties, and caps the visible list at 5.
- `/doc-minimal` uses the dynamic top-five list for the top bar presence stack,
  the "Agents on this doc" sidebar, the focused-agent fallback, and the live
  working-agent count.
- `/workstation` uses the same helper for its top bar presence stack, sidebar
  agent list, focused-agent fallback, live count, and workspace agent count.

## Files And Entry Points

- `app/workstation/_client/data.ts`
- `app/doc-minimal/_components/LivingDoc.tsx`
- `app/workstation/_client/App.tsx`
- Browser routes: `http://localhost:3000/doc-minimal` and
  `http://localhost:3000/workstation`

## Decisions

- Keep the visible document presence list capped at 5, even if hundreds of
  agents are registered.
- Use the registered `AGENTS` array as the source of truth for counts and
  overflow.
- Rank by live working state and recency instead of token volume or cost so the
  order is predictable and does not jump because of incidental metadata.

## Open Tasks

- Replace the static `AGENTS` seed array with a runtime-backed registered-agent
  source once `.nz/room.json` or a server store is wired into the app.
- Add direct tests for `getTopActiveAgents` when the project has a test harness
  for shared frontend utilities.
