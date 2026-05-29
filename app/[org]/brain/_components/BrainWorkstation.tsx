'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icons } from '@/app/workstation/_client/icons';

type AgentStatus = 'pending' | 'connected' | 'revoked';
type SkillStatus = 'pending' | 'running' | 'done' | 'error';

export interface BrainAgent {
  id: string;
  name: string;
  from: string;            // client (claude-desktop / cursor / …)
  status: AgentStatus;
  apiKeyPrefix: string;
  machine?: string | null;
  os?: string | null;
  glyph: string;           // 2-letter
  color: string;           // CSS var or hex
}

export interface BrainPerson { name: string; role: string; initials: string; tone: string; }

export interface BrainSubfile {
  id: string;
  parentId: string | null;
  title: string;
  createdAt: string;
  skillRun?: {
    command: string;
    skillId: string;
    kind: string;
    task: string;
    status: SkillStatus;
    mentionedAgents: { id: string; name: string }[];
    requestedBy: string;
  };
}

export interface BrainSkill {
  id: string;
  name: string;
  command: string;
  provider: string;
  description: string;
  kind: string;
}

export interface BrainResearch {
  id: string;
  topic: string;
  status: 'planning' | 'running' | 'done' | 'error';
  summary: string;
  createdAt: string;
}

export interface BrainOrgData {
  slug: string;
  name: string;
  domain: string;
  brainDocId: string;
  tagline: string;
  mission: string;
  industry: string;
  stage: string;
  founded: string;
  hq: string;
  createdAt: string;
  providers: string[];
  agentRoster: string[];
  memories: { kind: string; text: string }[];
}

export interface BrainData {
  org: BrainOrgData;
  agents: BrainAgent[];
  people: BrainPerson[];
  subfiles: BrainSubfile[];
  skills: BrainSkill[];
  research: BrainResearch[];
}

type AgentColorStyle = CSSProperties & { ['--agent-color']?: string };
type TreeDepthStyle = CSSProperties & { ['--tree-depth']?: number };

type DocsApiNode = {
  id: string;
  parentId: string | null;
  title: string;
  kind: string;
  createdAt: string;
  skillRun?: BrainSubfile['skillRun'];
};

interface BrainTreeNode extends BrainSubfile {
  children: BrainTreeNode[];
}

// ─────────── helpers ───────────

const AGENT_COLOR_VARS: Record<string, string> = {
  iris: 'var(--a-iris)',
  forge: 'var(--a-forge)',
  'atlas-agent': 'var(--a-atlas)',
  loop: 'var(--a-loop)',
  beam: 'var(--a-beam)',
};

const DEFAULT_AGENT_HUES = [
  'var(--a-iris)', 'var(--a-forge)', 'var(--a-atlas)', 'var(--a-loop)', 'var(--a-beam)',
];

function colorForAgent(name: string, idx: number): string {
  const norm = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(AGENT_COLOR_VARS)) if (norm.includes(k)) return v;
  return DEFAULT_AGENT_HUES[idx % DEFAULT_AGENT_HUES.length] ?? 'var(--a-iris)';
}

function glyphOf(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] || '') + (parts[parts.length - 1]![0] || '')).toUpperCase();
}

function relativeTs(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

function shortPath(machine?: string | null, os?: string | null): string {
  return [machine, os].filter(Boolean).join(' · ');
}

function compactDocTitle(title: string): string {
  return title.replace(/^[A-Z]+(?:-[A-Z]+)?:\s+/, '');
}

function nextSubfileTitle(subfiles: BrainSubfile[]): string {
  const titles = new Set(subfiles.map((s) => s.title));
  if (!titles.has('New file')) return 'New file';
  let index = 2;
  while (titles.has(`New file ${index}`)) index += 1;
  return `New file ${index}`;
}

function apiDocToSubfile(doc: DocsApiNode): BrainSubfile {
  return {
    id: doc.id,
    parentId: doc.parentId,
    title: doc.title,
    createdAt: doc.createdAt,
    skillRun: doc.skillRun,
  };
}

function buildSubfileTree(subfiles: BrainSubfile[], rootDocId: string): BrainTreeNode[] {
  const byParent = new Map<string, BrainSubfile[]>();
  const ids = new Set(subfiles.map((s) => s.id));
  for (const subfile of subfiles) {
    const parentId = subfile.parentId && (subfile.parentId === rootDocId || ids.has(subfile.parentId))
      ? subfile.parentId
      : rootDocId;
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), subfile]);
  }

  const visit = (parentId: string): BrainTreeNode[] => (byParent.get(parentId) ?? []).map((subfile) => ({
    ...subfile,
    children: visit(subfile.id),
  }));

  return visit(rootDocId);
}

const PROVIDER_LABELS: Record<string, string> = {
  gbrain: 'GBrain', gstack: 'GStack', zeroentropy: 'ZeroEntropy',
  'the-hog': 'The Hog', lightsprint: 'Lightsprint', neverzero: 'Throughline',
};

// Match the Icons set in workstation/_client/icons. Falls back to Doc.
function iconForSkillKind(kind?: string): (p: { className?: string; size?: number }) => ReactNode {
  switch (kind) {
    case 'plan': case 'decompose': case 'estimate': case 'schedule':
      return Icons.Plan;
    case 'research': case 'recall': case 'cite': case 'compete': case 'summarize':
      return Icons.Search;
    case 'scaffold': case 'refactor': case 'test': case 'lint':
    case 'deploy': case 'rollback': case 'monitor': case 'release':
      return Icons.Branch;
    case 'review': case 'factcheck': case 'redteam': case 'critique':
      return Icons.Decision;
    case 'remember': case 'pin': case 'compress':
      return Icons.Memory;
    default:
      return Icons.Doc;
  }
}

// ─────────── Inline command bar (built on top of the doc) ───────────

