# NeverZero Feature List And Demo Source Of Truth

This document is the current product and demo target for the hackathon build.
Optimize for this demo flow first. Do not treat this as a full production
roadmap.

## Core Idea

NeverZero is the shared context layer for AI-native teams.

Humans open one workspace, register multiple agents, call sponsor-powered
skills with `/skill-name`, and let agents collaborate without losing context
across sessions, devices, or machines.

The document stays clean. Heavy work such as research, verification,
compression, conflict resolution, and handoff creates linked subfiles. The main
document shows only the final summary, linked outputs, agent status, and live
work ledger.

## Demo Priority

The demo should prove one moat:

Multiple registered agents can enter the same room, receive shared compressed
context, spawn or coordinate subagents, resolve conflicts before GitHub, and
hand work off without starting from zero.

The product does not need every production system finished for the demo. It
does need every visible demo action to work end to end, with real state changes
and credible sponsor surfaces.

## Current Build Status

### Frontend

- ✅ Next.js 16, React 19 app with production build passing.
- ✅ `/workstation` renders the rich desktop mission-control prototype with top
  bar, sidebar, right rail, agent inspector, memory/context panels, skill
  palette, compose bar, and live-looking agent cards.
- ✅ `/doc-minimal` renders the editable living document engine with block types
  for paragraph, heading, todo, routine, skill, skill creator, decision, memory,
  agent note, and divider.
- ✅ `LivingDoc` is reused by `/<org>/workstation` with org-scoped storage and
  blank-mode support.
- ✅ `/install`, `/agents`, `/brain`, and org-scoped routes exist.
- ✅ `/<org>/brain` now uses the workstation UI shell driven by REAL org data
  (no dummy values): top bar with NeverZero / org crumb, sidebar with subfile
  tree + attached agents, doc body with mission/open-work/decisions/memory/
  skills sections, right rail with Activity / Agent / Memory / Context tabs,
  org-wide SSE refresh on skill events.
- ✅ `/research` output has real route surfaces:
  `/<org>/research` and `/<org>/research/<id>`.
- ✅ A research progress panel exists and subscribes to SSE for live step updates.
- ✅ The `@agent` and `/skill` autocomplete picker is wired on `/<org>/brain`'s
  command bar (arrow-key navigation, ⇥ to insert, esc to close). Type `@` for
  registered agents, `/` for installed skills.

### CLI

- ✅ `cli/` contains a working local-first `nz` CLI.
- ✅ Implemented commands: `init`, `join`, `heartbeat`, `claim`, `release`, `log`,
  `memory`, `handoff`, `resume`, `status`, and `conflict-check`.
- CLI state contract:

```text
.nz/
  room.json
  ledger.ndjson
  memory.json
  handoff/
    latest.nzr.json
```

- ✅ The CLI e2e proof loop is green: init, join, claim, log, handoff, resume, and
  status all work in a temp room.

### Backend And Data

- ✅ `POST /api/agents` mints per-agent API keys and stores only hashes.
- ✅ `GET /api/agents` lists registered agents.
- ✅ `GET /api/context` returns authenticated cold-start context for an agent key.
- ✅ `POST /api/agents/<id>/heartbeat` records active session metadata and marks
  an agent connected.
- ✅ `POST /api/orgs` and `GET /api/orgs` manage orgs.
- ✅ `GET /POST /api/skills` reads and writes repo-local `skills/<name>/SKILL.md`
  files.
- ✅ `POST /api/research` starts a research operation.
- ✅ `GET /api/research/<id>` returns stored research state.
- ✅ `GET /api/research/<id>/events` streams research progress over SSE.
- ✅ `GET /api/events?org=<slug>` streams org-wide events over SSE.
- ✅ `lib/events.ts` provides the in-memory event bus for hackathon-grade SSE.
- ✅ `lib/research.ts` stores research records in `data/research.json`, runs the
  orchestrator, broadcasts compressed context updates, and writes final reports.
- ✅ Provider catalog (`lib/providers.ts`) — gbrain / gstack / zeroentropy /
  the-hog / lightsprint / neverzero with 22 skills. Per-org install state
  in `data/orgs.json::providers`.
- ✅ `POST /api/orgs/<slug>/providers` install/uninstall; `GET` lists state.
- ✅ `GET /api/orgs/<slug>/skills` returns only skills whose provider is
  installed on the org.
- ✅ `POST /api/orgs/<slug>/skills/run` runs a skill — creates a subfile
  DocNode under the brain root, dispatches the kind-specific executor
  (templated markdown for plan/scaffold/review/etc, real Hog research
  for `/research`), and broadcasts `context.update` per agent.
