# System Memory

Generated on 2026-05-16 for the workspace:
`C:\Users\ayush\Desktop\Hackathons\YC\05-16-2026\Gstack x Gbrain`

This file captures the current repository memory so a future agent can resume
without rediscovering the same context.

## Health And Repo State

- This folder is a Git repository. There may be unrelated uncommitted edits from
  prior work; do not revert them unless explicitly asked.
- The repository is now a Next app with `package.json`, `pnpm-lock.yaml`,
  `next.config.ts`, `tsconfig.json`, `app/`, and `node_modules/`.
- The current app stack is Next.js 16.2.6, React 19.2.0, and TypeScript 5.7.
- No `.nz/` runtime state directory exists in the repository root yet, but the
  repo-local `cli/` package can create and operate one in any target project.
- No fixture directory exists yet.
- Port 3000 is used by this workspace's Next dev server. Other node and python
  processes appear to be MCP/tooling services and should be left untouched
  unless a future health check proves otherwise.
- The main memory file now lives at `memory/memory.md`.
- Per-feature memory files belong under `memory/features/`.
- Root `AGENTS.md` defines the memory documentation rules agents must follow at
  the beginning of each task.
- Top-level workstation files match the corresponding files under
  `design-pkg/neverzero-cloud/project/` by SHA-256 hash.
- Mobile prototype files exist only under `design-pkg/neverzero-cloud/project/`.
- `design` and `design.gz` appear to be exported design artifacts.

## Memory Documentation Structure

- `memory/memory.md` is the main system memory for repo-wide context, product
  intent, architecture, contracts, and cross-feature decisions.
- `memory/features/` stores feature-specific memory files.
- Each feature memory file should be named `memory/features/<feature-name>.md`,
  using lowercase kebab-case for `<feature-name>`.
- Agents should update memory documentation during the same task that changes
  behavior, feature scope, repository structure, or implementation intent.
- For repo-wide changes, update this file. For named features, create or update
  the matching file under `memory/features/`.

## Product Identity

- Product name in the design bundle: NeverZero Workstation / NeverZero Mission Control.
- Core pitch: "Git for agent context."
- Product purpose: a control plane / shared workspace for AI-native engineering teams
  where humans and agents coordinate work, preserve project memory, and resume across
  sessions and runtimes.
- The product should make AI work feel multiplayer: agents register in one room, claim
  work, avoid conflicts, append events, preserve decisions, and hand off resumable state.
- The UI direction from the design chat is white background, minimalism, quiet hairlines,
  generous whitespace, Geist type, near-black ink, and low-chroma agent identity colors.
- The current hackathon source of truth is `feature-list.md`. Optimize for the
  demo flow in that file before broad production roadmap work: registered
  agents, sponsor skills, linked subfiles, compressed context, conflict
  coordination, live ledger, and resume handoff.

## Workstream Split From Design Notes

Ayush/core workstream:

- Own the local-first primitives for the hackathon demo.
- Build `.nz/` as the single source of truth.
- Build a small `nz` CLI.
- Keep GBrain optional until the local flow works.
- Do not own full UI polish, mobile demo, The Hog workflow, SaaS auth, billing, Docker,
  or production conflict resolution.

Teammate/demo workstream:

- Own the demo dashboard and visualization surfaces.
- Render agent registry, ledger timeline, memory, latest handoff packet, conflict demo,
  and sponsor status strip.
- Build against local JSON/NDJSON fixtures first.
- Keep sponsor APIs behind mockable wrappers and show local fallback states if credentials
  are unavailable.

## Required Local State Contract

The intended demo state shape is:

```text
.nz/
  room.json
  ledger.ndjson
  memory.json
  handoff/
    latest.nzr.json
```

`room.json` should store active agent presence:

- `room_id`
- `project`
- `agents[]`
- agent fields: `id`, `name`, `runtime`, `machine`, `status`, `current_task`,
  `last_heartbeat`

`ledger.ndjson` should append one JSON event per line. Important event types:

