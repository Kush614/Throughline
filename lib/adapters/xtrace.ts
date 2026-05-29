// XTrace adapter — Throughline's durable memory, for real.
//
// Concept mapping (Throughline → XTrace axis):
//   workspace / org slug   → user_id   (the tenant namespace inside our account)
//   coding session         → conv_id   (becomes an XTrace episode)
//   agent (Iris, Forge…)   → agent_id
//   runtime (claude/cursor)→ app_id
//   decision / finding /…  → a fact extracted from the turn
//   a decision that changed→ supersession (details.status = "superseded")
//
// We attach rich nz_* metadata on write. v1 only filters on core axes + type,
// so we filter/group by nz_* on the READ side (metadata always comes back).

import { createHash } from 'node:crypto';
import {
  getXtrace,
  requireXtrace,
  xtraceConfigured,
} from '../xtrace';
import type {
  Memory,
  FactMemory,
  SearchListEnvelope,
} from '@xtraceai/memory';

export { xtraceConfigured };

// ── Types ────────────────────────────────────────────────────────────────

/** What kind of workspace knowledge this memory captures. */
export type MemoryKind =
  | 'decision'
  | 'fact'
  | 'rule'
  | 'voice'
  | 'finding'
  | 'handoff'
  | 'resume'
  | 'build';

/** Where the memory originated, for the source trail. */
export type MemorySource = 'skill' | 'decision' | 'handoff' | 'resume' | 'build' | 'manual' | 'seed';

export interface IngestMemoryInput {
  orgSlug: string;
  text: string;
  kind: MemoryKind;
  /** Coding session → XTrace conv_id / episode. Defaults to `${orgSlug}-main`. */
  sessionId?: string;
  agentId?: string;
  agentName?: string;
  /** Runtime: claude | cursor | codex | gstack | … → app_id. */
  runtime?: string;
  source?: MemorySource;
  command?: string;
  requestedBy?: string;
  /** Subfile this memory came from, so the UI can link back. */
  subfileId?: string;
  subfileTitle?: string;
  extra?: Record<string, unknown>;
  /** Document-like content (research, resume) → also extract an artifact. */
  extractArtifacts?: boolean;
  /** Hold the connection until extraction finishes (≤30s). Default true. */
  wait?: boolean;
}

