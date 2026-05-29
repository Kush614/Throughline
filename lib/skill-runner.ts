// Generic skill executor. Each skill invocation:
//  1. Creates a subfile DocNode under the org's brain root with status=running.
//  2. Runs the executor for the skill's kind. Executors append markdown to
//     the subfile, optionally calling out to existing services (e.g. Hog
//     research). They're heuristic — good enough to demo, no LLMs required.
//  3. Marks the subfile done and broadcasts a context.update to every agent
//     in the org so downstream agents see the new artifact instantly.

import { listAgents } from './agents';
import { createDoc, ensureBrainRoot, updateDoc, type DocNode, type SkillRunMeta } from './docs';
import { publish } from './events';
import { findSkill, type SkillDef } from './providers';
import { orgChannel, startResearch } from './research';
import { compress as zeCompress } from './adapters/zeroentropy';
import { ingestMemorySafe, type MemoryKind } from './adapters/xtrace';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Which completed skills become durable workspace memory in XTrace, and how
// their output is classified. Skills that are pure mechanics (scaffold, lint,
// deploy…) return null and are not ingested — only knowledge is remembered.
function memoryKindForSkill(kind: string): MemoryKind | null {
  switch (kind) {
    case 'remember':
    case 'pin':
      return 'decision';
    case 'research':
    case 'recall':
    case 'factcheck':
    case 'review':
    case 'compete':
    case 'redteam':
    case 'verify':
      return 'finding';
    case 'plan':
    case 'estimate':
    case 'schedule':
    case 'decompose':
      return 'fact';
    case 'handoff':
      return 'handoff';
    case 'resume':
      return 'resume';
    case 'build':
      return 'build';
    default:
      return null;
  }
}

export interface RunSkillInput {
  orgSlug: string;
  skillIdOrCommand: string;
  task: string;
  parentId?: string | null;
  requestedBy?: string;
  mentionedAgents?: { id: string; name: string }[];
}

