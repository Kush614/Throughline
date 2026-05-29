# Install Page

## Purpose

The install page connects a specific agent or IDE to a NeverZero workspace with
enough durable instructions that new sessions do not start with amnesia.

Each install should identify the agent/runtime, mint or reuse a workspace-scoped
key, and produce one copyable bootstrap prompt that makes the agent complete the
setup itself, fetch workspace context before doing work, heartbeat while active,
and write a handoff before exit.

## Current State

`/install`, `/docs/install`, and `/[org]/install` now render the no-amnesia
bootstrap flow instead of the old local-only CLI walkthrough or old register
modal.

The page supports Codex/GStack, Claude Code, Claude Desktop, Cursor, VS Code,
Windsurf, Continue.dev, Zed, Antigravity, Aider, and custom REST runners.

The primary working flow is now one prompt:

```text
1. Select an agent runtime.
2. Enter workspace, owner, agent name, machine, OS, capabilities, and current task.
3. Copy the one-prompt installer into the selected agent/IDE.
4. The agent registers itself with POST /api/agents if no stable install exists.
5. The agent stores NEVERZERO_API_KEY only in env/secure config/ignored local env.
6. The agent updates AGENTS.md with the secret-free cold-start protocol.
7. The agent creates runtime pointer instructions when a runtime does not
   automatically load AGENTS.md.
8. The agent fetches GET /api/context and posts the first heartbeat.
```

The optional browser-generated-key section still exists as a fallback and preview,
but it is no longer the required five-step path.

The generated prompt and root `AGENTS.md` protocol require every new session to:

- authenticate with `Authorization: Bearer $NEVERZERO_API_KEY`
- fetch `/api/context` before analysis, planning, edits, shell commands, or answers
- read `coldStartSummary`, workspace memories, active agents, open tasks, blockers,
  handoffs, decisions, recent ledger events, and protocol
- refuse to proceed silently if the context fetch fails
- post heartbeat every 60 seconds with `agent_id`, runtime, machine, `session_id`,
  current task, capabilities, project path, status, and parent agent id when
  applicable
- write a handoff before stopping when that runtime has the capability

Terminal QA on 2026-05-16 verified the bootstrap behavior with three isolated
PowerShell processes in the `atlas` workspace: two `codexed` wrappers and one
`clauded` wrapper. Raw `codexed --version` and `clauded --version` calls do not
register by themselves because those wrappers only expand to the underlying
agent CLIs. When the bootstrap protocol is run around them, all three processes
registered, fetched context, and heartbeated as connected agents with distinct
agent ids and `session_id` values.

API QA on 2026-05-17 verified the single-prompt contract by registering a
temporary `codex` agent, confirming public agent responses do not expose
`apiKeyHash`, fetching `/api/context`, posting heartbeat, posting handoff,
confirming `agent_registered`, `context_fetch`, `heartbeat`, and
`handoff_created` events in `data/workspace-ledger.ndjson`, and checking
`/atlas/agents` rendered the active task. The test backed up and restored
`data/agents.json` and `data/workspace-ledger.ndjson`.

Browser QA on 2026-05-17 verified `/atlas/install` renders the single prompt,
optional browser key path, smoke test, `NEVERZERO_HANDOFF_URL`, and valid
heartbeat JSON without the earlier trailing comma. `/atlas/agents` renders
runtime/machine, status, current task, session/capabilities, and key prefix.

Codex/GStack local install on this device is stable as `agt_771ad38edd92` in
workspace `atlas`, owned by `sam`, with safe key prefix `nz_live_3730`. The full
key is stored only in ignored `.neverzero.local.env`, which also contains
context, heartbeat, handoff, workspace, runtime, and agent name config. On
2026-05-17 UTC the agent reused that identity, fetched cold-start context, and
posted heartbeat session `480676a0-09ad-4c63-9631-4c4e1f16c9d4` for the task
"connect NeverZero cold start and heartbeat".

Three-runtime install QA on 2026-05-16 local time registered and verified three
persistent Atlas agents from this workstation:

- `agt_1d908ae46e62`: `Atlas / ayush@MSI / Win32 / Codexed Terminal`, runtime
  `codexed`, key prefix `nz_live_d9b9`.
- `agt_324dd72431a1`: `Atlas / ayush@MSI / Win32 / Claude Code Terminal`,
  runtime `clauded`, key prefix `nz_live_a006`.
- `agt_cdc7c21facda`: `Atlas / ayush@MSI / Win32 / Cursor Agent CLI`, runtime
  `cursor-agent`, key prefix `nz_live_227d`.

The script checked local runtime versions, registered each agent, fetched
`/api/context`, posted heartbeat, posted handoff, and posted a final heartbeat
so each row remained connected in `/atlas/agents`. The full API keys were kept
process-local and were not written to shared files or memory.

## Files And Entry Points

- `app/install/page.tsx`: client install flow, runtime cards, one-prompt
  installer, optional browser registration form, secure config template,
  AGENTS.md protocol preview, identity JSON, and smoke-test snippets.
- `app/install/install.css`: install page layout, form, key card, identity grid,
  code blocks, and responsive rules.
- `app/docs/install/page.tsx`: canonical docs route that reuses `/install`.
- `app/[org]/install/page.tsx`: org-scoped route that reuses `InstallApp` and no
  longer renders the old `RegisterPanel` modal.
- `app/api/agents/route.ts`: creates agent records and now accepts `codex` as a
  valid client.
- `app/api/context/route.ts`: key-authenticated cold-start context endpoint.
- `app/api/agents/[id]/heartbeat/route.ts`: key-authenticated heartbeat endpoint.
- `app/api/agents/[id]/handoff/route.ts`: key-authenticated handoff endpoint.
- `lib/workspace-ledger.ts`: append/read helper for the file-backed workspace
  event ledger at `data/workspace-ledger.ndjson`.
- `lib/agents.ts`: file-backed agent store, API key hashing/authentication,
  heartbeat updates, metadata normalization, `codex` client support, and a
  lock/atomic-write layer for concurrent terminal registration.
- `app/agents/page.tsx` and `app/[org]/agents/page.tsx`: display `codex` agent
  labels plus runtime, machine, current task, session id, capabilities, parent
  agent id, status, and safe key prefix in the registry.
- `AGENTS.md`: repo-level NeverZero cold-start, heartbeat, handoff, and security
  protocol. It references only env vars and never contains the full key.

## Decisions

- The API key authenticates the caller; the heartbeat identity payload
  differentiates the specific install/session by agent id, runtime, machine,
  session id, capabilities, current task, and heartbeat time.
- The full API key appears only in the one-time `apiKey` field returned during
  registration. Public agent responses are sanitized and expose only
  `apiKeyPrefix`; generated config blocks use placeholders instead of repeating
  the full key.
- Cold start is a protocol requirement, not optional copy. The generated prompt
  explicitly says not to proceed from memory alone.
- `AGENTS.md` holds the shared protocol, while per-agent secrets live in shell
  env, secure local config, or ignored files such as `.neverzero.local.env`.
- `session_id` is intentionally generated fresh for every reopened session so
  the same agent install can have multiple distinct runs.
- The old org-scoped register panel was removed from `/[org]/install`; the single
  install page now owns key generation and prompt generation.
- API smoke tests should backup and restore `data/agents.json` and
  `data/workspace-ledger.ndjson` so temporary keys and events do not pollute demo
  data.
- Concurrent registration must go through the `lib/agents.ts` lock path. A
  direct file-backed read-modify-write race corrupted `data/agents.json` during
  a three-terminal spawn test, so the store now serializes mutations and writes
  via temp-file rename.

## Open Tasks

- Decide whether a dedicated decision-write endpoint is needed or whether
  handoff `decisions_made` plus org memories are enough for the demo.
- Decide whether the repo-local `.nz` CLI should sync to these cloud endpoints
  or remain a local fallback.
- Replace file-backed JSON stores with a database before production use.
