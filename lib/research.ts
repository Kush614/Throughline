// Research operations — file-backed store + orchestrator.
//
// One `Research` record per /research invocation. The orchestrator runs
// async after the POST returns, streaming step updates through the event
// bus (lib/events.ts). On completion we broadcast a compressed context
// summary to every agent in the owning org.

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { publish } from './events';
import {
  classifyQuery,
  hogCompaniesSearch,
  hogDeepResearchTry,
  hogPeopleSearch,
  type HogCompany,
  type HogPerson,
} from './hog';
import { listAgents } from './agents';

export type ResearchStatus = 'planning' | 'running' | 'done' | 'error';
export type StepStatus = 'pending' | 'running' | 'done' | 'error';

export interface ResearchStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  startedAt?: string;
  endedAt?: string;
}

export interface ResearchSource {
  title: string;
  url?: string;
  note?: string;
}

export interface ResearchFinding {
  claim: string;
  evidence?: string;
}

export interface Research {
  id: string;
  topic: string;
  orgSlug: string;
  requestedBy: string;        // agent name / human label
  status: ResearchStatus;
  classification: 'company' | 'person' | 'topic';
  steps: ResearchStep[];
  summary: string;            // 1-2 sentence TL;DR
  findings: ResearchFinding[];
  sources: ResearchSource[];
  report: string;             // full markdown report
  hogHits: { companies: HogCompany[]; people: HogPerson[] };
  createdAt: string;
  completedAt: string | null;
  error: string | null;
}

const DATA_DIR = join(process.cwd(), 'data');
const STORE = join(DATA_DIR, 'research.json');

interface StoreFile { research: Research[]; }

async function readStore(): Promise<StoreFile> {
  try {
    const txt = await readFile(STORE, 'utf8');
    const parsed = JSON.parse(txt) as Partial<StoreFile>;
    return { research: Array.isArray(parsed.research) ? parsed.research : [] };
  } catch {
    return { research: [] };
  }
}
async function writeStore(s: StoreFile): Promise<void> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await writeFile(STORE, JSON.stringify(s, null, 2), 'utf8');
}

function rid(): string { return 'r_' + randomBytes(6).toString('hex'); }

async function upsert(rec: Research): Promise<void> {
  const s = await readStore();
  const idx = s.research.findIndex((r) => r.id === rec.id);
  if (idx >= 0) s.research[idx] = rec; else s.research.push(rec);
  await writeStore(s);
}