- `agent_joined`
- `heartbeat`
- `task_claimed`
- `task_released`
- `decision`
- `failure`
- `handoff_created`
- `resume_consumed`
- optional demo events such as `conflict_detected` and `research_evidence`

`memory.json` should persist:

- goals
- constraints
- decisions with reasons
- rejected approaches
- files touched
- agent capabilities

`handoff/latest.nzr.json` should contain:

- goal
- current_state
- completed_work
- open_tasks
- decisions
- failed_attempts
- next_best_action
- memory_pointers

## Required CLI Surface

Minimum intended `nz` commands:

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

Nice-to-have commands:

```text
nz status
nz conflict-check --task <task>
```

## Cloud Agent Bootstrap Contract

The `/install` route now implements the cloud bootstrap path for preventing
agent amnesia across Codex, Claude, Cursor, VS Code, Windsurf, Aider, and other
agent runtimes. The UI now leads with a single copyable bootstrap prompt that
the agent can execute end to end, instead of forcing the user through the old
five-step key/config/prompt/identity/smoke-test sequence.

Working cloud endpoints:

```text
POST /api/agents
GET  /api/context
POST /api/agents/<agent-id>/heartbeat
POST /api/agents/<agent-id>/handoff
```

`POST /api/agents` mints a one-time `nz_live_*` key for one agent install. The
key authenticates the caller. The agent identity and heartbeat payload
differentiate the install/session by `agent_id`, `agent_from`, runtime, machine,
workspace, fresh `session_id`, capabilities, current task, and heartbeat time.
Public agent responses are sanitized: only `apiKeyPrefix` is returned after
registration, never `apiKeyHash`, scopes, or the full key. Generated config
blocks use placeholders so the full key appears only in the one-time `apiKey`
field or one-time browser key card.

`GET /api/context` requires `Authorization: Bearer <key>` and returns workspace
metadata, pinned memories, active agents, open tasks, blockers, handoffs,
decisions, recent workspace-ledger events, a `coldStartSummary`, and a protocol
object. Every generated bootstrap prompt and root `AGENTS.md` tell the agent to
fetch this endpoint before analysis, edits, tool calls, or answers in every new
session.

`POST /api/agents/<agent-id>/heartbeat` requires the same key for the same agent
id, marks the agent connected, updates `lastSeenAt`, and stores heartbeat
metadata. The generated prompt uses a 60 second heartbeat cadence.

`POST /api/agents/<agent-id>/handoff` requires the same key and appends a
resumable handoff event with goal, current state, completed work, blockers, files
touched, decisions, and next action.

`data/workspace-ledger.ndjson` is the append-only cloud-demo ledger. It records
`agent_registered`, `context_fetch`, `heartbeat`, and `handoff_created` events
for cold start, smoke tests, and later UI surfaces. It is ignored by git like
`data/agents.json`.

Root `AGENTS.md` now contains the secret-free NeverZero cold-start protocol. It
references `NEVERZERO_*` env vars only; the full API key must live in shell env,
secure local config, or ignored local env files such as `.neverzero.local.env`.
Codex/GStack on this workstation is installed as agent `agt_771ad38edd92` for
workspace `atlas`, with key prefix `nz_live_3730`. The full key is stored only
in the ignored `.neverzero.local.env`; `.gitignore` covers both
`.neverzero.local.env` and `.env.neverzero.local`. On 2026-05-17 UTC, the agent
reused that stable identity, fetched `/api/context`, and posted heartbeat
session `480676a0-09ad-4c63-9631-4c4e1f16c9d4` for the task "connect NeverZero
cold start and heartbeat".

Raw PowerShell wrappers `codexed` and `clauded` do not register on their own;
they currently expand to `codex --dangerously-bypass-approvals-and-sandbox` and
`claude --dangerously-skip-permissions`. The NeverZero bootstrap protocol must
run around those wrappers to create the key, fetch `/api/context`, and post the
heartbeat.