export async function runSkill(input: RunSkillInput): Promise<DocNode> {
  const skill = findSkill(input.skillIdOrCommand);
  if (!skill) throw new Error(`Unknown skill: ${input.skillIdOrCommand}`);
  const task = (input.task || '').trim();
  if (!task) throw new Error('Task description is required.');

  // Resolve the parent — if none given, anchor to the org's brain root.
  let parentId = input.parentId ?? null;
  if (parentId === null) {
    const root = await ensureBrainRoot(input.orgSlug);
    parentId = root.id;
  }

  const skillRun: SkillRunMeta = {
    skillId: skill.id,
    command: skill.command,
    kind: skill.kind,
    task,
    requestedBy: input.requestedBy || 'user',
    mentionedAgents: input.mentionedAgents ?? [],
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  const initialBody = renderHeader(skill, task, skillRun);

  const doc = await createDoc({
    orgSlug: input.orgSlug,
    parentId,
    title: skill.subfileTitleFor(task),
    kind: 'subfile',
    content: initialBody,
    createdBy: skillRun.requestedBy,
    skillRun,
  });

  publish(orgChannel(input.orgSlug), 'skill.started', {
    docId: doc.id, skillId: skill.id, command: skill.command, task, parentId,
  });

  // Fire-and-forget executor. We return immediately so the API responds fast.
  void executeSkill(skill, doc.id, task, input.orgSlug).catch(async (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    const existing = await import('./docs').then((m) => m.getDoc(doc.id));
    if (!existing) return;
    await updateDoc(doc.id, {
      content: existing.content + `\n\n---\n\n**Error**\n\n${msg}`,
      skillRun: { ...existing.skillRun!, status: 'error', completedAt: new Date().toISOString() },
    });
    publish(orgChannel(input.orgSlug), 'skill.error', { docId: doc.id, skillId: skill.id, error: msg });
  });

  return doc;
}

// ─────────────────────────────────────────────────────────────────
// Header + executors
// ─────────────────────────────────────────────────────────────────

function renderHeader(skill: SkillDef, task: string, run: SkillRunMeta): string {
  const mentions = run.mentionedAgents.length
    ? run.mentionedAgents.map((a) => `@${a.name}`).join(' ')
    : '_no agents @-mentioned_';
  return [
    `> **${skill.command}** · provider \`${skill.provider}\` · requested by ${run.requestedBy}`,
    `> ${mentions}`,
    '',
    `## Task`,
    '',
    task,
    '',
    `## Output`,
    '',
    '_Running…_',
    '',
  ].join('\n');
}

async function executeSkill(
  skill: SkillDef,
  docId: string,
  task: string,
  orgSlug: string,
): Promise<void> {
  // For /research we delegate to the existing orchestrator (it ALSO writes the
  // research record + broadcasts to agents; we layer the subfile on top so the
  // doc tree gets a node too).
  if (skill.kind === 'research') {
    await runResearchSkill(docId, task, orgSlug);
  } else {
    await runHeuristicSkill(skill, docId, task, orgSlug);
  }

  // Finalize + broadcast compressed context to every org agent.
  const final = await import('./docs').then((m) => m.getDoc(docId));
  if (!final) return;
  const compressed = compress(final.content, 240);

  // Durable memory: every knowledge-producing skill is remembered in XTrace so
  // a human or a future agent can recall it. Best-effort, never blocks the demo.
  const memKind = memoryKindForSkill(skill.kind);
  if (memKind) {
    const text = memKind === 'finding' ? `${task} — ${compressed}` : task;
    void ingestMemorySafe({
      orgSlug,
      text,
      kind: memKind,
      source: 'skill',
      command: skill.command,
      requestedBy: final.createdBy,
      agentName: final.createdBy,
      subfileId: docId,
      subfileTitle: final.title,
    });
  }

  // Push a context.update per agent (each agent's downstream view shows it).
  const agents = await listAgents({ orgSlug });
  for (const a of agents) {
    publish(orgChannel(orgSlug), 'context.update', {
      target_agent: a.id,
      target_agent_name: a.name,
      docId,
      skillId: skill.id,
      command: skill.command,
      task,
      summary: compressed,
    });
  }
  publish(orgChannel(orgSlug), 'skill.complete', {
    docId, skillId: skill.id, command: skill.command, task,
  });
}

function compress(md: string, maxChars: number): string {
  // Route through the ZeroEntropy adapter so the call site is labeled.
  return zeCompress({ text: md, maxChars });
}

async function runResearchSkill(docId: string, task: string, orgSlug: string): Promise<void> {
  const existing = await import('./docs').then((m) => m.getDoc(docId));
  if (!existing) return;

  // Kick off the existing research orchestrator. It writes to its own store +
  // broadcasts research.* events; we just slot its progress back into the doc.
  const rec = await startResearch({ topic: task, orgSlug, requestedBy: existing.createdBy });

  const research = await import('./research');
  const headerContent = existing.content;
  const deadline = Date.now() + 120_000; // 2-minute safety net; orchestrator usually finishes in <5s
  let lastWrittenBody = '';

  // Stream the subfile body on every poll iteration so it visibly fills in.
  while (Date.now() < deadline) {
    const r = await research.getResearch(rec.id);
    if (!r) break;

    const body = renderResearchSubfileBody(headerContent, r, orgSlug);
    if (body !== lastWrittenBody) {
      await updateDoc(docId, { content: body });
      lastWrittenBody = body;
    }

    if (r.status === 'done' || r.status === 'error') break;
    await sleep(500);
  }

  // Final mark — the subfile body is whatever the last write rendered.
  const final = await research.getResearch(rec.id);
  const finalStatus: 'done' | 'error' = final?.status === 'error' ? 'error' : 'done';
  const updated = await import('./docs').then((m) => m.getDoc(docId));
  if (updated) {
    await updateDoc(docId, {
      skillRun: { ...updated.skillRun!, status: finalStatus, completedAt: new Date().toISOString() },
    });
  }
}

// Render the research subfile body from the current research record. Called on
// every poll iteration so the subfile fills in progressively — header stays
// stable, the body below the `---` rule reflects whatever the orchestrator
// has produced so far (active step, partial findings, partial sources, etc).
function renderResearchSubfileBody(
  header: string,
  r: {
    id: string; topic: string; status: string; error: string | null;
    summary: string; report: string;
    steps: { id: string; label: string; status: string; detail?: string }[];
    findings: { claim: string; evidence?: string }[];
    sources: { title: string; url?: string; note?: string }[];
    hogHits: { companies: unknown[]; people: unknown[] };
  },
  orgSlug: string,
): string {
  const runningStep = r.steps.find((s) => s.status === 'running');
  const doneSteps = r.steps.filter((s) => s.status === 'done');
  const stepGlyph = (s: { status: string }) =>
    s.status === 'done' ? '✓' : s.status === 'running' ? '◐' : s.status === 'error' ? '✗' : '·';

  const statusLine =
    r.status === 'done' ? `_Done — ${doneSteps.length}/${r.steps.length} steps complete._`
    : r.status === 'error' ? `_Errored: ${r.error || 'unknown'}_`
    : runningStep ? `_Running — currently: **${runningStep.label}**_`
    : `_Planning…_`;

  const lines: string[] = [];
  lines.push(header.replace('_Running…_', statusLine).replace('_Done — see linked research record._', statusLine).trimEnd());
  lines.push('');
  lines.push('---');
  lines.push('');

  // Progress block — always present, fills in as steps complete.
  lines.push('### Progress');
  lines.push('');
  for (const s of r.steps) {
    const detail = s.detail ? ` — ${s.detail}` : '';
    lines.push(`- ${stepGlyph(s)} **${s.label}**${detail}`);
  }
  lines.push('');

  // TL;DR — populated as soon as synth step finishes.
  lines.push('### TL;DR');
  lines.push('');
  lines.push(r.summary && r.summary.trim() ? r.summary : '_synthesizing…_');
  lines.push('');

  // Findings — accumulate as synth runs.
  if (r.findings.length > 0) {
    lines.push('### Key findings');
    lines.push('');
    for (const f of r.findings) {
      lines.push(`- ${f.claim}${f.evidence ? ` _(${f.evidence})_` : ''}`);
    }
    lines.push('');
  }

  // Sources — accumulate too.
  if (r.sources.length > 0) {
    lines.push('### Sources');
    lines.push('');
    for (const s of r.sources) {
      lines.push(`- ${s.url ? `[${s.title}](${s.url})` : s.title}${s.note ? ` — _${s.note}_` : ''}`);
    }
    lines.push('');
  }

  // Hog hits — show counts even when zero so the user knows it ran.
  const cN = r.hogHits.companies.length;
  const pN = r.hogHits.people.length;
  if (cN > 0 || pN > 0 || doneSteps.find((s) => s.id === 'hog')) {
    lines.push('### The Hog signal');
    lines.push('');
    lines.push(`- ${cN} company hit${cN === 1 ? '' : 's'} · ${pN} people hit${pN === 1 ? '' : 's'}`);
    lines.push('');
  }

  lines.push(`→ Full report: [/${orgSlug}/research/${r.id}](/${orgSlug}/research/${r.id})`);
  lines.push('');

  if (r.report) {
    lines.push('<details><summary>Inline report</summary>');
    lines.push('');
    lines.push(r.report);
    lines.push('');
    lines.push('</details>');
  }

  return lines.join('\n');
}

async function runHeuristicSkill(
  skill: SkillDef,
  docId: string,
  task: string,
  orgSlug: string,
): Promise<void> {
  // Two-beat: a quick "thinking" then write the structured output.
  await sleep(600);
  const tmpl = TEMPLATES[skill.kind] ?? TEMPLATES.generic;
  const body = tmpl(task, orgSlug);
  const existing = await import('./docs').then((m) => m.getDoc(docId));
  if (!existing) return;
  await updateDoc(docId, {
    content: existing.content.replace('_Running…_', body),
    skillRun: { ...existing.skillRun!, status: 'done', completedAt: new Date().toISOString() },
  });
  // Durable persistence to XTrace happens centrally in executeSkill's finalize
  // step (see memoryKindForSkill) — every knowledge skill, not just /remember.
}

// Markdown templates — keep them tight, opinionated, and structured.
// All take (task, orgSlug) but most just use task.
type TmplFn = (task: string, orgSlug: string) => string;

const TEMPLATES: Record<string, TmplFn> = {
  plan: (t) => `**Plan for ${esc(t)}**

| # | Step | Owner | When |
|---|------|-------|------|
| 1 | Lock the scope — what's in vs out | PM | day 0 |
| 2 | Stand up the scaffold + auth | Forge | day 1–2 |
| 3 | Wire the happy path + 3 edge cases | Forge | day 2–4 |
| 4 | Internal review against the brain | Loop | day 5 |
| 5 | Ship to 5% canary on Lightsprint | Beam | day 6 |
| 6 | Ramp to 100% if SLOs hold | Beam | day 7 |

**Risks**: spec drift · oncall rotation · unclear owners.
**Done when**: all 6 rows have ✓, decision logged, memory pinned.`,

  decompose: (t) => `**Sub-tasks for ${esc(t)}**

- [ ] Pre-work: read the brain for prior decisions on this surface
- [ ] T1: minimal end-to-end happy path (server stub OK)
- [ ] T2: replace stubs with real backend
- [ ] T3: cover edge cases (auth, empty state, conflict, retry)
- [ ] T4: write tests for the bits Loop flags
- [ ] T5: instrument + add metrics
- [ ] T6: docs pass — keep this subfile in sync
- [ ] T7: ship + monitor for 24h

Dependencies: T2 blocks T3+. T5 can run in parallel with T2.`,

  estimate: (t) => `**Estimate for ${esc(t)}**

| Sub-task | Effort | Risk |
|----------|--------|------|
| Scope lock | 0.5d | low |
| Scaffold | 1d | low |
| Backend wire-up | 2d | medium — unclear API shape |
| Edge cases | 1d | low |
| Tests | 0.5d | low |
| Ship + monitor | 0.5d | medium — first-time canary on this surface |

**Total**: ~5.5 dev-days, single engineer.
**Critical path**: scaffold → backend → edge cases → ship.`,

  schedule: (t) => `**Schedule for ${esc(t)}**

\`\`\`
Mon  scope lock + brain read
Tue  scaffold + auth wiring
Wed  backend wire-up (morning) + first edge case (afternoon)
Thu  remaining edge cases + tests
Fri  Loop review · pin decisions to memory · cut canary
Mon  canary ramp 5% → 50% → 100% if SLO holds
\`\`\`

If anything slides, the scope-lock decision is what we revisit first.`,

  scaffold: (t) => `**Scaffold for ${esc(t)}**

\`\`\`
src/
├─ ${slug(t)}/
│  ├─ index.ts          # public surface (one export per consumer)
│  ├─ types.ts          # narrow, exported
│  ├─ store.ts          # state + persistence
│  ├─ service.ts        # business logic, no IO
│  └─ index.test.ts     # red → green tests
└─ pages/
   └─ ${slug(t)}.tsx    # thin UI, uses service.ts only
\`\`\`

**Test list (write these first):**
- happy path returns expected shape
- empty input returns sane default (no crash)
- network failure surfaces a typed error
- second call doesn't re-fetch (idempotent)

**Don't**: bundle the UI with the service. Keep service.ts framework-free.`,

  refactor: (t) => `**Refactor plan: ${esc(t)}**

1. Pin behavior with a characterization test before changing anything.
2. Identify the safe seam — what's the smallest interface we can extract?
3. Rename existing → \`legacy${cap(slug(t))}\` and create the new clean impl next to it.
4. Switch one caller at a time. Keep both alive until coverage is on the new one.
5. Delete \`legacy*\` only after 2 deploys without diff in SLOs.

**Anti-goals**: don't widen scope · don't ship behavior changes in a refactor PR.`,

  test: (t) => `**Test plan: ${esc(t)}**

### Unit
- pure functions in service.ts (happy + 1 edge each)
- typed-error surface — make sure callers get a discriminated union

### Integration
- service ↔ store round-trip
- service ↔ network (mock the transport, not the data)

### E2E
- one golden-path smoke test through the live UI
- one regression test for the bug that motivated this work

### Skip
- snapshot tests on UI (they rot)
- mocking the whole world (test the seams, not the framework)`,

  lint: (t) => `**Lint pass — ${esc(t)}**

Findings:
- ⚠️  3 \`any\` usages in \`service.ts\` — replace with discriminated unions.
- ⚠️  \`console.log\` left in 2 spots — pipe through the logger.
- ✓ no unused imports.
- ✓ no circular deps.

**Action**: open a focused PR that addresses ⚠️ items, do NOT bundle with feature work.`,

  compete: (t) => `**Competitor matrix: ${esc(t)}**

| Player | Wedge | Pricing | Where they're soft |
|--------|-------|---------|-------------------|
| Incumbent A | install-base, integrations | per-seat | UX feels 2018 |
| Mover B | DX-first, fast onboarding | usage-based | weak enterprise story |
| Quiet C | self-host, OSS-flavored | open-core | shallow on AI |

**Our edge**: shared context layer across agents. None of the above have it.`,

  recall: (t) => `**Recall: ${esc(t)}**

From pinned memory:
- VOICE — Always "agent", never "AI assistant".
- RULE — Loop reviews every customer-facing change before deploy.
- FACT — Pricing tiers: Solo (free) · Team ($48/agent/mo) · Workspace (custom).

From decisions:
- 2026-05-12 — Workspace tier ships with shared memory + agent SSO (validated 8/12 partners).

If none of these answer "${esc(t)}", consider \`/research\` to gather fresh evidence.`,

  cite: (t) => `**Citations for ${esc(t)}**

1. Throughline docs — https://neverzero.cloud/docs
2. The Hog GTM index — https://docs.thehog.ai/
3. Internal decision log — \`/atlas/decisions\`

Cite at the claim level. If you can't find a citation, mark the claim as **hypothesis** in the brief.`,

  summarize: (t) => `**Summary: ${esc(t)}**

The short version: ${esc(t).slice(0, 180)}...

Read the source in this subfile's lineage if you need full context.`,

  review: (t) => `**Review of ${esc(t)}**

✅ Strengths
- structure is clear and decisions are named
- success criteria are measurable

⚠️  Risks
- the rollout assumes oncall coverage we may not have on weekends
- the SLO target (99.9% p50) is aggressive given the new code path

❌ Blockers
- none — but resolve the ⚠️ before ramp.

**Verdict**: ship after addressing the two ⚠️ items.`,

  factcheck: (t) => `**Fact-check: ${esc(t)}**

Claim-by-claim audit:
- Claim 1: ✓ supported by pinned memory (\`memory.pricing.tier-3\`).
- Claim 2: ⚠️  unverified — \`/research\` recommended.
- Claim 3: ✗ contradicted by Loop's 2026-05-10 review note.

Recommendation: revise claim 3 and re-run \`/factcheck\` once \`/research\` lands.`,

  redteam: (t) => `**Red-team: ${esc(t)}**

How does this fail?
1. Adversary mode — a malicious workspace key replays \`context.update\` events.
   → mitigation: signed payloads + per-event nonce.
2. Drift mode — the brain mission and the actual roadmap diverge silently.
   → mitigation: weekly \`/recall\` + Loop audit.
3. Cost mode — a runaway agent burns through Hog credits.
   → mitigation: per-agent rate budget, hard ceiling on /research per hour.

If none of those hit in 30 days, this design is robust enough to ship as v1.`,

  deploy: (t) => `**Deploy plan: ${esc(t)}**

Strategy: **canary → ramp**.

1. Cut a release from the green main commit.
2. Deploy to canary (5% of traffic) on Lightsprint.
3. Watch: p50, p99, error rate, agent-token spend.
4. If all four hold for 60 min, ramp 5 → 25 → 50 → 100%.
5. If any regresses by >2%, **roll back immediately** (use \`/rollback\`).

Owner: Beam. Loop blocks the ramp if review_status ≠ pass.`,

  rollback: (t) => `**Rollback: ${esc(t)}**

1. Confirm the last known-good release: \`v2.18.2\`.
2. Pin traffic to it on Lightsprint.
3. Verify p50/p99 return to baseline within 10 min.
4. File an incident note linking back to this subfile.
5. Schedule a post-mortem before the next ramp attempt.`,

  monitor: (t) => `**Monitor: ${esc(t)}**

Dashboards to wire (Lightsprint):
- traffic split by canary vs prod
- p50, p95, p99 latency on the new surface
- error rate (5xx + parse errors)
- agent invocations per minute

Alerts:
- pager: p99 > 800ms for 5 min
- slack: error rate > 1% for 10 min
- silent: deploy ID changes without an approver

Owner: Beam. SLOs: p99 < 600ms, error rate < 0.5%.`,

  remember: (t) => `**Pinned to brain memory**

${esc(t)}

Read by every agent on \`atlas\`. Re-pin or rephrase via \`/remember\` again.`,

  compress: (t) => `**Compressed recap: ${esc(t)}**

Older context distilled — see the lineage of this subfile for source material.
The compressed form is what other agents now read; the original turns remain in the activity log.`,

  pin: (t) => `**Pinned: ${esc(t)}**

Treat as authoritative. Override only via a follow-up \`/decision\` referencing this subfile.`,

  release: (t) => `**Release notes draft: ${esc(t)}**

- What changed (one line):
- Who it's for:
- How to use it:
- Migration steps (if any):

Loop should fact-check this before the deploy bot pastes it into the public changelog.`,

  generic: (t) => `**${esc(t)}**

Skill output produced as a subfile. Edit this section to flesh out the brief.`,

  verify: (t) => `**Verification Report: ${esc(t)}**

The Hog ran a 3-pass audit against the named research subfile.

| Pass | What it checks | Result |
|------|----------------|--------|
| 1. Source integrity | Are cited URLs reachable + on-topic? | ✓ all sources resolve |
| 2. Claim ↔ evidence fit | Does each finding map to a source? | ⚠ 2 weak — flagged below |
| 3. Pinned-memory conflict | Does anything contradict the brain? | ✓ no conflicts |

**Strong claims (retained)**
- Claims tied to ≥ 1 named source.
- Findings cross-verified against pinned memory.

**Weak claims (dropped)**
- Anything labelled \`hypothesis\` without a citation.
- Sweeping market statements without quantitative anchor.

**Verdict**: research is **demo-ready** — consume the retained findings; mark the dropped ones as open questions if still needed.`,

  build: (t) => `**Build: ${esc(t)}**

GStack picked the task up and started execution.

### Claimed files
\`\`\`
src/onboarding/index.ts
src/onboarding/copy.ts
src/onboarding/onboarding.test.ts
\`\`\`

### Ledger
- 00:00 \`build.started\` — Forge claimed the slice.
- 00:01 \`build.context_received\` — compressed packet of upstream research delivered.
- 00:02 \`build.scaffold\` — typed errors + happy path stub.
- 00:03 \`build.test\` — red → green on three cases.
- 00:04 \`build.lint\` — 0 errors, 1 warning auto-fixed.
- 00:05 \`build.handoff_ready\` — open work cleared, claim released.

### Output
- All three claimed files updated with structured commits.
- One pre-existing TODO resolved (\`src/onboarding/copy.ts:42\`).
- No file-level conflicts detected at write time.

If Forge spawns a helper subagent, it appears under the agent inspector with this build as its parent.`,

  spawn: (t) => `**Subagent spawn: ${esc(t)}**

A child agent was created under the requesting agent. It inherits a compressed
slice of the parent's context (room memory + the current open subfile) and runs
inside the same workspace.

| Field | Value |
|-------|-------|
| Purpose | ${esc(t)} |
| Lifetime | one task — auto-revokes on completion |
| Scope | inherits read; write requires explicit claim |
| Visible to | the parent agent + every workspace human |

The new subagent shows up in **Agent inspector** with a \`parentAgentId\` pointer
back to its caller. Resume packets walk the parent chain.`,

  resume: (t) => `**Resume Packet: ${esc(t)}**

ZeroEntropy compressed the current room state. GBrain stored it as durable
memory so a new agent (or the same one on a different device) can pick up
without restating context.

### Goal
${esc(t)}

### Current state
- Open work and decisions are listed in the brain doc tree.
- Most recent research, verification, and build subfiles are linked from this packet.

### Completed work
- Research finished and verified.
- Build agents claimed and released their slices.
- File-level conflicts (if any) have a Conflict Resolution Packet.

### Open blockers
- _(none captured at packet time — re-run \`/resume\` after the next decision if this is stale)_

### Next action
- Read this packet, scan the linked subfiles, then continue from the last \`build.handoff_ready\` row in the ledger.

This packet is the canonical hand-off artifact: every agent on this org sees
the same compressed view.`,

  handoff: (t) => `**Handoff: ${esc(t)}**

A compressed context envelope was prepared for the next agent to take over.

### What the next agent needs
- The current goal (above).
- The latest \`Research\`, \`Verification\`, and \`Build\` subfiles.
- The most recent pinned memory entries.

### What it should skip
- Anything already in the decision log.
- Original chat turns — the compressed packet supersedes them.

### Continuity check
Run \`/resume\` from the next session to bootstrap; the room state survives
across sessions, devices, and machines.`,
};

function esc(s: string): string { return s.replace(/[<>]/g, ''); }
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'task';
}
function cap(s: string): string { return s.length ? s[0]!.toUpperCase() + s.slice(1) : s; }
