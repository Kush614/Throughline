# Demo Flow

## Purpose

Define the current hackathon demo source of truth for NeverZero. Future work
should optimize for this flow before trying to complete the entire product.

## Current State

- Root `feature-list.md` is the consolidated demo and feature source of truth.
- The intended demo shows NeverZero as the shared context layer for AI-native
  teams: agents register, receive shared compressed context, invoke sponsor
  skills, create linked subfiles, resolve conflicts, and hand off work.
- The demo flow is landing page, agent registration, shared doc command center,
  The Hog research, Loop verification, GStack build work, ZeroEntropy conflict
  packet, live implementation status, work ledger, and GBrain/ZeroEntropy
  resume handoff.
- The current repo already has the visual workstation, living document editor,
  agent registration, authenticated context endpoint, heartbeat endpoint, local
  `nz` CLI, research routes, The Hog companies/people search client, research
  orchestrator, and SSE progress/events.
- Remaining demo-critical gaps are `@agent` picker, clean main-doc subfile
  linking, `/verify`, `/build`, subagent parent-child registration,
  file-level conflict packet generation, UI handoff/resume, and unified live
  ledger rendering.

## Files And Entry Points

- `feature-list.md`
- `app/doc-minimal/_components/LivingDoc.tsx`
- `app/doc-minimal/_components/ResearchPanel.tsx`
- `app/api/research/route.ts`
- `app/api/research/[id]/route.ts`
- `app/api/research/[id]/events/route.ts`
- `app/api/events/route.ts`
- `lib/research.ts`
- `lib/hog.ts`
- `lib/events.ts`
- `cli/src/`
- Browser routes:
  - `http://localhost:3000/`
  - `http://localhost:3000/atlas/agents`
  - `http://localhost:3000/atlas/workstation`
  - `http://localhost:3000/atlas/research`

## Decisions

- Treat the demo flow as the active scope. Do not spend hackathon time on
  production mobile, full realtime infrastructure, billing, or full GitHub
  automation unless the core demo is already working.
- Keep the main document clean. Heavy sponsor skill outputs should create
  linked subfiles while the main document shows final status, summary, and
  ledger entries.
- Use local JSON/NDJSON and in-memory SSE as acceptable hackathon-grade
  infrastructure where external sponsor adapters are not yet stable.
- Sponsor labels should become real callable boundaries where possible. The Hog
  is already partially real; ZeroEntropy, GStack, and GBrain still need either
  adapters or clearly scoped local fallbacks.

## Open Tasks

- Add `@agent` picker and multi-agent selection to the document command surface.
- Create main-doc output cards that link to generated research/verification/
  compression/conflict/resume subfiles.
- Add `/verify` and `/build` command handlers with visible progress.
- Add parent-child agent registration for subagents.
- Add file-level claims/conflict events and generate a conflict packet subfile.
- Wire UI handoff/resume to packet generation and durable memory storage.
- Render a unified live work ledger from org SSE events and/or `.nz` ledger
  state.