function CommandBar({ orgSlug, agents, skills, onDispatched }: {
  orgSlug: string;
  agents: BrainAgent[];
  skills: BrainSkill[];
  onDispatched: (subfile: { id: string; title: string; command: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState(0);
  const [selIdx, setSelIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse current token at cursor for autocomplete mode.
  const before = value.slice(0, cursor);
  const atMatch = /(?:^|\s)@([\w-]*)$/.exec(before);
  const slashMatch = /(?:^|\s)\/([\w-]*)$/.exec(before);
  const mode: 'agent' | 'skill' | null = atMatch ? 'agent' : slashMatch ? 'skill' : null;
  const query = (atMatch?.[1] ?? slashMatch?.[1] ?? '').toLowerCase();

  const suggestions = useMemo(() => {
    if (!mode) return [];
    if (mode === 'agent') {
      return agents
        .filter((a) => a.name.toLowerCase().includes(query))
        .slice(0, 8)
        .map((a) => ({ kind: 'agent' as const, opt: a }));
    }
    return skills
      .filter((s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query))
      .slice(0, 8)
      .map((s) => ({ kind: 'skill' as const, opt: s }));
  }, [mode, query, agents, skills]);

  useEffect(() => { if (selIdx >= suggestions.length) setSelIdx(0); }, [suggestions, selIdx]);

  const tokensFromValue = useMemo(() => {
    const mentioned: { id: string; name: string }[] = [];
    let command: string | null = null;
    const taskParts: string[] = [];
    for (const tok of value.split(/\s+/).filter(Boolean)) {
      if (tok.startsWith('@') && tok.length > 1) {
        const n = tok.slice(1).toLowerCase();
        const ag = agents.find((a) => a.name.toLowerCase().replace(/\s+/g, '') === n.replace(/\s+/g, ''));
        if (ag && !mentioned.find((m) => m.id === ag.id)) mentioned.push({ id: ag.id, name: ag.name });
      } else if (tok.startsWith('/') && tok.length > 1 && command === null) {
        command = tok;
      } else {
        taskParts.push(tok);
      }
    }
    return { mentioned, command, task: taskParts.join(' ') };
  }, [value, agents]);

  const applySuggestion = (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;
    const replacement = s.kind === 'agent' ? s.opt.name.replace(/\s+/g, '') : s.opt.name;
    const next = before.replace(/(?:^|\s)([@/])[\w-]*$/, (_m, sigil) => {
      const lead = _m.startsWith(' ') ? ' ' : '';
      return `${lead}${sigil}${replacement} `;
    });
    const after = value.slice(cursor);
    const merged = next + after;
    setValue(merged);
    requestAnimationFrame(() => {
      const pos = next.length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(pos, pos);
      setCursor(pos);
    });
  };

  const dispatch = async () => {
    if (submitting) return;
    setError(null);
    const { command, task, mentioned } = tokensFromValue;
    if (!command) { setError('Pick a skill with /<name>'); return; }
    if (!task.trim()) { setError('Add a task description'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/skills/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command, task,
          mentionedAgents: mentioned,
          requestedBy: 'doc-author',
        }),
      });
      const data = (await res.json()) as
        | { doc: { id: string; title: string; skillRun?: { command: string } } }
        | { error: string };
      if (!res.ok || !('doc' in data)) {
        setError('error' in data ? data.error : 'dispatch failed');
        return;
      }
      onDispatched({ id: data.doc.id, title: data.doc.title, command: data.doc.skillRun?.command || command });
      setValue('');
      setCursor(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'network error');
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIdx((i) => Math.min(suggestions.length - 1, i + 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelIdx((i) => Math.max(0, i - 1)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && mode)) { e.preventDefault(); applySuggestion(selIdx); return; }
      if (e.key === 'Escape') { e.preventDefault(); setCursor(value.length); return; }
    }
    if (e.key === 'Enter') { e.preventDefault(); void dispatch(); }
  };

  return (
    <div className="ws-cmd-wrap">
      <div className="ws-cmd">
        <span className="ws-cmd-prompt">/</span>
        <input
          ref={inputRef}
          className="ws-cmd-input"
          placeholder="@iris @forge /plan ship beta to 5 design partners"
          value={value}
          onChange={(e) => { setValue(e.target.value); setCursor(e.target.selectionStart ?? e.target.value.length); }}
          onKeyUp={(e) => setCursor(e.currentTarget.selectionStart ?? value.length)}
          onClick={(e) => setCursor(e.currentTarget.selectionStart ?? value.length)}
          onKeyDown={onKeyDown}
          disabled={submitting}
        />
        <button className="ws-cmd-go" type="button" disabled={submitting || !tokensFromValue.command || !tokensFromValue.task.trim()} onClick={() => void dispatch()}>
          {submitting ? 'dispatching…' : 'run →'}
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="ws-cmd-pop">
          <div className="ws-cmd-pop-head">
            {mode === 'agent' ? 'AGENTS' : 'SKILLS'}
            <span className="ws-cmd-pop-hint">↑↓ · ⇥ insert · esc close</span>
          </div>
          {suggestions.map((s, i) => (
            <button
              key={s.kind === 'agent' ? `a:${s.opt.id}` : `s:${s.opt.id}`}
              type="button"
              className={'ws-cmd-pop-row ' + (i === selIdx ? 'sel' : '')}
              onMouseEnter={() => setSelIdx(i)}
              onClick={() => applySuggestion(i)}
            >
              {s.kind === 'agent' ? (
                <>
                  <span className="ws-cmd-mark agent">@</span>
                  <span className="ws-cmd-name">{s.opt.name}</span>
                  <span className="ws-cmd-meta">{s.opt.from} · {s.opt.status}</span>
                </>
              ) : (
                <>
                  <span className="ws-cmd-mark">/</span>
                  <span className="ws-cmd-name">{s.opt.command}</span>
                  <span className="ws-cmd-meta">{s.opt.provider}</span>
                  <span className="ws-cmd-desc">{s.opt.description}</span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="ws-cmd-status">
        {tokensFromValue.mentioned.length > 0 && (
          <span className="ws-cmd-chip">
            → {tokensFromValue.mentioned.map((m) => '@' + m.name).join(' ')}
          </span>
        )}
        {tokensFromValue.command && (
          <span className="ws-cmd-chip">{tokensFromValue.command}</span>
        )}
        {!mode && !tokensFromValue.command && (
          <span className="ws-cmd-chip dim">type @ for agents · / for skills</span>
        )}
        {error && <span className="ws-cmd-err">{error}</span>}
      </div>
    </div>
  );
}

// ─────────── Inline components reusing workstation.css ───────────

function StatusStrip({
  open, agentsConnected, agentsTotal, skillsRun, providersCount, createdAt,
}: {
  open: number; agentsConnected: number; agentsTotal: number;
  skillsRun: number; providersCount: number; createdAt: string;
}) {
  const created = new Date(createdAt);
  const days = Math.max(0, Math.floor((Date.now() - created.getTime()) / 86_400_000));
  return (
    <div className="status-strip">
      <div className="status-cell">
        <div className="lbl">Open</div>
        <div className="val">{open} <span className="sub">{open === 1 ? 'subfile' : 'subfiles'}</span></div>
      </div>
      <div className="status-cell">
        <div className="lbl">Agents</div>
        <div className="val">
          {agentsConnected > 0 && <span className="live-dot" />} {agentsConnected} <span className="sub">live · {agentsTotal} total</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Skills run</div>
        <div className="val">{skillsRun} <span className="sub">logged</span></div>
      </div>
      <div className="status-cell">
        <div className="lbl">Providers</div>
        <div className="val">{providersCount} <span className="sub">installed · day {days || 0}</span></div>
      </div>
    </div>
  );
}

function Mention({ name, color }: { name: string; color: string }) {
  return (
    <span className="mention agent" style={{ ['--agent-color']: color } as AgentColorStyle}>
      @{name}
    </span>
  );
}

function MissionParagraph({ org, agents }: { org: BrainOrgData; agents: BrainAgent[] }) {
  const inlineAgent = agents[0];
  if (!org.mission.trim()) {
    return (
      <p>
        {org.name} hasn&apos;t pinned a mission yet. Hit{' '}
        <span className="mono" style={{ background: 'var(--bg-sunken)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>/remember</span>
        {' '}to anchor it in the brain.
      </p>
    );
  }
  return (
    <>
      <p>
        {inlineAgent && <><Mention name={inlineAgent.name} color={inlineAgent.color} />{' is reading this. '}</>}
        {org.mission}
      </p>
      {(org.industry || org.stage || org.founded || org.hq) && (
        <p>
          {[org.industry, org.stage, org.founded && `founded ${org.founded}`, org.hq && `based in ${org.hq}`]
            .filter(Boolean).join(' · ')}
          .
        </p>
      )}
    </>
  );
}

function SubfileTodo({ s, orgSlug }: { s: BrainSubfile; orgSlug: string }) {
  const done = s.skillRun?.status === 'done';
  const agent = s.skillRun?.mentionedAgents[0];
  const color = agent ? colorForAgent(agent.name, 0) : 'var(--ink)';
  return (
    <div className="todo" data-done={done ? '1' : '0'} style={{ ['--agent-color']: color } as AgentColorStyle}>
      <span className="check" />
      <div className="body">
        <div className="ttl">
          <Link href={`/${orgSlug}/docs/${s.id}`} style={{ color: 'inherit' }}>
            {s.title}
          </Link>
        </div>
        <div className="sub-row">
          {s.skillRun && (
            <span className="tag">{s.skillRun.command}</span>
          )}
          {s.skillRun?.mentionedAgents.map((a, i) => (
            <span key={a.id} className="by">
              <span
                className="av"
                data-agent="1"
                style={{ ['--agent-color']: colorForAgent(a.name, i) } as AgentColorStyle}
              >
                {glyphOf(a.name)}
              </span>
              <span>{a.name}</span>
            </span>
          ))}
          <span className="tag">{relativeTs(s.createdAt)}</span>
          {s.skillRun?.status === 'running' && <span className="tag" style={{ color: 'oklch(0.55 0.13 60)' }}>running</span>}
        </div>
        {s.skillRun?.status === 'running' && (
          <div className="progress shimmer"><i style={{ width: '62%' }} /></div>
        )}
      </div>
    </div>
  );
}

function CurrentlyWorkingBlock({ subfile, orgSlug }: { subfile: BrainSubfile; orgSlug: string }) {
  const mentioned = subfile.skillRun?.mentionedAgents[0];
  const color = mentioned ? colorForAgent(mentioned.name, 0) : 'var(--a-iris)';
  return (
    <div className="agent-block" style={{ ['--agent-color']: color } as AgentColorStyle}>
      <div className="head">
        <span className="av">{glyphOf(mentioned?.name || subfile.skillRun?.command || '·')}</span>
        <span className="nm">{mentioned?.name || subfile.skillRun?.command}</span>
        <span className="role">{subfile.skillRun?.kind} · {subfile.skillRun?.skillId.split('.')[0]}</span>
        <span className="status">
          <span className="dot" /> {subfile.skillRun?.status} · {relativeTs(subfile.createdAt)}
        </span>
      </div>
      <div className="body">
        <div className="step" data-state="done"><span className="marker" /><span className="stext">Created subfile</span><span className="meta">0.1s</span></div>
        <div className="step" data-state="done"><span className="marker" /><span className="stext">Loaded org context + provider catalog</span><span className="meta">0.3s</span></div>
        <div className="step" data-state="running"><span className="marker" /><span className="stext">{subfile.skillRun?.task ?? 'Running…'}</span><span className="meta">now</span></div>
        <div className="quote">
          “{subfile.skillRun?.task}”
          <span className="src">— Subfile: <Link href={`/${orgSlug}/docs/${subfile.id}`} style={{ color: 'inherit', borderBottom: '1px dashed currentColor' }}>{subfile.title}</Link></span>
        </div>
      </div>
      <div className="foot">
        <span className="pill">command <b>{subfile.skillRun?.command}</b></span>
        {mentioned && <span className="pill">on behalf of <b>@{mentioned.name}</b></span>}
        <span className="pill">subfile <b>{subfile.id}</b></span>
        <div className="actions">
          <Link className="btn" href={`/${orgSlug}/docs/${subfile.id}`}>Open →</Link>
        </div>
      </div>
    </div>
  );
}

function DecisionLog({ items, orgSlug }: { items: BrainSubfile[]; orgSlug: string }) {
  if (items.length === 0) {
    return (
      <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>
        No decisions logged yet. Every skill that completes lands here.
      </p>
    );
  }
  return (
    <div className="decisions">
      {items.map((s) => {
        const agent = s.skillRun?.mentionedAgents[0];
        const color = agent ? colorForAgent(agent.name, 0) : 'var(--ink)';
        return (
          <div key={s.id} className="decision" style={{ ['--agent-color']: color } as AgentColorStyle}>
            <span className="when">{relativeTs(s.createdAt)}</span>
            <div className="what">
              <Link href={`/${orgSlug}/docs/${s.id}`} style={{ color: 'inherit' }}>{s.title}</Link>
              <em>
                {s.skillRun?.command} · {s.skillRun?.requestedBy}
                {agent ? ` · for @${agent.name}` : ''}
              </em>
            </div>
            <span className="who">
              <span className="av" data-agent={agent ? '1' : '0'} style={{
                ['--agent-color']: color,
                ...(agent ? {} : { background: 'var(--bg-sunken)', color: '#444' }),
              } as AgentColorStyle}>
                {glyphOf(agent?.name || s.skillRun?.requestedBy || '·')}
              </span>
              {agent?.name?.split(' ')[0] || s.skillRun?.requestedBy.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MemoryBlock({ text, source, kind }: { text: string; source: string; kind: string }) {
  return (
    <div className="memory">
      <div className="m-q">{text}</div>
      <div className="m-meta">
        <span>{kind}</span>
        <span>·</span>
        <span>{source}</span>
      </div>
    </div>
  );
}

function SkillsRow({ skills, onPick }: { skills: BrainSkill[]; onPick: (s: BrainSkill) => void }) {
  // Show one chip per provider with that provider's flagship skill.
  const byProvider = new Map<string, BrainSkill>();
  for (const s of skills) if (!byProvider.has(s.provider)) byProvider.set(s.provider, s);
  return (
    <div className="skills-row">
      {Array.from(byProvider.values()).map((s) => (
        <button
          key={s.id}
          type="button"
          className="skill"
          onClick={() => onPick(s)}
          style={{ font: 'inherit', cursor: 'default' }}
        >
          <span className="name">{s.command}</span>
          <span className="by">{PROVIDER_LABELS[s.provider] || s.provider}</span>
        </button>
      ))}
    </div>
  );
}

// ─────────── Right rail panels ───────────

function ActivityList({ subfiles, research, orgSlug }: { subfiles: BrainSubfile[]; research: BrainResearch[]; orgSlug: string }) {
  const items: { id: string; kind: 'subfile' | 'research'; ts: string; node: ReactNode }[] = [];
  for (const s of subfiles) {
    const agent = s.skillRun?.mentionedAgents[0];
    items.push({
      id: 's:' + s.id, kind: 'subfile', ts: s.createdAt,
      node: (
        <div className="evt" key={s.id}>
          <span className="av" data-agent={agent ? '1' : '0'} style={{
            ['--agent-color']: agent ? colorForAgent(agent.name, 0) : 'var(--ink)',
            ...(agent ? {} : { background: 'var(--bg-sunken)' }),
          } as AgentColorStyle}>
            {glyphOf(agent?.name || s.skillRun?.command || '·')}
          </span>
          <div className="body">
            <div className="line">
              <b>{s.skillRun?.command || 'subfile'}</b> created{' '}
              <code>
                <Link href={`/${orgSlug}/docs/${s.id}`} style={{ color: 'inherit' }}>{s.title.slice(0, 36)}</Link>
              </code>
            </div>
            <div className="when">{relativeTs(s.createdAt)}{s.skillRun ? ` · ${s.skillRun.status}` : ''}</div>
          </div>
        </div>
      ),
    });
  }
  for (const r of research) {
    items.push({
      id: 'r:' + r.id, kind: 'research', ts: r.createdAt,
      node: (
        <div className="evt" key={r.id}>
          <span className="av" data-agent="1" style={{ ['--agent-color']: 'var(--a-iris)' } as AgentColorStyle}>RS</span>
          <div className="body">
            <div className="line">
              <b>Research</b>{' '}
              <code>
                <Link href={`/${orgSlug}/research/${r.id}`} style={{ color: 'inherit' }}>{r.topic.slice(0, 36)}</Link>
              </code>
            </div>
            <div className="when">{relativeTs(r.createdAt)} · {r.status}</div>
            {r.summary && <div className="preview">{r.summary.slice(0, 160)}{r.summary.length > 160 ? '…' : ''}</div>}
          </div>
        </div>
      ),
    });
  }
  items.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  const live = items.filter((i) => {
    if (i.kind === 'subfile') {
      const s = subfiles.find((x) => x.id === i.id.slice(2));
      return s?.skillRun?.status === 'running' || s?.skillRun?.status === 'pending';
    }
    const r = research.find((x) => x.id === i.id.slice(2));
    return r?.status === 'running' || r?.status === 'planning';
  });
  const earlier = items.filter((i) => !live.includes(i)).slice(0, 12);

  return (
    <>
      <div className="rail-h">Live</div>
      {live.length === 0
        ? <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '4px 0' }}>Nothing running.</div>
        : live.map((i) => i.node)}
      <div className="rail-h">Earlier</div>
      {earlier.length === 0
        ? <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '4px 0' }}>No history yet.</div>
        : earlier.map((i) => i.node)}
    </>
  );
}

function AgentInspector({ agent, allAgents, onPick }: {
  agent?: BrainAgent;
  allAgents: BrainAgent[];
  onPick: (id: string) => void;
}) {
  if (!agent) return null;
  return (
    <>
      <div className="agent-card" style={{ ['--agent-color']: agent.color } as AgentColorStyle}>
        <div className="top">
          <span className="av">{agent.glyph}</span>
          <div>
            <div className="name">{agent.name}</div>
            <div className="role">{agent.from}</div>
          </div>
          <span className="status">
            {agent.status === 'connected' && <><span className="dot" /> connected</>}
            {agent.status === 'pending' && <span style={{ color: 'var(--muted)' }}>pending</span>}
            {agent.status === 'revoked' && <span style={{ color: 'var(--muted)' }}>revoked</span>}
          </span>
        </div>
        <div className="grid">
          <div className="cell"><div className="l">Client</div><div className="v">{agent.from}</div></div>
          <div className="cell"><div className="l">Key prefix</div><div className="v">{agent.apiKeyPrefix}…</div></div>
          <div className="cell"><div className="l">Machine</div><div className="v">{agent.machine || '—'}</div></div>
          <div className="cell"><div className="l">OS</div><div className="v">{agent.os || '—'}</div></div>
        </div>
      </div>

      <div className="rail-h">Other agents</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {allAgents.filter((a) => a.id !== agent.id).map((a) => (
          <button
            key={a.id}
            type="button"
            className="side-agent"
            style={{ ['--agent-color']: a.color, border: 0, background: 'transparent', cursor: 'default' } as AgentColorStyle}
            onClick={() => onPick(a.id)}
          >
            <span className="av">{a.glyph}</span>
            <span className="nm">{a.name}</span>
            <span className={'stat ' + (a.status === 'connected' ? 'live' : '')}>{a.status}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function MemoryPanel({ memories }: { memories: { kind: string; text: string }[] }) {
  if (memories.length === 0) {
    return <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>No pinned memory yet.</div>;
  }
  return (
    <>
      <div className="rail-h">Pinned to project</div>
      {memories.map((m, i) => (
        <div key={i} className="memory" style={{ marginBottom: 10 }}>
          <div className="m-q">{m.text}</div>
          <div className="m-meta">
            <span>{m.kind}</span>
            <span>·</span>
            <span>read by every agent</span>
          </div>
        </div>
      ))}
    </>
  );
}

function ContextPanel({ data }: { data: BrainData }) {
  return (
    <>
      <div className="rail-h">This brain</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <KV l="Subfiles" v={String(data.subfiles.length)} />
        <KV l="Research" v={String(data.research.length)} />
        <KV l="Agents" v={String(data.agents.length)} />
        <KV l="Skills" v={String(data.skills.length)} />
      </div>
      <div className="rail-h">Providers</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
        {data.org.providers.map((p) => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{PROVIDER_LABELS[p] || p}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>installed</span>
          </div>
        ))}
      </div>
      <div className="rail-h" style={{ marginTop: 16 }}>Recent research</div>
      <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
        {data.research.slice(0, 3).map((r) => (
          <div key={r.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
            <div>{r.topic}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{relativeTs(r.createdAt)} · {r.status}</div>
          </div>
        ))}
        {data.research.length === 0 && <span style={{ color: 'var(--muted)' }}>No research yet.</span>}
      </div>
    </>
  );
}

function KV({ l, v }: { l: string; v: string }) {
  return (
    <div style={{ border: '1px solid var(--rule)', borderRadius: 6, padding: '8px 10px', background: 'var(--bg)' }}>
      <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)' }}>{l}</div>
      <div className="mono" style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>{v}</div>
    </div>
  );
}

// ─────────── Root ───────────

function BrainFileTreeRow({
  node,
  depth,
  activeSubfileId,
  orgSlug,
  creatingParentId,
  deletingDocId,
  onCreate,
  onDelete,
}: {
  node: BrainTreeNode;
  depth: number;
  activeSubfileId?: string;
  orgSlug: string;
  creatingParentId: string | null;
  deletingDocId: string | null;
  onCreate: (parentId: string) => void;
  onDelete: (doc: BrainSubfile) => void;
}) {
  const Icon = iconForSkillKind(node.skillRun?.kind);
  const isActive = activeSubfileId === node.id;
  const isCreating = creatingParentId === node.id;
  const isDeleting = deletingDocId === node.id;

  return (
    <>
      <div
        className={'side-row brain-file-row' + (isActive ? ' active' : '')}
        data-depth={depth}
        style={{ ['--tree-depth']: depth } as TreeDepthStyle}
      >
        <Link
          href={`/${orgSlug}/docs/${node.id}`}
          className="brain-file-main"
          title={node.title}
        >
          <Icon className="ico" size={14} />
          <span className="brain-file-name">{compactDocTitle(node.title)}</span>
        </Link>
        <div className="brain-file-actions" aria-label={`${node.title} file actions`}>
          <button
            className="brain-file-action"
            type="button"
            title="Add nested file"
            aria-label={`Add nested file under ${node.title}`}
            disabled={isCreating}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onCreate(node.id);
            }}
          >
            <Icons.Plus size={11} />
          </button>
          <button
            className="brain-file-action danger"
            type="button"
            title="Delete file"
            aria-label={`Delete ${node.title}`}
            disabled={isDeleting}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(node);
            }}
          >
            x
          </button>
        </div>
      </div>
      {node.children.map((child) => (
        <BrainFileTreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          activeSubfileId={activeSubfileId}
          orgSlug={orgSlug}
          creatingParentId={creatingParentId}
          deletingDocId={deletingDocId}
          onCreate={onCreate}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export default function BrainWorkstation({
  initial,
  centerBody,
  activeSubfileId,
}: {
  initial: BrainData;
  /** When provided, replaces the default brain doc body (used by /[org]/docs/[id]). */
  centerBody?: ReactNode;
  /** When set, the sidebar highlights this subfile instead of the Company brain root. */
  activeSubfileId?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<BrainData>(initial);
  const [railTab, setRailTab] = useState<'activity' | 'agent' | 'memory' | 'context'>('activity');
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(initial.agents[0]?.id ?? null);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [sideError, setSideError] = useState<string | null>(null);
  const [handoffPending, setHandoffPending] = useState(false);
  const [pushPending, setPushPending] = useState(false);
  const [topbarToast, setTopbarToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!topbarToast) return;
    const t = setTimeout(() => setTopbarToast(null), 3500);
    return () => clearTimeout(t);
  }, [topbarToast]);

  const runHandoff = async () => {
    if (handoffPending) return;
    setHandoffPending(true); setTopbarToast(null);
    try {
      const res = await fetch(`/api/orgs/${initial.org.slug}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy: 'doc-author' }),
      });
      const json = (await res.json()) as { ok?: boolean; doc?: { id: string; title: string }; error?: string };
      if (!res.ok || !json.doc) throw new Error(json.error || 'resume failed');
      setTopbarToast({ kind: 'ok', text: `Resume Packet created — ${json.doc.title}` });
      router.push(`/${initial.org.slug}/docs/${json.doc.id}`);
    } catch (err) {
      setTopbarToast({ kind: 'err', text: err instanceof Error ? err.message : 'handoff failed' });
    } finally {
      setHandoffPending(false);
    }
  };

  const runGithubPush = async () => {
    if (pushPending) return;
    setPushPending(true); setTopbarToast(null);
    try {
      const res = await fetch(`/api/orgs/${initial.org.slug}/github`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedBy: 'doc-author' }),
      });
      const json = (await res.json()) as { ok?: boolean; doc?: { id: string; title: string }; error?: string };
      if (!res.ok || !json.doc) throw new Error(json.error || 'push failed');
      setTopbarToast({ kind: 'ok', text: `GitHub bundle prepared — ${json.doc.title}` });
      router.push(`/${initial.org.slug}/docs/${json.doc.id}`);
    } catch (err) {
      setTopbarToast({ kind: 'err', text: err instanceof Error ? err.message : 'push failed' });
    } finally {
      setPushPending(false);
    }
  };

  // Subscribe to org SSE so the doc updates live when skills run.
  useEffect(() => {
    const es = new EventSource(`/api/events?org=${initial.org.slug}`);
    es.onmessage = () => {
      // Cheap refresh: re-fetch the snapshot. Server is fast on file-backed reads.
      void refresh();
    };
    let canceled = false;
    const refresh = async () => {
      try {
        const [docsR, researchR, agentsR] = await Promise.all([
          fetch(`/api/orgs/${initial.org.slug}/docs`, { cache: 'no-store' }).then((r) => r.json()),
          fetch(`/api/research?org=${initial.org.slug}`, { cache: 'no-store' }).then((r) => r.json()),
          fetch(`/api/orgs/${initial.org.slug}/agents`, { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (canceled) return;
        const subfiles: BrainSubfile[] = ((docsR.docs || []) as DocsApiNode[])
          .filter((d: { kind: string }) => d.kind === 'subfile')
          .map(apiDocToSubfile);
        const research: BrainResearch[] = (researchR.research || []).map((r: BrainResearch) => r);
        const agents: BrainAgent[] = ((agentsR.agents || []) as Array<{
          id: string; name: string; from: string; status: AgentStatus; apiKeyPrefix: string;
          platform?: { machine?: string | null; os?: string | null };
        }>).map((a, i): BrainAgent => ({
          id: a.id, name: a.name, from: a.from, status: a.status, apiKeyPrefix: a.apiKeyPrefix,
          machine: a.platform?.machine ?? null, os: a.platform?.os ?? null,
          glyph: glyphOf(a.name), color: colorForAgent(a.name, i),
        }));
        const rootDocId = typeof docsR.root?.id === 'string' ? docsR.root.id : undefined;
        setData((prev) => ({
          ...prev,
          org: rootDocId ? { ...prev.org, brainDocId: rootDocId } : prev.org,
          subfiles,
          research,
          agents,
        }));
      } catch { /* ignore network blips */ }
    };
    return () => { canceled = true; es.close(); };
  }, [initial.org.slug]);

  const createSubfile = async (parentId: string) => {
    if (creatingParentId) return;
    const cleanTitle = nextSubfileTitle(data.subfiles);

    setSideError(null);
    setCreatingParentId(parentId);
    try {
      const res = await fetch(`/api/orgs/${data.org.slug}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: cleanTitle, parentId, createdBy: 'user' }),
      });
      const result = (await res.json()) as { doc?: DocsApiNode; error?: string };
      if (!res.ok || !result.doc) throw new Error(result.error || 'Create failed');
      const subfile = apiDocToSubfile(result.doc);
      setData((prev) => ({
        ...prev,
        subfiles: [subfile, ...prev.subfiles.filter((s) => s.id !== subfile.id)],
      }));
      router.push(`/${data.org.slug}/docs/${subfile.id}`);
      router.refresh();
    } catch (error) {
      setSideError(error instanceof Error ? error.message : 'Create failed');
    } finally {
      setCreatingParentId(null);
    }
  };

  const deleteSubfile = async (doc: BrainSubfile) => {
    if (deletingDocId) return;

    setSideError(null);
    setDeletingDocId(doc.id);
    try {
      const res = await fetch(`/api/orgs/${data.org.slug}/docs/${doc.id}`, { method: 'DELETE' });
      const result = (await res.json()) as { deletedIds?: string[]; error?: string };
      if (!res.ok) throw new Error(result.error || 'Delete failed');
      const deletedIds = new Set(result.deletedIds ?? [doc.id]);
      setData((prev) => ({ ...prev, subfiles: prev.subfiles.filter((s) => !deletedIds.has(s.id)) }));
      if (activeSubfileId && deletedIds.has(activeSubfileId)) {
        router.push(`/${data.org.slug}/brain`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setSideError(error instanceof Error ? error.message : 'Delete failed');
    } finally {
      setDeletingDocId(null);
    }
  };

  const workingAgents = data.agents.filter((a) => a.status === 'connected').length;
  const openSubfiles = data.subfiles.filter((s) => s.skillRun?.status !== 'done').length;
  const completedSubfiles = data.subfiles.filter((s) => s.skillRun?.status === 'done');
  const runningSubfile = data.subfiles.find((s) => s.skillRun?.status === 'running' || s.skillRun?.status === 'pending');
  const focusedAgent = data.agents.find((a) => a.id === focusedAgentId) ?? data.agents[0];
  const subfileTree = useMemo(
    () => buildSubfileTree(data.subfiles, data.org.brainDocId),
    [data.subfiles, data.org.brainDocId],
  );

  return (
    <div className="workstation-root">
      <div className="app" data-density="regular" data-rail="1">
        {/* Top bar */}
        <div className="topbar">
          <div className="brand">
            <div className="logo" />
            <span className="name">Throughline</span>
            <span className="sep">/</span>
            <span className="proj">{data.org.name}</span>
          </div>
          <div className="crumbs">
            <span className="crumb">Projects</span>
            <span className="arrow">›</span>
            <span className="crumb">{data.org.name}</span>
            <span className="arrow">›</span>
            <span className="crumb current">Company brain</span>
          </div>
          <div className="topbar-right">
            <Link className="btn" href={`/${data.org.slug}/install`}>
              <span style={{ fontSize: 12 }}>+ Agent</span>
            </Link>
            <Link className="btn" href={`/${data.org.slug}/agents`}>
              <span style={{ fontSize: 12 }}>Agents</span>
              <span className="kbd">{data.agents.length}</span>
            </Link>
            <div className="presence">
              <div className="avs">
                {data.people.slice(0, 4).map((p) => (
                  <span key={p.name} className="av" title={`${p.name} · ${p.role}`} style={{ background: p.tone, color: '#fff' }}>
                    {p.initials}
                  </span>
                ))}
                {data.agents.slice(0, 5).map((a) => (
                  <span
                    key={a.id}
                    className="av"
                    data-agent="1"
                    style={{ ['--agent-color']: a.color } as AgentColorStyle}
                    title={`${a.name} · ${a.from}`}
                    onClick={() => { setFocusedAgentId(a.id); setRailTab('agent'); }}
                  >
                    <span className="glyph">{a.glyph}</span>
                  </span>
                ))}
              </div>
              {(data.agents.length > 5 || data.people.length > 4) && (
                <span className="more">+{(data.agents.length - 5) + (data.people.length - 4)}</span>
              )}
            </div>
            <button
              className="btn"
              type="button"
              onClick={() => void runHandoff()}
              disabled={handoffPending}
              title="Generate a Resume Packet snapshot of this room"
            >
              <span style={{ fontSize: 12 }}>{handoffPending ? 'Compressing…' : 'Hand off'}</span>
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => void runGithubPush()}
              disabled={pushPending}
              title="Bundle the room state and stage it for a GitHub PR"
            >
              <span style={{ fontSize: 12 }}>{pushPending ? 'Bundling…' : 'Push to GitHub'}</span>
            </button>
            <button className="btn primary" type="button">Share</button>
          </div>
        </div>
        {topbarToast && (
          <div
            style={{
              position: 'fixed', top: 56, right: 16, zIndex: 50,
              padding: '8px 12px', borderRadius: 8,
              fontFamily: 'Geist Mono, monospace', fontSize: 12,
              background: topbarToast.kind === 'ok' ? 'oklch(0.96 0.06 150)' : 'oklch(0.95 0.08 25)',
              color: topbarToast.kind === 'ok' ? 'oklch(0.36 0.13 150)' : 'oklch(0.4 0.14 25)',
              border: `1px solid ${topbarToast.kind === 'ok' ? 'oklch(0.86 0.12 150)' : 'oklch(0.85 0.13 25)'}`,
              boxShadow: '0 10px 26px -14px rgba(0,0,0,0.25)',
            }}
          >
            {topbarToast.text}
          </div>
        )}

        {/* Sidebar */}
        <div className="side">
          <div className="side-sec">Workspace</div>
          <div className="side-row">
            <Icons.Globe className="ico" size={14} />
            <span>{data.org.name}</span>
            <span className="meta">{data.org.domain.replace(/\.neverzero\.org$/, '')}</span>
          </div>
          <div className="side-row">
            <Icons.Memory className="ico" size={14} />
            <span>Shared memory</span>
            <span className="meta">{data.org.memories.length}</span>
          </div>
          <Link href={`/${data.org.slug}/agents`} className="side-row" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Icons.Agents className="ico" size={14} />
            <span>Agent registry</span>
            <span className="meta">{data.agents.length}</span>
          </Link>

          <div className="side-sec brain-tree-sec">
            <span>{data.org.name} - Company brain</span>
            <button
              className="brain-tree-head-action"
              type="button"
              title="Add file"
              aria-label="Add file"
              disabled={creatingParentId === data.org.brainDocId}
              onClick={() => void createSubfile(data.org.brainDocId)}
            >
              <Icons.Plus size={12} />
            </button>
          </div>
          <div className="brain-file-tree" aria-label={`${data.org.name} brain files`}>
            <div className={'side-row brain-file-row brain-file-root' + (activeSubfileId ? '' : ' active')}>
              <Link href={`/${data.org.slug}/brain`} className="brain-file-main">
                <Icons.ChevD className="ico" size={14} />
                <Icons.Doc className="ico" size={14} />
                <span className="brain-file-name">Company brain</span>
              </Link>
              <div className="brain-file-actions" aria-label="Company brain file actions">
                <button
                  className="brain-file-action"
                  type="button"
                  title="Add file"
                  aria-label="Add file under Company brain"
                  disabled={creatingParentId === data.org.brainDocId}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    void createSubfile(data.org.brainDocId);
                  }}
                >
                  <Icons.Plus size={11} />
                </button>
              </div>
            </div>
            {subfileTree.map((node) => (
              <BrainFileTreeRow
                key={node.id}
                node={node}
                depth={1}
                activeSubfileId={activeSubfileId}
                orgSlug={data.org.slug}
                creatingParentId={creatingParentId}
                deletingDocId={deletingDocId}
                onCreate={(parentId) => void createSubfile(parentId)}
                onDelete={(doc) => void deleteSubfile(doc)}
              />
            ))}
            {data.subfiles.length === 0 && (
              <div className="brain-file-empty">No files yet. Create one or run a skill.</div>
            )}
            {sideError && <div className="brain-side-error">{sideError}</div>}
          </div>
          <Link href={`/${data.org.slug}/research`} className="side-row indent" style={{ textDecoration: 'none', color: 'var(--ink-soft)' }}>
            <Icons.Search className="ico" size={14} />
            <span>Research</span>
            <span className="meta">{data.research.length}</span>
          </Link>
          <Link href={`/${data.org.slug}/install`} className="side-row indent" style={{ textDecoration: 'none', color: 'var(--ink-soft)' }}>
            <Icons.Branch className="ico" size={14} />
            <span>Deploys</span>
          </Link>
          <div className="side-sec">Agents on this doc</div>
          {data.agents.map((a) => (
            <button
              key={a.id}
              type="button"
              className="side-agent"
              style={{ ['--agent-color']: a.color, border: 0, background: 'transparent', cursor: 'default', textAlign: 'left' } as AgentColorStyle}
              onClick={() => { setFocusedAgentId(a.id); setRailTab('agent'); }}
            >
              <span className="av">{a.glyph}</span>
              <span className="nm">{a.name}</span>
              <span className={'stat ' + (a.status === 'connected' ? 'live' : '')}>
                {a.status === 'connected' ? a.from : a.status}
              </span>
            </button>
          ))}
          {data.agents.length === 0 && (
            <Link href={`/${data.org.slug}/install`} className="side-row" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
              <span style={{ width: 16 }} />
              <span>+ Install your first agent</span>
            </Link>
          )}

          <div className="workspace-foot">
            <b>Throughline Cloud</b><br />
            Providers: {data.org.providers.map((p) => PROVIDER_LABELS[p] || p).join(' · ')}
          </div>
        </div>

        {/* Doc */}
        <div className="doc">
          {centerBody ? (
            <div className="doc-body">{centerBody}</div>
          ) : (
          <div className="doc-body">
            <div className="doc-meta">
              <span className="pill">
                <span className="dot" /> Live · {workingAgents} {workingAgents === 1 ? 'agent' : 'agents'} connected
              </span>
              <span>Brain created {relativeTs(data.org.createdAt)}</span>
              {data.org.hq && <><span>·</span><span>{data.org.hq}</span></>}
            </div>

            <h1 className="doc-title">{data.org.name}</h1>
            <p className="doc-sub">{data.org.tagline || `${data.org.name} company brain.`}</p>

            <CommandBar
              orgSlug={data.org.slug}
              agents={data.agents}
              skills={data.skills}
              onDispatched={() => router.refresh()}
            />

            <StatusStrip
              open={openSubfiles}
              agentsConnected={workingAgents}
              agentsTotal={data.agents.length}
              skillsRun={data.subfiles.length}
              providersCount={data.org.providers.length}
              createdAt={data.org.createdAt}
            />

            <h2><span className="num">01</span> Mission</h2>
            <MissionParagraph org={data.org} agents={data.agents} />

            <h2><span className="num">02</span> Open work · {openSubfiles}</h2>
            {data.subfiles.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                Nothing in the tree yet. Type <span className="mono" style={{ background: 'var(--bg-sunken)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>@agent /plan launch beta</span> above to spin up the first subfile.
              </p>
            ) : (
              <div className="todos">
                {data.subfiles.slice(0, 10).map((s) => <SubfileTodo key={s.id} s={s} orgSlug={data.org.slug} />)}
              </div>
            )}

            {runningSubfile && (
              <>
                <h2><span className="num">03</span> Currently working</h2>
                <p>
                  The orchestrator picked this up{' '}
                  <span className="mention">{relativeTs(runningSubfile.createdAt)}</span> when{' '}
                  <span className="mention">{runningSubfile.skillRun?.requestedBy}</span> ran{' '}
                  <span className="mention">{runningSubfile.skillRun?.command}</span>.
                </p>
                <CurrentlyWorkingBlock subfile={runningSubfile} orgSlug={data.org.slug} />
              </>
            )}

            <h2><span className="num">{runningSubfile ? '04' : '03'}</span> Decision log</h2>
            <p>
              Every completed skill run is a decision. {data.subfiles.find((s) => s.skillRun?.command === '/review') ? <>
                <span className="mention agent" style={{ ['--agent-color']: 'var(--a-loop)' } as AgentColorStyle}>@Loop</span>{' '}
                audits this list daily.
              </> : <>Pin one with <span className="mono" style={{ background: 'var(--bg-sunken)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>/remember</span>.</>}
            </p>
            <DecisionLog items={completedSubfiles.slice(0, 6)} orgSlug={data.org.slug} />

            <h2><span className="num">{runningSubfile ? '05' : '04'}</span> Memory pinned to this project</h2>
            <p>
              Agents read this before doing anything. To pin something new, hit{' '}
              <span className="mono" style={{ background: 'var(--bg-sunken)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}>/remember</span>{' '}
              in the command bar above.
            </p>
            {data.org.memories.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>No pinned memory yet.</p>
            ) : data.org.memories.map((m, i) => (
              <MemoryBlock key={i} text={m.text} kind={m.kind} source={`pinned · ${data.org.name}`} />
            ))}

            <h2><span className="num">{runningSubfile ? '06' : '05'}</span> Skills available here</h2>
            <p>
              {data.skills.length} skill{data.skills.length === 1 ? '' : 's'} from{' '}
              {data.org.providers.length} installed provider{data.org.providers.length === 1 ? '' : 's'}.
              Click one or type its command above.
            </p>
            <SkillsRow
              skills={data.skills}
              onPick={(s) => {
                // Pre-fill the command bar — find the input and inject the skill command.
                // It's not strictly necessary, but it nudges the demo flow.
                const inp = document.querySelector<HTMLInputElement>('.ws-cmd-input');
                if (inp) {
                  inp.value = s.command + ' ';
                  inp.focus();
                  inp.setSelectionRange(inp.value.length, inp.value.length);
                  inp.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }}
            />

            <hr className="rule" />
            <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 0 }}>
              Last refresh just now · {data.agents.length} registered agent{data.agents.length === 1 ? '' : 's'} ·
              {' '}{data.subfiles.length} subfile{data.subfiles.length === 1 ? '' : 's'} in the tree ·
              {' '}domain: {data.org.domain}
            </p>
          </div>
          )}
        </div>

        {/* Right rail */}
        <div className="rail">
          <div className="rail-tabs">
            <button className={'rail-tab ' + (railTab === 'activity' ? 'active' : '')} onClick={() => setRailTab('activity')}>
              Activity <span className="count">{data.subfiles.length + data.research.length}</span>
            </button>
            <button className={'rail-tab ' + (railTab === 'agent' ? 'active' : '')} onClick={() => setRailTab('agent')}>Agent</button>
            <button className={'rail-tab ' + (railTab === 'memory' ? 'active' : '')} onClick={() => setRailTab('memory')}>Memory</button>
            <button className={'rail-tab ' + (railTab === 'context' ? 'active' : '')} onClick={() => setRailTab('context')}>Context</button>
          </div>
          <div className="rail-body">
            {railTab === 'activity' && <ActivityList subfiles={data.subfiles} research={data.research} orgSlug={data.org.slug} />}
            {railTab === 'agent' && <AgentInspector agent={focusedAgent} allAgents={data.agents} onPick={setFocusedAgentId} />}
            {railTab === 'memory' && <MemoryPanel memories={data.org.memories} />}
            {railTab === 'context' && <ContextPanel data={data} />}
          </div>
        </div>
      </div>
    </div>
  );
}