The agent JSON store now serializes mutations with `data/agents.json.lock` and
atomic temp-file rename. A three-terminal registration test found that
concurrent `POST /api/agents` calls could otherwise corrupt `data/agents.json`.
After the fix, two `codexed` sessions and one `clauded` session registered in
`atlas` with distinct connected agent records and fresh `session_id` metadata.

API QA on 2026-05-17 registered a temporary `codex` smoke agent, fetched context,
posted heartbeat, posted handoff, verified the workspace ledger events, verified
secret material was not exposed by public agent responses, and confirmed
`/atlas/agents` rendered the active task. The test restored `data/agents.json`
and `data/workspace-ledger.ndjson` afterward.

## Sponsor Boundaries

- GBrain: primary memory backend candidate, but local JSON must remain the fallback and
  should work first.
- ZeroEntropy: optional compression hook, likely exposed as `nz handoff --compress`.
- The Hog: optional research/review event source; not required for the core path.
- GStack: useful as an agent runtime / registration surface, but the CLI contract should
  not assume GStack-only behavior.
- Lightsprint appears in the prototype as a deployment provider, not in the core contract.

## Current Files

Active Next app:

- `app/page.tsx` is the landing route.
- `app/landing.css` styles the marketing landing page. Its hero section uses a
  desktop two-column grid so the live workstation demo card does not overlap the
  headline, then stacks the demo below the copy on narrower screens. Mobile
  rules keep the nav CTA, hero footnotes, and demo chrome within a 390px viewport.
- `app/_components/HeroDemo.tsx` renders the animated workstation card in the
  landing hero.
- `app/doc-minimal/page.tsx` renders the living document route.
- `app/doc-minimal/_components/LivingDoc.tsx` contains the editable Notion-like
  block editor for `/doc-minimal`. It now supports a blank mode and
  route-specific storage namespace/label props so org workstation routes can
  reuse the upgraded editor without inheriting seeded demo content.
- `app/doc-minimal/doc-minimal.css` styles the living document editor.
- `app/api/skills/route.ts` lists repo-local skills and creates
  `skills/<skill-name>/SKILL.md` files from `/create-skill`.
- `app/install/page.tsx` renders the install route. It now generates a
  single-prompt installer, optional browser-generated key fallback, secure
  environment/config template, AGENTS.md protocol preview, identity JSON, and
  smoke-test commands for each supported agent runtime so new sessions fetch
  NeverZero context before doing work.
- `app/install/install.css` styles the install docs route, registration form,
  key card, identity grid, code blocks, and mobile rules that keep the runtime
  cards and nav within a 390px viewport.
- `app/docs/install/page.tsx` re-exports `/install` as the canonical docs URL,
  and `app/[org]/install/page.tsx` reuses the named `InstallApp` export for
  org-scoped install pages without rendering the old register modal.
- `app/api/context/route.ts` is the key-authenticated cold-start context endpoint.
- `app/api/agents/[id]/heartbeat/route.ts` is the key-authenticated heartbeat
  endpoint for active agent sessions.
- `app/api/agents/[id]/handoff/route.ts` is the key-authenticated handoff
  endpoint for resumable agent exits.
- `lib/workspace-ledger.ts` appends and reads recent cloud-demo ledger events
  from `data/workspace-ledger.ndjson`.
- `lib/agents.ts` supports `codex` agents, one-time key hashing/authentication,
  heartbeat metadata updates, file-backed demo persistence, and serialized
  atomic writes for concurrent agent registration.
- `app/icon.svg` provides the app icon used by browser metadata.
- `app/workstation/page.tsx` and `app/workstation/_client/` contain the richer
  workstation prototype route.
- `app/[org]/workstation/page.tsx` renders the org-scoped workstation route,
  validates the org slug, and embeds `LivingDoc` in blank mode at routes such
  as `/atlas/workstation`.
- `app/[org]/brain/page.tsx` and `app/[org]/docs/[id]/page.tsx` use the
  `BrainWorkstation` shell with a server-backed company brain file tree. The
  sidebar can create subfiles through `POST /api/orgs/<slug>/docs` and delete
  subfiles through `DELETE /api/orgs/<slug>/docs/<id>`.