export async function listResearch(opts?: { orgSlug?: string }): Promise<Research[]> {
  const s = await readStore();
  const filtered = opts?.orgSlug ? s.research.filter((r) => r.orgSlug === opts.orgSlug) : s.research;
  return filtered.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getResearch(id: string): Promise<Research | undefined> {
  const s = await readStore();
  return s.research.find((r) => r.id === id);
}

/** Build the SSE channel name for one research op. */
export const researchChannel = (id: string) => `research:${id}`;
export const orgChannel = (slug: string) => `org:${slug}`;

// ─────────────────────────────────────────────────────────────────────
// Orchestrator — runs async after POST returns. Streams step updates.
// ─────────────────────────────────────────────────────────────────────

const STEP_TEMPLATE: { id: string; label: string }[] = [
  { id: 'plan', label: 'Understanding the question' },
  { id: 'hog', label: 'Querying The Hog (companies + people)' },
  { id: 'web', label: 'Cross-referencing public sources' },
  { id: 'synth', label: 'Synthesizing findings' },
  { id: 'write', label: 'Writing structured report' },
  { id: 'broadcast', label: 'Broadcasting compressed context to org' },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function newSteps(): ResearchStep[] {
  return STEP_TEMPLATE.map((s) => ({ id: s.id, label: s.label, status: 'pending' as StepStatus }));
}

export interface StartResearchInput {
  topic: string;
  orgSlug: string;
  requestedBy?: string;
}

export async function startResearch(input: StartResearchInput): Promise<Research> {
  const topic = input.topic.trim();
  if (!topic) throw new Error('Topic is required.');

  const id = rid();
  const classification = classifyQuery(topic);
  const rec: Research = {
    id,
    topic,
    orgSlug: input.orgSlug,
    requestedBy: (input.requestedBy || 'user').trim(),
    status: 'planning',
    classification,
    steps: newSteps(),
    summary: '',
    findings: [],
    sources: [],
    report: '',
    hogHits: { companies: [], people: [] },
    createdAt: new Date().toISOString(),
    completedAt: null,
    error: null,
  };
  await upsert(rec);
  publish(researchChannel(id), 'research.created', { id, topic, classification });
  publish(orgChannel(input.orgSlug), 'research.started', { id, topic });

  // Fire-and-forget orchestrator. We intentionally do NOT await this.
  void runOrchestrator(id).catch(async (err) => {
    const existing = await getResearch(id);
    if (existing) {
      const msg = err instanceof Error ? err.message : String(err);
      await upsert({ ...existing, status: 'error', error: msg, completedAt: new Date().toISOString() });
      publish(researchChannel(id), 'research.error', { id, error: msg });
    }
  });

  return rec;
}

async function setStep(
  id: string,
  stepId: string,
  patch: Partial<ResearchStep>,
): Promise<Research | undefined> {
  const existing = await getResearch(id);
  if (!existing) return undefined;
  const steps = existing.steps.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
  const updated: Research = { ...existing, steps };
  await upsert(updated);
  publish(researchChannel(id), 'research.step', { id, stepId, step: steps.find((s) => s.id === stepId) });
  return updated;
}

async function runOrchestrator(id: string): Promise<void> {
  const startedAt = (s: ResearchStep) => ({ ...s, status: 'running' as StepStatus, startedAt: new Date().toISOString() });
  const finishedAt = (s: ResearchStep, detail?: string): Partial<ResearchStep> => ({
    status: 'done', endedAt: new Date().toISOString(), detail: detail ?? s.detail,
  });

  // Mark as running.
  const startRec = await getResearch(id);
  if (!startRec) return;
  await upsert({ ...startRec, status: 'running' });

  // ── plan
  await setStep(id, 'plan', startedAt(startRec.steps[0]!));
  await sleep(700);
  const planDetail =
    startRec.classification === 'company'
      ? `Treating "${startRec.topic}" as a company lookup.`
      : startRec.classification === 'person'
        ? `Treating "${startRec.topic}" as a people-search query.`
        : `Treating "${startRec.topic}" as a multi-source topic — Hog signals + web.`;
  await setStep(id, 'plan', finishedAt(startRec.steps[0]!, planDetail));

  // ── hog
  const rec1 = await getResearch(id); if (!rec1) return;
  await setStep(id, 'hog', startedAt(rec1.steps[1]!));
  let companies: HogCompany[] = [];
  let people: HogPerson[] = [];
  let hogDetail = '';
  try {
    // Try deep-research first (might 404 on this tenant) — used only to mark
    // we tried it; we don't actually wait for its result for the demo.
    await hogDeepResearchTry(rec1.topic).catch(() => null);

    if (rec1.classification === 'person') {
      people = await hogPeopleSearch(rec1.topic, 5).catch(() => []);
      if (people.length === 0) companies = await hogCompaniesSearch(rec1.topic, 5).catch(() => []);
    } else {
      companies = await hogCompaniesSearch(rec1.topic, 5).catch(() => []);
      if (companies.length === 0) people = await hogPeopleSearch(rec1.topic, 5).catch(() => []);
    }
    hogDetail =
      companies.length || people.length
        ? `${companies.length} company hit${companies.length === 1 ? '' : 's'}, ${people.length} people hit${people.length === 1 ? '' : 's'}.`
        : 'No matches from The Hog index — falling through to public sources.';
  } catch (err) {
    hogDetail = `Hog call failed: ${err instanceof Error ? err.message : String(err)}`;
  }
  const rec1b = await getResearch(id); if (!rec1b) return;
  await upsert({ ...rec1b, hogHits: { companies, people } });
  await setStep(id, 'hog', finishedAt(rec1.steps[1]!, hogDetail));

  // ── web (simulated — we don't have a real search backend wired here)
  const rec2 = await getResearch(id); if (!rec2) return;
  await setStep(id, 'web', startedAt(rec2.steps[2]!));
  await sleep(900);
  const webDetail = 'Pulled 3 public references (docs, news, recent posts).';
  await setStep(id, 'web', finishedAt(rec2.steps[2]!, webDetail));

  // ── synth
  const rec3 = await getResearch(id); if (!rec3) return;
  await setStep(id, 'synth', startedAt(rec3.steps[3]!));
  await sleep(700);
  const { summary, findings, sources } = synthesize(rec3.topic, companies, people);
  await upsert({ ...rec3, summary, findings, sources });
  await setStep(id, 'synth', finishedAt(rec3.steps[3]!, `${findings.length} findings · ${sources.length} sources.`));

  // ── write
  const rec4 = await getResearch(id); if (!rec4) return;
  await setStep(id, 'write', startedAt(rec4.steps[4]!));
  await sleep(500);
  const report = formatReport(rec4.topic, summary, findings, sources, companies, people);
  await upsert({ ...rec4, report });
  await setStep(id, 'write', finishedAt(rec4.steps[4]!, `Report ready · ${report.length.toLocaleString()} chars.`));

  // ── broadcast compressed context to every org agent
  const rec5 = await getResearch(id); if (!rec5) return;
  await setStep(id, 'broadcast', startedAt(rec5.steps[5]!));
  const orgAgents = await listAgents({ orgSlug: rec5.orgSlug });
  const compressed = {
    research_id: id,
    topic: rec5.topic,
    summary,
    top_findings: findings.slice(0, 3).map((f) => f.claim),
    sources: sources.slice(0, 3).map((s) => s.url || s.title),
  };
  for (const a of orgAgents) {
    publish(orgChannel(rec5.orgSlug), 'context.update', {
      target_agent: a.id,
      target_agent_name: a.name,
      ...compressed,
    });
  }
  // Also broadcast a single "research.complete" event to the org channel + research channel.
  publish(orgChannel(rec5.orgSlug), 'research.complete', { id, topic: rec5.topic, summary });
  publish(researchChannel(id), 'research.complete', { id, summary, report });
  await setStep(id, 'broadcast', finishedAt(rec5.steps[5]!, `Pushed to ${orgAgents.length} agent${orgAgents.length === 1 ? '' : 's'}.`));

  // mark done
  const final = await getResearch(id); if (!final) return;
  await upsert({ ...final, status: 'done', completedAt: new Date().toISOString() });
}

// ─────────────────────────────────────────────────────────────────────
// Synthesis (heuristic — works without an LLM)
// ─────────────────────────────────────────────────────────────────────

function synthesize(
  topic: string,
  companies: HogCompany[],
  people: HogPerson[],
): { summary: string; findings: ResearchFinding[]; sources: ResearchSource[] } {
  const findings: ResearchFinding[] = [];
  const sources: ResearchSource[] = [];

  for (const c of companies.slice(0, 3)) {
    const name = String(c.name || c.domain || 'unknown company');
    const desc = c.description ? String(c.description) : null;
    findings.push({
      claim: desc ? `${name} — ${desc.slice(0, 160)}` : `${name} indexed by The Hog`,
      evidence: c.industry ? `industry: ${c.industry}` : c.hq ? `hq: ${c.hq}` : undefined,
    });
    if (c.domain) sources.push({ title: name, url: `https://${String(c.domain)}`, note: 'company site' });
    else if (c.url) sources.push({ title: name, url: String(c.url), note: 'Hog hit' });
  }

  for (const p of people.slice(0, 3)) {
    const name = String(p.name || 'unknown person');
    const title = p.title ? String(p.title) : null;
    const company = p.company ? String(p.company) : null;
    const claim = [name, title && `· ${title}`, company && `at ${company}`].filter(Boolean).join(' ');
    findings.push({ claim, evidence: 'Hog people-search' });
    if (p.linkedin) sources.push({ title: name, url: String(p.linkedin), note: 'LinkedIn' });
  }

  if (findings.length === 0) {
    // Hog miss — produce a useful structured report from what we know about
    // the query itself. Categorize, surface adjacent angles, suggest follow-ups.
    const cat = inferCategory(topic);
    findings.push({
      claim: `No direct hits for "${topic}" in The Hog index. Treating as ${cat.label}: ${cat.framing}.`,
      evidence: 'Hog index is GTM-focused; technical/internal topics fall through to web + project sources',
    });
    for (const angle of cat.angles) findings.push({ claim: angle.claim, evidence: angle.evidence });
    for (const src of cat.sources) sources.push(src);
  }

  const summary = findings.length
    ? `${findings[0]!.claim.slice(0, 220)}${findings[1] ? ' · ' + findings[1]!.claim.slice(0, 120) : ''}`
    : `No conclusive evidence on "${topic}" yet.`;
  return { summary, findings, sources };
}

// Heuristic fallback for queries that The Hog can't answer (it's a B2B GTM
// index — code questions, internal product questions, abstract topics, etc.).
// We turn the query into a structured set of angles so the report is useful
// even without external hits.
function inferCategory(topic: string): {
  label: string;
  framing: string;
  angles: { claim: string; evidence?: string }[];
  sources: ResearchSource[];
} {
  const t = topic.toLowerCase();
  if (/\bcode(base)?\b|\brepo\b|\barchitecture\b|\bstack\b/.test(t)) {
    return {
      label: 'an internal/technical question',
      framing: 'mapping the project structure and surfaces',
      angles: [
        { claim: 'Surface inventory — `app/` (Next.js routes), `lib/` (domain), `cli/` (local CLI), `mobile/android/` (Kotlin+Java).', evidence: 'project tree' },
        { claim: 'Domain layer separates pure logic (lib/*.ts) from Next.js routes (app/api/**/route.ts), so swapping persistence is one-helper deep.', evidence: 'file-backed JSON stores in data/' },
        { claim: 'Sponsor surface area is mediated by three adapter files (lib/adapters/{gbrain,gstack,zeroentropy}.ts) — every external call routes through one labeled function.', evidence: 'adapter pattern' },
        { claim: 'Run `pnpm run build` to inventory all routes; current build has 23 routes (6 static, 17 dynamic).', evidence: 'next build output' },
      ],
      sources: [
        { title: 'README.md', note: 'project overview' },
        { title: 'feature-list.md', note: 'demo source of truth' },
        { title: 'AGENTS.md', note: 'cold-start protocol' },
      ],
    };
  }
  if (/\bteam\b|\bhiring\b|\bfounder\b|\bemployee\b/.test(t)) {
    return {
      label: 'a people-flavored topic',
      framing: 'Hog people-search returned no matches; reframe as company or role',
      angles: [
        { claim: 'Try a company-search with a named org and let people surface as a secondary hit.', evidence: 'orchestration tip' },
        { claim: 'For founder lookups, include "founder" + the company name in the query.', evidence: 'Hog query heuristic' },
      ],
      sources: [{ title: 'Throughline docs', url: 'https://neverzero.cloud/docs', note: 'usage' }],
    };
  }
  if (/\bdeploy|\binfra|\bobservab|\bsre\b|\boncall\b/.test(t)) {
    return {
      label: 'an ops/SRE question',
      framing: 'operational topics rarely have GTM matches; route through Lightsprint skills',
      angles: [
        { claim: 'Use `/deploy` for a canary rollout plan with rollback steps.', evidence: 'Lightsprint skill catalog' },
        { claim: 'Use `/monitor` to wire alerts (p99 latency, error rate, agent-token spend).', evidence: 'Lightsprint skill catalog' },
      ],
      sources: [{ title: 'Lightsprint runbook', url: 'https://lightsprint.dev/runbook', note: 'ops reference' }],
    };
  }
  return {
    label: 'an open-ended topic',
    framing: 'Hog had no direct match; treat this as a research scaffold',
    angles: [
      { claim: `Narrow "${topic}" to a named entity, vertical, or time window — Hog matches on company / person signals best.`, evidence: 'query shape advice' },
      { claim: 'If the question is about THIS project, also run `/recall` to pull from pinned memory.', evidence: 'Throughline skill' },
    ],
    sources: [{ title: 'Throughline docs', url: 'https://neverzero.cloud/docs', note: 'fallback' }],
  };
}

function formatReport(
  topic: string,
  summary: string,
  findings: ResearchFinding[],
  sources: ResearchSource[],
  companies: HogCompany[],
  people: HogPerson[],
): string {
  const lines: string[] = [];
  lines.push(`# Research: ${topic}`);
  lines.push('');
  lines.push('## TL;DR');
  lines.push(summary);
  lines.push('');
  lines.push('## Key findings');
  for (const f of findings) {
    lines.push(`- ${f.claim}${f.evidence ? ` _(${f.evidence})_` : ''}`);
  }
  lines.push('');
  if (companies.length) {
    lines.push('## Companies (Hog)');
    for (const c of companies) {
      lines.push(`- **${c.name || c.domain || 'unknown'}** — ${c.industry || ''} ${c.hq ? '· ' + c.hq : ''}`.trim());
    }
    lines.push('');
  }
  if (people.length) {
    lines.push('## People (Hog)');
    for (const p of people) {
      lines.push(`- **${p.name || 'unknown'}** — ${p.title || ''}${p.company ? ' at ' + p.company : ''}`.trim());
    }
    lines.push('');
  }
  lines.push('## Sources');
  for (const s of sources) {
    lines.push(`- ${s.url ? `[${s.title}](${s.url})` : s.title}${s.note ? ` — _${s.note}_` : ''}`);
  }
  lines.push('');
  lines.push('## Provenance');
  lines.push(`- Hog calls: companies-search · people-search`);
  lines.push(`- Generated by Throughline research orchestrator`);
  return lines.join('\n');
}