/** A memory shaped for rendering, with a resolved source link. */
export interface MemoryView {
  id: string;
  type: Memory['type'];
  text: string;
  kind: string;
  status: string;
  superseded: boolean;
  agentName?: string;
  source?: string;
  command?: string;
  sessionId: string | null;
  subfileHref?: string;
  subfileTitle?: string;
  score: number | null;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

export function defaultSession(orgSlug: string): string {
  return `${orgSlug}-main`;
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

export function toView(orgSlug: string, m: Memory): MemoryView {
  const md = m.metadata ?? {};
  const status = m.type === 'fact' ? ((m as FactMemory).details.status ?? 'active') : 'active';
  const subfileId = str(md.nz_subfile_id);
  return {
    id: m.id,
    type: m.type,
    text: m.text,
    kind: str(md.nz_kind) ?? (m.type === 'episode' ? 'summary' : m.type),
    status,
    superseded: status === 'superseded',
    agentName: str(md.nz_agent),
    source: str(md.nz_source),
    command: str(md.nz_command),
    sessionId: m.conv_id,
    subfileHref: subfileId ? `/${orgSlug}/docs/${subfileId}` : undefined,
    subfileTitle: str(md.nz_doc_title),
    score: m.score,
    createdAt: m.created_at,
  };
}

// ── Write path ─────────────────────────────────────────────────────────────

/**
 * Ingest one workspace memory into XTrace. Returns the created fact refs (when
 * the call waits for extraction) or null on best-effort/async paths.
 */
export async function ingestMemory(input: IngestMemoryInput) {
  const client = requireXtrace();
  const text = input.text.trim();
  if (!text) throw new Error('ingestMemory: text is required');

  const sessionId = input.sessionId?.trim() || defaultSession(input.orgSlug);
  const metadata: Record<string, unknown> = {
    nz_kind: input.kind,
    nz_source: input.source ?? 'manual',
    ...(input.command ? { nz_command: input.command } : {}),
    ...(input.agentName ? { nz_agent: input.agentName } : {}),
    ...(input.requestedBy ? { nz_requested_by: input.requestedBy } : {}),
    ...(input.subfileId ? { nz_subfile_id: input.subfileId } : {}),
    ...(input.subfileTitle ? { nz_doc_title: input.subfileTitle } : {}),
    ...(input.extra ?? {}),
  };

  const job = await client.memories.ingest(
    {
      messages: [{ role: 'user', content: text }],
      user_id: input.orgSlug,
      conv_id: sessionId,
      ...(input.agentId ? { agent_id: input.agentId } : {}),
      ...(input.runtime ? { app_id: input.runtime } : {}),
      metadata,
      extract_artifacts: input.extractArtifacts ?? false,
    },
    { wait: input.wait ?? true },
  );

  if (job.status === 'succeeded' && job.result) return job.result;
  if (job.status === 'pending' || job.status === 'running') {
    // Hand back the job; callers that need the result can poll.
    return { jobId: job.id, status: job.status };
  }
  return null;
}

/** Fire-and-forget ingest that never throws — for best-effort write sites. */
export async function ingestMemorySafe(input: IngestMemoryInput): Promise<void> {
  if (!xtraceConfigured()) return;
  try {
    await ingestMemory({ wait: false, ...input });
  } catch (err) {
    console.error('[xtrace] ingest failed (best-effort):', err);
  }
}

// ── Read path ────────────────────────────────────────────────────────────

// Broad standing query used to surface the workspace's memory for overview
// panels. XTrace's list endpoint returns facts only; episode summaries (the
// richest human-readable knowledge) come back through search, so recall blends
// both: authoritative facts from list + relevant episodes from a broad search.
const RECALL_QUERY = 'key decisions, rules, findings, blockers, and what happened in recent sessions';

function isRetractedFact(m: Memory): boolean {
  return m.type === 'fact' && (m as FactMemory).details.status === 'retracted';
}

/**
 * Recall durable memory for a workspace — what a new agent or human sees on cold
 * start. Blends extracted facts (from list) with session episode summaries (from
 * search), excluding retracted facts. Pass `factsOnly` for just the facts.
 */
export async function recallMemory(
  orgSlug: string,
  opts: { limit?: number; sessionId?: string; factsOnly?: boolean } = {},
): Promise<MemoryView[]> {
  const client = getXtrace();
  if (!client) return [];
  const limit = opts.limit ?? 50;
  try {
    const factPage = await client.memories.listPage({
      user_id: orgSlug,
      type: 'fact',
      ...(opts.sessionId ? { conv_id: opts.sessionId } : {}),
      limit,
      order: 'created_at_desc',
    });

    const byId = new Map<string, MemoryView>();
    for (const m of factPage.data) {
      if (!isRetractedFact(m)) byId.set(m.id, toView(orgSlug, m));
    }

    if (!opts.factsOnly) {
      try {
        const env = await client.memories.search({
          query: RECALL_QUERY,
          filters: { user_id: orgSlug, ...(opts.sessionId ? { conv_id: opts.sessionId } : {}) },
          limit: Math.max(limit, 20),
        });
        // XTrace mints an episode per ingest, so a busy session yields several
        // overlapping summaries. Keep at most 2 episodes per session for a clean
        // overview; facts are always kept in full.
        const episodesPerSession = new Map<string, number>();
        for (const m of env.data) {
          if (m.type === 'artifact' || isRetractedFact(m) || byId.has(m.id)) continue;
          if (m.type === 'episode') {
            const key = m.conv_id ?? '∅';
            const n = episodesPerSession.get(key) ?? 0;
            if (n >= 2) continue;
            episodesPerSession.set(key, n + 1);
          }
          byId.set(m.id, toView(orgSlug, m));
        }
      } catch (err) {
        console.error('[xtrace] recallMemory search supplement failed:', err);
      }
    }

    return Array.from(byId.values()).slice(0, limit);
  } catch (err) {
    console.error('[xtrace] recallMemory failed:', err);
    return [];
  }
}

export interface AskResult {
  answer: string | null;
  sources: MemoryView[];
  usedContextPrompt: boolean;
  stageTimings?: Record<string, number>;
}

/**
 * Answer a natural-language question against the workspace memory. This is the
 * human-facing "Ask Mission Control" path: vector search + (when a session is
 * scoped) an assembled context_prompt answer.
 */
export async function askWorkspace(
  orgSlug: string,
  question: string,
  opts: { sessionId?: string; limit?: number } = {},
): Promise<AskResult> {
  const client = getXtrace();
  const q = question.trim();
  if (!client || !q) return { answer: null, sources: [], usedContextPrompt: false };

  const filters: Record<string, unknown> = { user_id: orgSlug };
  if (opts.sessionId) filters.conv_id = opts.sessionId;

  // context_prompt needs both user_id + conv_id; only request it when scoped.
  const wantContext = Boolean(opts.sessionId);

  const run = async (includeContext: boolean): Promise<SearchListEnvelope> =>
    client.memories.search({
      query: q,
      filters,
      limit: opts.limit ?? 8,
      include: includeContext ? ['context_prompt'] : undefined,
    });

  try {
    let env: SearchListEnvelope;
    try {
      env = await run(wantContext);
    } catch {
      // If context_prompt was rejected (e.g. missing conv_id), retry plain.
      env = await run(false);
    }
    const sources = env.data.map((m) => toView(orgSlug, m));
    const answer = env.extras?.context_prompt ?? sources[0]?.text ?? null;
    return {
      answer,
      sources,
      usedContextPrompt: Boolean(env.extras?.context_prompt),
      stageTimings: env.extras?.stage_timings,
    };
  } catch (err) {
    console.error('[xtrace] askWorkspace failed:', err);
    return { answer: null, sources: [], usedContextPrompt: false };
  }
}

export interface SessionRecap {
  sessionId: string;
  episode: { title: string | null; summary: string; startedAt: string | null; endedAt: string | null } | null;
  contextPrompt: string | null;
  facts: MemoryView[];
}

/** "Catch me up" — what happened in one coding session, for a non-technical reader. */
export async function sessionRecap(orgSlug: string, sessionId: string): Promise<SessionRecap> {
  const client = getXtrace();
  const empty: SessionRecap = { sessionId, episode: null, contextPrompt: null, facts: [] };
  if (!client) return empty;

  try {
    // Facts for this session via blended recall (list returns no episodes, and
    // some sessions have only episode content — search fills the gap).
    const facts = await recallMemory(orgSlug, { sessionId, limit: 8 });
    const episodeMem = facts.find((f) => f.type === 'episode');

    let contextPrompt: string | null = null;
    try {
      const env = await client.memories.search({
        query: 'Summarize what happened in this session: decisions, findings, and changes.',
        filters: { user_id: orgSlug, conv_id: sessionId },
        include: ['context_prompt'],
        limit: 12,
      });
      contextPrompt = env.extras?.context_prompt ?? null;
    } catch (err) {
      console.error('[xtrace] sessionRecap context_prompt failed:', err);
    }

    return {
      sessionId,
      episode: episodeMem
        ? { title: null, summary: episodeMem.text, startedAt: null, endedAt: null }
        : null,
      contextPrompt,
      // Facts list excludes the episode row (its summary already drives the card).
      facts: facts.filter((f) => f.type !== 'episode'),
    };
  } catch (err) {
    console.error('[xtrace] sessionRecap failed:', err);
    return empty;
  }
}

export interface DecisionTimeline {
  active: MemoryView[];
  superseded: MemoryView[];
}

/**
 * How the workspace's decisions evolved. Active vs superseded facts, so the UI
 * can show a decision getting struck-through and replaced (the supersession
 * "wow" — unique to XTrace's data model).
 *
 * Supersession-aware: if an active fact supersedes a predecessor that the list
 * call didn't return, we fetch that predecessor by id so the "before" state is
 * always visible.
 */
export async function decisionTimeline(
  orgSlug: string,
  opts: { sessionId?: string; limit?: number } = {},
): Promise<DecisionTimeline> {
  const client = getXtrace();
  if (!client) return { active: [], superseded: [] };

  const decisionKind = (v: MemoryView) => v.kind === 'decision' || v.kind === 'fact' || v.kind === 'rule';

  try {
    const page = await client.memories.listPage({
      user_id: orgSlug,
      type: 'fact',
      ...(opts.sessionId ? { conv_id: opts.sessionId } : {}),
      limit: opts.limit ?? 100,
      order: 'created_at_desc',
    });

    const facts = page.data.filter((m): m is FactMemory => m.type === 'fact');
    const seen = new Set(facts.map((f) => f.id));
    const active: MemoryView[] = [];
    const superseded: MemoryView[] = [];

    for (const f of facts) {
      const status = f.details.status ?? 'active';
      if (status === 'retracted') continue;
      const view = toView(orgSlug, f);
      if (!decisionKind(view)) continue;
      (status === 'superseded' ? superseded : active).push(view);
    }

    // Pull in predecessors that the page didn't include.
    const predecessors = facts
      .map((f) => f.details.supersedes)
      .filter((id): id is string => typeof id === 'string' && !seen.has(id));
    for (const id of predecessors) {
      try {
        const old = await client.memories.get(id);
        const view = toView(orgSlug, old);
        if (decisionKind(view)) superseded.push({ ...view, superseded: true });
        seen.add(id);
      } catch {
        /* predecessor may be gone; skip */
      }
    }

    return { active, superseded };
  } catch (err) {
    console.error('[xtrace] decisionTimeline failed:', err);
    return { active: [], superseded: [] };
  }
}

/**
 * Supersede an existing fact with corrected text — produces a revision chain in
 * XTrace. Used when a decision changes.
 */
export async function supersedeFact(memoryId: string, newText: string): Promise<Memory> {
  const client = requireXtrace();
  return client.memories.update(memoryId, { text: newText });
}

// ── Ship: package a session's memory like a Docker image ────────────────────

export interface SessionSummary {
  sessionId: string;
  memoryCount: number;
  kinds: string[];
}

/** Distinct coding sessions in a workspace, with rough memory counts. */
export async function listSessions(orgSlug: string): Promise<SessionSummary[]> {
  const views = await recallMemory(orgSlug, { limit: 100 });
  const bySession = new Map<string, { count: number; kinds: Set<string> }>();
  for (const v of views) {
    if (!v.sessionId) continue;
    const e = bySession.get(v.sessionId) ?? { count: 0, kinds: new Set<string>() };
    e.count += 1;
    e.kinds.add(v.kind);
    bySession.set(v.sessionId, e);
  }
  return Array.from(bySession.entries())
    .map(([sessionId, e]) => ({ sessionId, memoryCount: e.count, kinds: Array.from(e.kinds) }))
    .sort((a, b) => b.memoryCount - a.memoryCount);
}

export interface ContextImageLayer {
  kind: string;
  count: number;
}

/** A portable "context image" — a session's memory, packaged like a Docker image. */
export interface ContextImage {
  ref: string;            // e.g. "cobalt/2026-05-27"
  tag: string;            // e.g. "2026-05-27"
  digest: string;         // "sha256:…"
  builtAt: string;
  org: string;
  session: string;
  layers: ContextImageLayer[];
  memoryCount: number;
  contextPrompt: string | null; // the assembled payload to resume from
  memories: { kind: string; text: string }[]; // raw memory, so a pull always has context
  pullCommand: string;
}

/**
 * Build a portable context image from one session's XTrace memory. Groups the
 * memory into "layers" by kind, assembles the resume payload (context_prompt),
 * and stamps a content digest — so a session can be shipped and pulled into
 * another room, Docker-style.
 */
export async function buildContextImage(orgSlug: string, sessionId: string): Promise<ContextImage> {
  const [views, recap] = await Promise.all([
    recallMemory(orgSlug, { sessionId, limit: 100 }),
    sessionRecap(orgSlug, sessionId),
  ]);

  const layerMap = new Map<string, number>();
  for (const v of views) layerMap.set(v.kind, (layerMap.get(v.kind) ?? 0) + 1);
  const layers = Array.from(layerMap.entries())
    .map(([kind, count]) => ({ kind, count }))
    .sort((a, b) => b.count - a.count);

  const payload = JSON.stringify({
    org: orgSlug,
    session: sessionId,
    memory: views.map((v) => ({ kind: v.kind, text: v.text, superseded: v.superseded })),
    context: recap.contextPrompt,
  });
  const digest = 'sha256:' + createHash('sha256').update(payload).digest('hex').slice(0, 32);
  const tag = sessionId.startsWith(`${orgSlug}-`) ? sessionId.slice(orgSlug.length + 1) : sessionId;
  const ref = `${orgSlug}/${tag}`;

  return {
    ref,
    tag,
    digest,
    builtAt: new Date().toISOString(),
    org: orgSlug,
    session: sessionId,
    layers,
    memoryCount: views.length,
    contextPrompt: recap.contextPrompt,
    memories: views.map((v) => ({ kind: v.kind, text: v.text })),
    pullCommand: `throughline pull ${ref}@${digest}`,
  };
}