- `lib/docs.ts` owns the file-backed org document tree in `data/docs.json`,
  including root brain creation, subfile creation/update, and recursive subfile
  deletion.
- `app/workstation/_client/data.ts` exports shared agent roster data plus
  dynamic presence helpers for selecting the top 5 active attached agents.
- `app/signin/page.tsx` contains the sign-in route.

Feature memory files:

- `memory/features/memory-documentation.md`
- `memory/features/doc-minimal-living-doc.md`
- `memory/features/dynamic-agent-presence.md`
- `memory/features/install-page.md`
- `memory/features/brain-file-sidebar.md`
- `memory/features/org-workstation.md`
- `memory/features/demo-flow.md`

Demo planning docs:

- `feature-list.md` is the combined feature inventory, sponsor-skill map, gap
  analysis, and prioritized demo punch list.

Root workstation prototype:

- `NeverZero Workstation.html` loads React 18, ReactDOM, Babel standalone, `styles.css`,
  `tweaks-panel.jsx`, `icons.jsx`, `data.jsx`, `doc.jsx`, `doc-blocks.jsx`, `shell.jsx`,
  and `app.jsx`.
- `app.jsx` is the root workstation component. It wires tweak state, palette state,
  rail state, focused agent, plan todos, context compression simulation, and animated
  agent cursors.
- `shell.jsx` defines `TopBar`, `Sidebar`, `RightRail`, `ActivityList`, `AgentInspector`,
  `MemoryPanel`, `ContextPanel`, `Compose`, `SkillPalette`, and `MobilePop`.
- `doc.jsx` defines document-level components: `ContextStrip`, `StatusStrip`, `Todo`,
  and `TodoList`.
- `doc-blocks.jsx` defines embedded blocks: `AgentBlock`, `DecisionLog`, `MemoryBlock`,
  `SkillsRow`, and `ContinueBanner`.
- `data.jsx` defines static `AGENTS`, `PEOPLE`, `SKILLS`, `EVENTS`, and `MEMORY`, then
  attaches them to `window`.
- `icons.jsx` defines inline SVG icon components and attaches `Icons` to `window`.
- `tweaks-panel.jsx` provides the design-tool tweak panel and localStorage-backed edit
  controls.
- `styles.css` implements the desktop workstation visual system.

Other root prototype:

- `NeverZero Doc - Minimal.html` is a standalone minimal document prototype with inline
  CSS/JS and no React component graph.

Packaged design bundle:

- `design-pkg/neverzero-cloud/README.md` identifies the folder as a Claude Design handoff
  bundle and says to read chat transcripts before implementation.
- `design-pkg/neverzero-cloud/chats/chat1.md` records the design conversation. It covers
  workstation creation, mobile companion creation, verifier pass, and ends with a user
  request for a landing page.
- `design-pkg/neverzero-cloud/project/` contains the duplicated workstation files plus
  mobile-only prototype files.

Mobile-only packaged files:

- `NeverZero Mobile.html` loads React 18, ReactDOM, Babel standalone, `mobile.css`,
  `ios-frame.jsx`, `data.jsx`, `mobile-icons.jsx`, `mobile-screens.jsx`,
  `mobile-sheets.jsx`, and `mobile-app.jsx`.
- `mobile-app.jsx` wires the iOS-style app shell, tabs, compose sheet, agent detail sheet,
  and responsive phone scaling.
- `mobile-screens.jsx` defines Today, Doc, Agents, and Activity screens.
- `mobile-sheets.jsx` defines the compose sheet, agent detail sheet, and bottom tab bar.
- `ios-frame.jsx` provides the iOS device/status/nav/list/keyboard frame components.
- `mobile-icons.jsx` defines mobile icon components.
- `mobile.css` implements the mobile visual system.

## Prototype Behavior Implemented

Desktop workstation:

- Notion-style project document for "Atlas Q3 Launch".
- Top bar with workspace breadcrumbs, human and agent presence, search, sync, share, and
  overflow controls.
- Sidebar with workspace navigation, project tree, attached agents, and sponsor strip.
- Living document with status strip, plan todos, embedded live agent block, decision log,
  project memory pins, skills row, and continue-on-mobile banner.
- Right rail tabs for Activity, Agent, Memory, and Context.
- Compose bar with `/` skill palette invocation.
- Keyboard shortcut `Cmd/Ctrl+K` opens the skill palette.
- `Compress old turns` simulates context compression from 84 percent to 38 percent.
- Agent cursors animate over the document when enabled.
- Top bar and "Agents on this doc" presence surfaces are dynamic: they use the
  registered agent roster, rank active attached agents, and show at most 5.
- Tweaks panel controls density, right rail visibility, agent cursor visibility, and
  compression action.

Mobile prototype:

- iPhone-style shell with Today, Doc, Agents, and Activity tabs.
- Center FAB opens compose sheet.
- Agent rows open an agent detail sheet.
- Shares data with the desktop prototype through `data.jsx`.
- Intended to communicate continuity: same agents, project, context, and memory across
  laptop and mobile.

## Static Data In Current Prototype

Agents:

- Iris: research-agent, provider ZeroEntropy, working.
- Forge: build-agent, provider GStack, working.
- Atlas: planning-agent, provider GBrain, idle.
- Loop: review-agent, provider The Hog, idle.
- Beam: deploy-agent, provider Lightsprint, idle.

People:

- Sam Aoki, PM.
- Yuna Park, Design.
- Diego Marin, Eng lead.
- Priya Shah, GTM.

Skills include plan, decompose, research, compete, interview, scaffold, refactor,
review, factcheck, redteam, remember, recall, compress, and deploy.

Pinned memory items include:

- Pricing has Solo, Team, and Workspace tiers; Workspace gets agent SSO and shared memory.
- Onboarding must show one real agent doing real work within 60 seconds.
- Brand voice should say "agent" or agent names, not "AI assistant".

## Gaps To Close Next

- The repo-local CLI now exists and its e2e suite covers `init`, `join`, `claim`,
  `log`, `handoff`, `resume`, `status`, and dispatcher behavior. Remaining CLI
  work is hardening, packaging, and deciding whether global install/linking is in
  scope for the demo.
- The `.nz/` local state store is implemented inside `cli/src/store/`, but no
  `.nz/` runtime directory has been initialized in the repository root.
- The Next workstation UI still does not read live `.nz/room.json`,
  `.nz/ledger.ndjson`, `.nz/memory.json`, or `.nz/handoff/latest.nzr.json`.
- There are no dashboard fixtures yet.
- There is no GBrain adapter boundary yet.
- The install page is now aligned to the single-prompt cloud bootstrap path, and
  cloud handoffs are backed by the workspace ledger. Remaining install work is
  deciding whether a dedicated decision-write endpoint is needed and how the
  repo-local `.nz` CLI syncs with the cloud endpoints.
- The landing page exists. Remaining landing work is content and interaction polish,
  not initial file creation.
- The existing prototypes are browser-loaded React/Babel files and should be treated as
  design prototypes, not production architecture.

## Continuation Guidance

- For the immediate hackathon work, use `feature-list.md` as the active demo
  source of truth. The goal is not to finish the whole product; it is to make
  the visible demo flow work properly end to end.
- If implementing core demo behavior, start with local `.nz/` files and the `nz` CLI
  before any sponsor integration.
- If implementing UI, build against the `.nz/` contract or matching fixture files and
  keep the first screen operational rather than marketing-heavy.
- Keep dependencies minimal until the demo primitives work.
- Preserve the visual language already established: white, minimal, hairline borders,
  Geist type, compact operational surfaces, and low-chroma agent identity colors.
- Ask before changing architecture, adding a framework, adding a database, or making a
  sponsor API mandatory.