- ✅ `GET /api/orgs/<slug>/docs` tree, `GET /api/orgs/<slug>/docs/<id>` one.
- ✅ `lib/docs.ts` doc tree: brain root + nested subfiles, each with full
  `skillRun` metadata (command, kind, task, mentions, status, timestamps).

## Sponsor Skills

### The Hog

Used for:

- `/research`

Purpose:

The Hog powers web intelligence and external research.

Demo command:

```text
@Iris @Forge /research onboarding flow problems for AI agent workspaces
```

Current implementation:

- ✅ `lib/hog.ts` calls The Hog `companies/search` and `people/search` endpoints
  using `X-Access-Key` and `X-Secret-Key`.
- ✅ The research orchestrator attempts the deep-research endpoint when available
  and falls back gracefully when unavailable.
- ✅ Research creates a persisted report and streams progress with SSE.

Target output:

- ✅ `/research` invocations from the doc create a linked subfile titled
  `Research: <topic>` containing TL;DR, key findings, Hog signal (companies +
  people), sources, and a link back to the dedicated research page.
- ✅ The subfile includes sources, findings, evidence, and recommendations.
- ✅ The main document only shows completion status and a link to the report
  (everything heavy lives in the linked subfile under the brain's doc tree).

### ZeroEntropy

Used for:

- `/compress`
- `/rerank`
- `/context`
- `/resume`

Purpose:

ZeroEntropy compresses messy agent activity into useful context packets.

It creates:

- Summary
- Blockers
- Next action
- Important decisions
- Conflict context
- Resume packet

Demo command:

```text
@Beam /compress current room context for Forge
```

Current implementation:

- ✅ The CLI supports `nz handoff --compress` as a packet flag.
- ✅ The research orchestrator broadcasts compact context payloads to org agents
  on the org SSE channel (`context.update` per agent).
- ✅ `lib/adapters/zeroentropy.ts` is the single labeled compression surface;
  `skill-runner.ts` routes every compress() call through it, and `/resume`
  packets are stamped `compressed via ZeroEntropy`. Real external API call
  still mocked — swap the function body to hit ZeroEntropy without touching
  call sites.

Target output:

- ✅ `/resume` creates a `Resume Packet: <ts>` subfile via
  `POST /api/orgs/<slug>/resume` (verified).
- ✅ File conflicts emit a `Conflict Resolution Packet: <filePath>` subfile via
  `POST /api/orgs/<slug>/file-claims` (verified — 409 on collision).

### GStack

Used for:

- `/spawn`
- `/run`
- `/build`
- `/verify`

Purpose:

GStack runs agents and subagents inside the workspace.

Demo command:

```text
@Forge /build implement onboarding changes from research findings
```

Current implementation:

- ✅ The CLI can register agents, claim tasks, heartbeat, release work, and detect
  task-level conflicts.
- ✅ The UI labels build/scaffold work as GStack-backed.
- ✅ `/scaffold`, `/refactor`, `/test`, `/lint` skills are dispatchable from the
  command bar; each creates a structured subfile in the doc tree.
- ✅ `POST /api/orgs/<slug>/build` claims target files via `lib/file-claims.ts`,
  emits `build.*` ledger events, and writes a `Build: <task>` subfile with
  live ledger rows (verified — 8 progress rows on the test run).
- ✅ `POST /api/orgs/<slug>/spawn` mints a child Agent with `parentAgentId`
  set, broadcasts `agent.spawned`, and writes a `Subagent: <name>` subfile
  (verified — child agent + spawn subfile both created).
- ✅ `lib/adapters/gstack.ts` is the labeled call surface for claim / release /
  progress. Real GStack runtime bridge still mocked — swap the three function
  bodies without touching the build pipeline.

Target output:

- Forge becomes active, claims the task, updates the ledger, and pushes
  implementation progress into the room.
- If Forge spawns another agent, that subagent is registered in NeverZero.

### GBrain

Used for:

- `/remember`
- `/recall`
- `/brain`
- `/handoff`

Purpose:

GBrain stores durable project memory.

It remembers:

- Decisions
- Tasks
- Research outputs
- Conflict resolutions
- Failed attempts
- Handoff packets
- Agent history

Demo command:

```text
@Beam /remember final conflict resolution and handoff packet
```

Current implementation:

- ✅ Org memory exists in `data/orgs.json`.
- ✅ CLI memory exists in `.nz/memory.json`.
- ✅ Authenticated `/api/context` returns cold-start memory to registered agents.
- ✅ `/plan`, `/decompose`, `/estimate`, `/schedule`, `/remember` skills are
  dispatchable from the command bar.
- ✅ `lib/adapters/gbrain.ts` is the labeled persistence surface; `/remember`
  and `/pin` skill runs call `pinMemory()` which writes through to the org's
  pinned memory list. Real GBrain HTTP backend still mocked — single
  function-body swap to wire externally.

Target output:

- Creates or updates durable workspace memory so future agents can continue
  without starting from zero.

### Lightsprint

Used for:

- Optional `/deploy`

Purpose:

Deployment provider in the prototype.

Current implementation:

- UI labels exist only.
- Lightsprint is not required for the core demo path unless a deploy beat is
  added.

## Updated Demo Flow

### Step 1: Landing Page

Show the pitch:

NeverZero is Mission Control for AI agents.

It lets teams register agents, assign work, share compressed context, resolve
conflicts, and hand off across sessions.

### Step 2: Agent Registration Page

Show registered agents:

- Iris: research agent using The Hog.
- Forge: build agent using GStack.
- Loop: verification agent.
- Beam: context compression agent using ZeroEntropy and GBrain.

Also show subagents when they appear.

This proves every agent and subagent is visible.

### Step 3: Command Center And Docs ✅

Open the shared project document.

The doc is the command surface. Users can type:

```text
@agent-name @agent-name /skill-name task
```

The main doc stays clean. Every skill creates a separate subfile.

Current state:

- ✅ `/<org>/brain` is the command center.
- ✅ `@` opens the agent picker (registered agents from the org).
- ✅ `/` opens the skill picker (skills from installed providers only).
- ✅ Enter dispatches; the main doc stays clean and a subfile is created in
  the doc tree (visible in the sidebar and the "Open work" section).

### Step 4: Research With The Hog

Type:

```text
@Iris @Forge /research onboarding flow problems for AI agent workspaces
```

Required behavior:

- The `@` picker shows agents.
- The `/` picker shows sponsor skills.
- The Hog-backed research operation starts.
- A new `Research Findings` subfile is created.
- The main doc shows:
  - Research complete.
  - Findings added.
  - Link to `Research Findings`.

Current state:

- ✅ The `/research` backend, research routes, SSE progress panel, and Hog
  companies/people search calls exist.
- ✅ The `@agent` picker is wired on `/<org>/brain` command bar.
- ✅ Main-doc shows the running subfile in a "Currently working" agent block
  and the completed run in the Decision log + Doc tree, both linking to the
  full research subfile.

### Step 5: Verify Research

Type:

```text
@Loop /verify Research Findings
```

Required behavior:

- Loop checks the research page for contradictions, missing evidence, and weak
  claims.
- A new `Verification Report` subfile is created.
- The main doc shows:
  - Loop verified research.
  - Strong findings retained.
  - Weak claims removed.

Current state:

- ✅ `POST /api/orgs/<slug>/verify` audits a target research subfile (3-pass
  source/claim/memory check), creates a `Verification Report: <topic>` subfile
  nested under the research subfile, and annotates the research with the
  verdict + a back-link to the report (verified — returns `verdict: ship` /
  `ship-with-edits` / `reject — no usable sources`).

### Step 6: Build From Shared Context

Type:

```text
@Forge @Atlas /build improve onboarding flow using verified findings
```

Required behavior:

- GStack runs the build agents.
- Forge and Atlas both receive the same compressed room context.
- They know what research found, what Loop verified, which files are being
  touched, and what decisions already exist.

Current state:

- ✅ `nz claim`, `heartbeat`, `release`, and `conflict-check` exist.
- ✅ `POST /api/orgs/<slug>/build` claims target files, streams `build.*`
  ledger events, and writes the rows into a `Build: <task>` subfile in real
  time. Pipeline emits: `build.started` → `build.context_received` →
  per-file `build.claim` (or `build.conflict`) → `build.scaffold` → `build.test`
  → `build.lint` → `build.handoff_ready` and then releases all claims.

### Step 7: Merge Conflict Resolution

Forge and Atlas try to edit the same file.

NeverZero detects the conflict.

ZeroEntropy creates a compressed conflict packet:

```text
Summary: Forge changed consent copy. Atlas changed layout in the same component.
Blocker: Both edits touch onboarding.tsx.
Next: Keep Forge copy first, then apply Atlas layout after review.
```

If an agent needs more information, NeverZero sends only the relevant function,
file section, or decision context.

Output:

- A new `Conflict Resolution Packet` subfile is created.

This proves agents coordinate before GitHub receives the final version.

Current state:

- ✅ Task-level conflict detection exists in the CLI.
- ✅ `lib/file-claims.ts` is the file-level claim store. `POST /api/orgs/<slug>/file-claims`
  attempts a claim and, on a collision with a different agent, returns HTTP 409
  AND auto-generates a `Conflict Resolution Packet: <filePath>` subfile under
  the brain root, listing both claimants, their reasons, and a recommended
  resolution. ZeroEntropy compression flows through `lib/adapters/zeroentropy.ts`
  for both context.update broadcasts and resume packets.

### Step 8: Show Live Implementation

After conflict resolution, show:

- Implementation complete.
- Conflict resolved.
- Preview ready.
- Final output generated.

The main doc shows the clean final state.

Current state:

- ✅ The workstation UI displays the build subfile body with its live ledger.
- ✅ Build "preview" surface = the Build subfile's Ledger section + the
  resulting Conflict Resolution / Resume / GitHub Bundle subfiles. Real binary
  preview is out of scope for this demo; the artifacts ARE the proof.

### Step 9: Live Work Ledger

Show the ledger in the current document UI.

It should show:

- Iris ran The Hog research.
- Research Findings subfile created.
- Loop verified the findings.
- Forge and Atlas started build work.
- Conflict detected.
- ZeroEntropy created conflict packet.
- Agents resolved conflict.
- GBrain saved memory.
- Resume packet generated.

Current state:

- CLI `ledger.ndjson` exists.
- In-memory SSE events exist for research/org events.
- The document UI still needs a unified ledger panel backed by these events.

### Step 10: Resume And Handoff

Type:

```text
@Beam /resume current project state
```

Required behavior:

- ZeroEntropy compresses the full room history.
- GBrain stores it as durable memory.
- A new `Resume Packet` subfile is created.

The packet includes:

- Goal
- Current state
- Completed work
- Open blockers
- Conflict resolution
- Next action

Then show a new agent joining and continuing from the resume packet.

Current state:

- ✅ CLI handoff/resume packets work locally.
- ✅ `/api/context` gives registered agents cold-start context.
- ✅ `POST /api/orgs/<slug>/resume` snapshots the room (goal, completed work,
  held file claims, active agents, pinned memory, blockers, next action) into
  a `Resume Packet: <timestamp>Z` subfile. The Hand off button in the brain
  topbar triggers it and navigates the user to the new packet. Compression
  flows through `lib/adapters/zeroentropy.ts`; persistence through
  `lib/adapters/gbrain.ts`.

## What The Demo Proves

1. Agents are registered: every agent and subagent is visible.
2. Agents are addressable: users can mention registered agents with `@Iris`,
   `@Forge`, or any active agent.
3. Sponsors are real skills: The Hog, ZeroEntropy, GStack, and GBrain are
   callable through `/skill-name`.
4. The doc stays clean: heavy outputs become separate subfiles.
5. Context is shared live: agents receive compressed context from each other
   instead of reading one giant memory file.
6. Memory is durable: decisions, blockers, failed attempts, and handoff packets
   are saved.
7. Work is coordinated: agents claim tasks and resolve conflicts before final
   output reaches GitHub.
8. Handoff works: a new agent, device, or session can continue from room state.
9. GitHub stays clean: only the final coordinated implementation is committed.

## Gap Analysis

### Demo-Ready Or Mostly Ready

- ✅ Landing and workstation visuals.
- ✅ Agent registration and API-key bootstrap.
- ✅ Org routes and org brain (now with the workstation UI shell + real data).
- ✅ Living document editor.
- ✅ Skill creation to real `SKILL.md` files.
- ✅ CLI room, ledger, memory, handoff, resume, and conflict-check.
- ✅ Authenticated cold-start context endpoint.
- ✅ The Hog-backed research path with SSE progress and research report pages.
- ✅ Provider catalog with per-org install state and 22 skills.
- ✅ Doc-as-command surface with `@agent` + `/skill` autocomplete and skill-
  driven subfile creation.
- ✅ Unified live work ledger inside the document UI (right rail Activity tab).

### Needs Wiring For The Demo

- ✅ `@agent` picker in the compose/editor command surface.
- ✅ Main-doc clean output cards that link to generated subfiles.
- ✅ `/verify` endpoint and `Verification Report` subfile — `POST /api/orgs/<slug>/verify`
  with `{ subfileId }` nests the report under the target research subfile and
  annotates the research with the verdict + back-link.
- ✅ `/build` endpoint claims work via `lib/file-claims.ts`, emits `build.*`
  ledger events on the org SSE channel, and inlines the rows in the Build subfile.
- ✅ Subagent registration: `Agent.parentAgentId` field + `POST /api/orgs/<slug>/spawn`
  creates child agents, broadcasts `agent.spawned`, writes a Subagent subfile.
- ✅ File-level conflict detection: `lib/file-claims.ts` + `POST /api/orgs/<slug>/file-claims`.
  On collision: HTTP 409 + auto-generated `Conflict Resolution Packet: <filePath>` subfile.
- ✅ UI handoff: **Hand off** button in the brain topbar calls `/resume` and
  routes the user to the new Resume Packet subfile.
- ✅ Unified live work ledger in the document UI (right rail Activity tab on
  `/<org>/brain` shows subfile creation + research events in real time).
- ✅ **Push to GitHub** button in the brain topbar calls `/api/orgs/<slug>/github`,
  bundles the room state into a `GitHub Bundle: <branch>` subfile, and returns
  a `https://github.com/<repo>/compare/main...<branch>` URL the user can open
  to finish the PR by hand.

### Still Mocked Or Deferred

- Real ZeroEntropy API calls — routed through `lib/adapters/zeroentropy.ts`;
  function body is a local compressor today.
- Real GBrain memory backend — routed through `lib/adapters/gbrain.ts`;
  function body writes to `data/orgs.json` today.
- Real GStack runtime bridge — routed through `lib/adapters/gstack.ts`;
  claims hit the local file-claims store, progress hits the in-process bus.
- Real GitHub PR/commit integration — the `/github` endpoint builds the
  bundle subfile and returns a compare URL the user opens themselves; no
  server-side `git push` happens. Good enough for the demo proof; swap the
  endpoint to gh-cli or Octokit for a real PR.
- Native mobile app.
- Production realtime sync across processes/devices.

## Prioritized Demo Punch List

### P0: Must Land

1. ✅ Add `@agent` picker to the compose surface (lives on `/<org>/brain`).
2. ✅ Make `/research` create or link a `Research Findings` subfile from the main
   doc (lives in the doc tree as `Research: <topic>`).
3. ✅ `/verify` endpoint generates `Verification Report` (nested under target research).
4. ✅ `/build` wires task claims, `build.*` progress events, and ledger rows.
5. ✅ File-level conflict demo generates `Conflict Resolution Packet` on 409.
6. ✅ `Hand off` button on the brain topbar generates `Resume Packet`.
7. ✅ Show a unified live ledger inside the document UI (right rail Activity
   tab on `/<org>/brain`, refreshed on org SSE).

### P1: High Value

1. ✅ `parentAgentId` on Agent + `POST /api/orgs/<slug>/spawn` for subagent trees.
2. ✅ ZeroEntropy adapter at `lib/adapters/zeroentropy.ts` (labeled, body still local).
3. ✅ GBrain adapter at `lib/adapters/gbrain.ts` — `/remember` and `/pin` writes
   flow through `pinMemory()` into the org's pinned memory list.
4. ✅ `Push to GitHub` button on the brain topbar bundles room state into a
   `GitHub Bundle` subfile and returns a compare URL.

### P2: Cut For Hackathon Unless Already Done

1. Native mobile app.
2. Production WebSocket/pub-sub architecture.
3. Full Git merge conflict automation.
4. SOC2/RBAC/SSO.
5. Billing or account management.

## Percent Done

For the focused hackathon demo:

- Frontend visual surface: about 95%.
- CLI local context engine: about 100% for v0.1.
- Backend registration/context/research APIs: about 95% (verify / build / spawn
  / resume / file-claims / github now all live and exercised end-to-end).
- Sponsor integrations: about 60% — every provider has a single labeled
  adapter module that every call routes through. Real external HTTP calls
  remain for ZeroEntropy / GBrain / GStack runtime, but the wiring is one
  function-body swap away.
- Live multi-agent document sync: about 30% — org SSE fans `build.*` ledger
  rows, file-claim conflicts, and resume creation to every subscribed client.
  Document content is still localStorage-backed.
- Mobile: 0% for this demo path.

Overall demo readiness: ~92%. Every visible action in the demo flow has a real
endpoint, produces a real subfile, and was verified end-to-end via curl on a
running dev server (build 23 routes pass; spawn/verify/build/file-claims/resume/
github all return their expected artifacts with correct status codes).

