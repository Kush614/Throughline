'use client';

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icons } from './icons';
import {
  AGENTS,
  PEOPLE,
  SKILLS,
  EVENTS,
  MEMORY,
  countWorkingAgents,
  getTopActiveAgents,
  type Agent,
  type Skill,
} from './data';

type Todo = {
  id: number;
  title: string;
  done: boolean;
  by: string;
  agent?: boolean;
  color?: string;
  tag?: string;
  due?: string;
  progress?: number;
};

type Decision = {
  when: string;
  what: string;
  why?: string;
  by: string;
  agent?: boolean;
};

type AgentStep = {
  state: 'done' | 'running' | 'pending';
  text: string;
  meta: string;
};

type AgentColorStyle = CSSProperties & { ['--agent-color']?: string };

const INITIAL_TODOS: Todo[] = [
  { id: 1, title: 'Lock pricing tiers (Solo / Team / Workspace)', done: true,  by: 'sam',   tag: '#decision' },
  { id: 2, title: 'Draft launch narrative — "shared layer for AI native work"', done: true, by: 'yuna' },
  { id: 3, title: 'Competitor matrix — 12 workspaces, retention + agent depth',
    done: true, by: 'iris', agent: true, color: 'var(--a-iris)', tag: '/research' },
  { id: 4, title: 'Land onboarding flow — show one real agent in <60s',
    done: false, by: 'yuna', tag: 'spec v3', due: 'Tue' },
  { id: 5, title: 'Wire OAuth + agent SSO across providers',
    done: false, by: 'forge', agent: true, color: 'var(--a-forge)', tag: 'PR #284', progress: 62 },
  { id: 6, title: 'Audit retrieval quality on ZeroEntropy index',
    done: false, by: 'iris', agent: true, color: 'var(--a-iris)', tag: '/research', progress: 38 },
  { id: 7, title: 'Benchmark cold-start latency vs. 3 incumbents',
    done: false, by: 'diego', due: 'Thu' },
  { id: 8, title: 'Red-team the launch plan against renewal risk',
    done: false, by: 'loop', agent: true, color: 'var(--a-loop)', tag: '/redteam' },
  { id: 9, title: 'Ship beta to 200 design partner teams', done: false, by: 'sam', due: 'Jun 20' },
  { id: 10, title: 'Configure prod deploy on Lightsprint', done: false, by: 'beam', agent: true, color: 'var(--a-beam)' },
  { id: 11, title: 'Write release notes from decision log', done: false, by: 'atlas', agent: true, color: 'var(--a-atlas)', tag: '/summarize' },
  { id: 12, title: 'Send invites to launch event (Jul 12)', done: false, by: 'priya', due: 'Jul 1' },
];

const DECISIONS: Decision[] = [
  { when: '11:48', what: 'Workspace tier ships with shared memory and agent SSO',
    why: 'Differentiates from Solo/Team. Validated by 8 of 12 design partners.', by: 'sam' },
  { when: '11:30', what: 'Onboarding shows one real agent doing real work in <60s',
    why: 'No screencast. Iris (research-agent) is the default first agent.', by: 'yuna' },
  { when: '10:02', what: 'Move retrieval to ZeroEntropy v2 index',
    why: 'Top-3 recall jumped from 0.71 → 0.91 in eval.', by: 'iris', agent: true },
  { when: 'Yest.', what: 'Deploys go through Lightsprint, not the legacy runner',
    why: 'Cold start 3× faster on agent workloads.', by: 'diego' },
];

const AGENT_STEPS: AgentStep[] = [
  { state: 'done',    text: 'Pulled 12 workspace onboarding flows from cache',      meta: '0.4s' },
  { state: 'done',    text: 'Extracted drop-off step per flow, ranked by severity', meta: '2.1s' },
  { state: 'running', text: 'Cross-checking against our internal NPS comments',     meta: 'now' },
  { state: 'pending', text: 'Drafting 3 hypotheses for step-3 consent friction',    meta: '' },
  { state: 'pending', text: 'Handing off cleaned summary to Atlas for replanning',  meta: '' },
];

const SKILL_ROW_ITEMS = [
  { name: 'research',  by: 'ZeroEntropy' },
  { name: 'compete',   by: 'ZeroEntropy' },
  { name: 'scaffold',  by: 'GStack' },
  { name: 'review',    by: 'The Hog' },
  { name: 'deploy',    by: 'Lightsprint' },
  { name: 'compress',  by: 'Throughline' },
];

const CURSOR_POSITIONS = {
  iris:  [{ x: 0.55, y: 0.46 }, { x: 0.32, y: 0.50 }, { x: 0.68, y: 0.54 }, { x: 0.42, y: 0.48 }],
  forge: [{ x: 0.18, y: 0.78 }, { x: 0.45, y: 0.80 }, { x: 0.12, y: 0.76 }, { x: 0.50, y: 0.82 }],
  yuna:  [{ x: 0.62, y: 0.30 }, { x: 0.40, y: 0.34 }, { x: 0.30, y: 0.32 }, { x: 0.55, y: 0.36 }],
} as const;

const DOC_AGENTS = getTopActiveAgents(AGENTS);
const REGISTERED_AGENT_COUNT = AGENTS.length;

function ContextStrip({
  ctx,
  onCompress,
}: {
  ctx: { used: number; turns: number; tokens: string };
  onCompress: () => void;
}) {
  const pct = Math.round(ctx.used);
  return (
    <div className="ctx-strip">
      <div className="pct">
        <span>Context</span>
        <div className={'bar ' + (pct > 80 ? 'warn' : '')}>
          <i style={{ width: pct + '%' }} />
        </div>
        <span className="mono">{pct}%</span>
      </div>
      <div className="meta-bits">
        <span>
          <b>{ctx.turns}</b> turns
        </span>
        <span>
          <b>{ctx.tokens}</b> tok
        </span>
        <span>
          <b>3×</b> compressed
        </span>
      </div>
      <button className="compress-btn" onClick={onCompress}>
        <Icons.Compress className="ico" size={12} />
        Compress old turns
      </button>
    </div>
  );
}

function StatusStrip() {
  return (
    <div className="status-strip">
      <div className="status-cell">
        <div className="lbl">Plan</div>
        <div className="val">
          7 / 12 <span className="sub">done</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Agents</div>
        <div className="val">
          <span className="live-dot" /> 2 <span className="sub">working · 3 idle</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Decisions</div>
        <div className="val">
          18 <span className="sub">logged</span>
        </div>
      </div>
      <div className="status-cell">
        <div className="lbl">Ship date</div>
        <div className="val">
          Jul 14 <span className="sub">in 8 wks</span>
        </div>
      </div>
    </div>
  );
}

function TodoRow({ todo, onToggle }: { todo: Todo; onToggle: (id: number) => void }) {
  const actor = todo.agent
    ? AGENTS.find((a) => a.id === todo.by)
    : PEOPLE.find((p) => p.id === todo.by);
  const style: AgentColorStyle = todo.agent ? { ['--agent-color']: todo.color } : {};
  const avStyle: CSSProperties & { ['--agent-color']?: string } = todo.agent
    ? { ['--agent-color']: todo.color }
    : { background: (actor as { tone?: string })?.tone, color: '#fff' };
  return (
    <div className="todo" data-done={todo.done ? '1' : '0'} style={style}>
      <span className="check" onClick={() => onToggle(todo.id)} />
      <div className="body">
        <div className="ttl">{todo.title}</div>
        <div className="sub-row">
          {actor && (
            <span className="by">
              <span className="av" data-agent={todo.agent ? '1' : '0'} style={avStyle}>
                {todo.agent ? (actor as Agent).glyph : (actor as { initials: string }).initials}
              </span>
              <span>{actor.name}</span>
            </span>
          )}
          {todo.tag && <span className="tag">{todo.tag}</span>}
          {todo.due && <span className="tag due">{todo.due}</span>}
        </div>
        {todo.progress != null && (
          <div className={'progress ' + (todo.progress < 100 && todo.agent ? 'shimmer' : '')}>
            <i style={{ width: todo.progress + '%' }} />
          </div>
        )}
      </div>
    </div>
  );
}

function TodoList({
  items,
  onToggle,
}: {
  items: Todo[];
  onToggle: (id: number) => void;
}) {
  return (
    <div className="todos">
      {items.map((t) => (
        <TodoRow key={t.id} todo={t} onToggle={onToggle} />
      ))}
    </div>
  );
}

function AgentBlock({
  agent,
  steps,
  quote,
}: {
  agent: Agent;
  steps: AgentStep[];
  quote: { text: string; src: string };
}) {
  const style: AgentColorStyle = { ['--agent-color']: agent.color };
  return (
    <div className="agent-block" style={style}>
      <div className="head">
        <span className="av">{agent.glyph}</span>
        <span className="nm">{agent.name}</span>
        <span className="role">
          {agent.role} · {agent.provider}
        </span>
        <span className="status">
          <span className="dot" /> live · t+0:42
        </span>
      </div>
      <div className="body">
        {steps.map((s, i) => (
          <div key={i} className="step" data-state={s.state}>
            <span className="marker" />
            <span className="stext">{s.text}</span>
            <span className="meta">{s.meta}</span>
          </div>
        ))}
        <div className="quote">
          “{quote.text}”
          <span className="src">— {quote.src}</span>
        </div>
      </div>
      <div className="foot">
        <span className="pill">
          reading <b>12</b> sources
        </span>
        <span className="pill">
          found <b>3</b> contradictions
        </span>
        <span className="pill">
          cost <b>$0.07</b>
        </span>
        <div className="actions">
          <button className="btn">Pause</button>
          <button className="btn">Hand off →</button>
        </div>
      </div>
    </div>
  );
}

function DecisionLog({ items }: { items: Decision[] }) {
  return (
    <div className="decisions">
      {items.map((d, i) => {
        const isA = !!d.agent;
        const actor = isA
          ? AGENTS.find((a) => a.id === d.by)
          : PEOPLE.find((p) => p.id === d.by);
        const style: AgentColorStyle = isA
          ? { ['--agent-color']: (actor as Agent | undefined)?.color }
          : {};
        const avStyle: CSSProperties & { ['--agent-color']?: string } = isA
          ? { ['--agent-color']: (actor as Agent | undefined)?.color }
          : {
              background: (actor as { tone?: string } | undefined)?.tone,
              color: '#fff',
            };
        return (
          <div key={i} className="decision" style={style}>
            <span className="when">{d.when}</span>
            <div className="what">
              {d.what}
              {d.why && <em>{d.why}</em>}
            </div>
            <span className="who">
              <span className="av" data-agent={isA ? '1' : '0'} style={avStyle}>
                {isA
                  ? (actor as Agent | undefined)?.glyph
                  : (actor as { initials?: string } | undefined)?.initials}
              </span>
              {actor?.name?.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MemoryBlock({ text, source, when }: { text: string; source: string; when: string }) {
  return (
    <div className="memory">
      <div className="m-q">{text}</div>
      <div className="m-meta">
        <span>{source}</span>
        <span>·</span>
        <span>{when}</span>
      </div>
    </div>
  );
}

function SkillsRow({
  skills,
  onInvoke,
}: {
  skills: { name: string; by: string }[];
  onInvoke: () => void;
}) {
  return (
    <div className="skills-row">
      {skills.map((s) => (
        <span key={s.name} className="skill" onClick={onInvoke}>
          <span className="name">/{s.name}</span>
          <span className="by">{s.by}</span>
        </span>
      ))}
    </div>
  );
}

function ContinueBanner({
  onHover,
  onLeave,
}: {
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="continue-banner" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <span className="ico">
        <Icons.Phone size={14} />
      </span>
      <div className="txt">
        <b>Continue on mobile.</b> Project state, open agents, and context travel with you — pick up
        exactly where you stop.
      </div>
      <div className="qr" />
    </div>
  );
}

function TopBar({
  project,
  peopleHere,
  agentsHere,
  registeredAgentCount,
  onOpenAgent,
}: {
  project: { workspace: string; name: string; doc: string };
  peopleHere: typeof PEOPLE;
  agentsHere: Agent[];
  registeredAgentCount: number;
  onOpenAgent: (id: string) => void;
}) {
  const hiddenAgentCount = Math.max(0, registeredAgentCount - agentsHere.length);

  return (
    <div className="topbar">
      <div className="brand">
        <div className="logo" />
        <span className="name">Throughline</span>
        <span className="sep">/</span>
        <span className="proj">{project.workspace}</span>
      </div>
      <div className="crumbs">
        <span className="crumb">
          <Icons.Doc size={13} /> Projects
        </span>
        <span className="arrow">›</span>
        <span className="crumb">{project.name}</span>
        <span className="arrow">›</span>
        <span className="crumb current">{project.doc}</span>
      </div>
      <div className="topbar-right">
        <button className="btn" title="Search">
          <Icons.Search size={14} />
          <span style={{ fontSize: 12 }}>Find</span>
          <span className="kbd">⌘F</span>
        </button>
        <div className="presence">
          <div className="avs">
            {peopleHere.map((p) => (
              <span
                key={p.id}
                className="av"
                title={`${p.name} · ${p.role}`}
                style={{ background: p.tone, color: '#fff' }}
              >
                {p.initials}
                {p.online && <span className="dot" />}
              </span>
            ))}
            {agentsHere.map((a) => {
              const style: AgentColorStyle = { ['--agent-color']: a.color };
              return (
                <span
                  key={a.id}
                  className="av"
                  data-agent="1"
                  style={style}
                  title={`${a.name} · ${a.role} · powered by ${a.provider}`}
                  onClick={() => onOpenAgent(a.id)}
                >
                  <span className="glyph">{a.glyph}</span>
                </span>
              );
            })}
          </div>
          {hiddenAgentCount > 0 && <span className="more">+{hiddenAgentCount}</span>}
        </div>
        <button className="btn" title="Sync">
          <Icons.Sync size={14} />
        </button>
        <button className="btn primary">
          <Icons.Share size={13} /> Share
        </button>
        <button className="btn icon" title="More">
          <Icons.More size={16} />
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  activeId,
  agentsHere,
  registeredAgentCount,
  onPick,
  onOpenAgent,
}: {
  activeId: string;
  agentsHere: Agent[];
  registeredAgentCount: number;
  onPick: (id: string) => void;
  onOpenAgent: (id: string) => void;
}) {
  return (
    <div className="side">
      <div className="side-sec">Workspace</div>
      <div className="side-row">
        <Icons.Globe className="ico" size={14} />
        <span>Acme Robotics</span>
        <span className="meta">23</span>
      </div>
      <div className="side-row">
        <Icons.Memory className="ico" size={14} />
        <span>Shared memory</span>
      </div>
      <div className="side-row">
        <Icons.Agents className="ico" size={14} />
        <span>Agent roster</span>
        <span className="meta">{registeredAgentCount}</span>
      </div>

      <div className="side-sec">Atlas — Q3 Launch</div>
      <div className="side-row">
        <Icons.ChevD className="ico" size={14} />
        <Icons.Doc className="ico" size={14} />
        <span>README</span>
      </div>
      <div
        className={'side-row indent ' + (activeId === 'plan' ? 'active' : '')}
        onClick={() => onPick('plan')}
      >
        <Icons.Plan className="ico" size={14} />
        <span>Launch plan</span>
        <span className="meta">12</span>
      </div>
      <div className="side-row indent">
        <Icons.Doc className="ico" size={14} />
        <span>Research notes</span>
      </div>
      <div className="side-row indent deep">
        <Icons.Doc className="ico" size={14} />
        <span>Pricing teardown</span>
      </div>
      <div className="side-row indent deep">
        <Icons.Doc className="ico" size={14} />
        <span>Onboarding flows</span>
      </div>
      <div className="side-row indent">
        <Icons.Decision className="ico" size={14} />
        <span>Decisions</span>
        <span className="meta">18</span>
      </div>
      <div className="side-row indent">
        <Icons.Branch className="ico" size={14} />
        <span>Deploys</span>
      </div>

      <div className="side-sec">Agents on this doc</div>
      {agentsHere.map((a) => {
        const style: AgentColorStyle = { ['--agent-color']: a.color };
        return (
          <div
            key={a.id}
            className="side-agent"
            onClick={() => onOpenAgent(a.id)}
            style={style}
          >
            <span className="av">{a.glyph}</span>
            <span className="nm">{a.name}</span>
            <span className={'stat ' + (a.state === 'working' ? 'live' : '')}>
              {a.state === 'working' ? a.statusShort : a.lastSeen}
            </span>
          </div>
        );
      })}

      <div className="workspace-foot">
        <b>Throughline Cloud</b>
        <br />
        Powered by GStack · GBrain · ZeroEntropy · The Hog · Lightsprint
      </div>
    </div>
  );
}

function KV({ l, v }: { l: string; v: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--rule)',
        borderRadius: 6,
        padding: '8px 10px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
        }}
      >
        {l}
      </div>
      <div className="mono" style={{ fontSize: 14, color: 'var(--ink)', marginTop: 2 }}>
        {v}
      </div>
    </div>
  );
}

function CLog({ when, title, note }: { when: string; title: string; note: string }) {
  return (
    <div style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--muted)', width: 36, flexShrink: 0 }}
        >
          {when}
        </span>
        <div>
          <div style={{ color: 'var(--ink-soft)' }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{note}</div>
        </div>
      </div>
    </div>
  );
}

function ActivityList() {
  const findAct = (id: string) => {
    const a = AGENTS.find((x) => x.id === id);
    if (a) return { isAgent: true, glyph: a.glyph, name: a.name, color: a.color };
    const p = PEOPLE.find((x) => x.id === id);
    if (!p) return null;
    return { isAgent: false, glyph: p.initials, name: p.name, color: p.tone };
  };
  const rows: ReactNode[] = [];
  EVENTS.filter((e) => e.live).forEach((e, i) => {
    const a = findAct(e.actor);
    if (!a) return;
    const avStyle: CSSProperties & { ['--agent-color']?: string } = {
      ['--agent-color']: a.color,
      background: a.isAgent ? undefined : a.color,
      color: a.isAgent ? undefined : '#fff',
    };
    rows.push(
      <div key={'l' + i} className="evt">
        <span className="av" data-agent={a.isAgent ? '1' : '0'} style={avStyle}>
          {a.glyph}
        </span>
        <div className="body">
          <div className="line">
            <b>{a.name}</b> {e.verb} {e.target && <code>{e.target}</code>}
            {e.note && (
              <>
                {' '}· <span style={{ color: 'var(--muted)' }}>{e.note}</span>
              </>
            )}
          </div>
          <div className="when">{e.when}</div>
          {e.preview && <div className="preview">{e.preview}</div>}
        </div>
      </div>
    );
  });
  const earlier: ReactNode[] = [];
  EVENTS.filter((e) => !e.live).forEach((e, i) => {
    const a = findAct(e.actor);
    if (!a) return;
    const avStyle: CSSProperties & { ['--agent-color']?: string } = {
      ['--agent-color']: a.color,
      background: a.isAgent ? undefined : a.color,
      color: a.isAgent ? undefined : '#fff',
    };
    earlier.push(
      <div key={'e' + i} className="evt">
        <span className="av" data-agent={a.isAgent ? '1' : '0'} style={avStyle}>
          {a.glyph}
        </span>
        <div className="body">
          <div className="line">
            <b>{a.name}</b> {e.verb} {e.target && <code>{e.target}</code>}
          </div>
          <div className="when">{e.when}</div>
        </div>
      </div>
    );
  });
  return (
    <>
      <div className="rail-h">Live</div>
      {rows}
      <div className="rail-h">Earlier today</div>
      {earlier}
    </>
  );
}

function AgentInspector({ agent }: { agent: Agent | undefined }) {
  if (!agent) return null;
  const style: AgentColorStyle = { ['--agent-color']: agent.color };
  return (
    <>
      <div className="agent-card" style={style}>
        <div className="top">
          <span className="av">{agent.glyph}</span>
          <div>
            <div className="name">{agent.name}</div>
            <div className="role">{agent.role}</div>
          </div>
          <span className="status">
            {agent.state === 'working' && (
              <>
                <span className="dot" /> working
              </>
            )}
            {agent.state === 'idle' && (
              <span style={{ color: 'var(--muted)' }}>idle · {agent.lastSeen}</span>
            )}
          </span>
        </div>
        <div className="grid">
          <div className="cell">
            <div className="l">Provider</div>
            <div className="v">{agent.provider}</div>
          </div>
          <div className="cell">
            <div className="l">Model</div>
            <div className="v">{agent.model}</div>
          </div>
          <div className="cell">
            <div className="l">Tokens / hr</div>
            <div className="v">{agent.tokensPerHr}</div>
          </div>
          <div className="cell">
            <div className="l">Cost / day</div>
            <div className="v">${agent.costDay}</div>
          </div>
        </div>
        {agent.state === 'working' && (
          <div className="now">
            <div className="l">Currently</div>
            <div className="task">{agent.currentTask}</div>
            <div className="bar">
              <i />
            </div>
          </div>
        )}
      </div>
      <div className="rail-h">Skills granted</div>
      <div className="skills-row" style={{ margin: 0 }}>
        {agent.skills.map((s) => (
          <span key={s} className="skill">
            <span className="name">/{s}</span>
          </span>
        ))}
      </div>
      <div className="rail-h" style={{ marginTop: 18 }}>
        Memory access
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
        Read · <span style={{ color: 'var(--ink-soft)' }}>{agent.memory.read}</span>
        <br />
        Write · <span style={{ color: 'var(--ink-soft)' }}>{agent.memory.write}</span>
      </div>
      <div className="rail-h" style={{ marginTop: 18 }}>
        Handoffs
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
        {agent.handoffs.map((h, i) => (
          <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
            <span style={{ color: 'var(--ink-soft)' }}>{h.to}</span> ·
            <span className="mono" style={{ fontSize: 11, marginLeft: 4 }}>{h.when}</span>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>{h.what}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function MemoryPanel() {
  return (
    <>
      <div className="rail-h">Pinned to project</div>
      {MEMORY.map((m, i) => (
        <div key={i} className="memory" style={{ marginBottom: 10 }}>
          <div className="m-q">{m.text}</div>
          <div className="m-meta">
            <span>{m.source}</span>
            <span>·</span>
            <span>{m.when}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function ContextPanel() {
  return (
    <>
      <div className="rail-h">This session</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <KV l="Turns" v="142" />
        <KV l="Tokens" v="84.2K" />
        <KV l="Compressed" v="3×" />
        <KV l="Retrieved" v="12 docs" />
      </div>
      <div className="rail-h">Compression log</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
        <CLog when="11:48" title="Compressed 28 → 4 turns" note="Research dialogue with Iris" />
        <CLog when="09:12" title="Compressed 16 → 2 turns" note="Pricing back-and-forth" />
        <CLog when="Yest." title="Compressed 41 → 6 turns" note="Onboarding spec drafts" />
      </div>
      <div className="rail-h" style={{ marginTop: 16 }}>
        Retrieval (ZeroEntropy)
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
        <div style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>NPS survey, Mar 2026</span>
          <span className="mono" style={{ marginLeft: 6, fontSize: 11 }}>0.91</span>
        </div>
        <div style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Beta cohort retention</span>
          <span className="mono" style={{ marginLeft: 6, fontSize: 11 }}>0.84</span>
        </div>
        <div style={{ padding: '6px 0' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Pricing brief v3</span>
          <span className="mono" style={{ marginLeft: 6, fontSize: 11 }}>0.77</span>
        </div>
      </div>
    </>
  );
}

function RightRail({
  tab,
  setTab,
  focusedAgentId,
  eventCount,
}: {
  tab: 'activity' | 'agent' | 'memory' | 'context';
  setTab: (t: 'activity' | 'agent' | 'memory' | 'context') => void;
  focusedAgentId: string;
  eventCount: number;
}) {
  const focused =
    AGENTS.find((a) => a.id === focusedAgentId) || DOC_AGENTS[0] || AGENTS[0];
  return (
    <div className="rail">
      <div className="rail-tabs">
        <button
          className={'rail-tab ' + (tab === 'activity' ? 'active' : '')}
          onClick={() => setTab('activity')}
        >
          Activity <span className="count">{eventCount}</span>
        </button>
        <button
          className={'rail-tab ' + (tab === 'agent' ? 'active' : '')}
          onClick={() => setTab('agent')}
        >
          Agent
        </button>
        <button
          className={'rail-tab ' + (tab === 'memory' ? 'active' : '')}
          onClick={() => setTab('memory')}
        >
          Memory
        </button>
        <button
          className={'rail-tab ' + (tab === 'context' ? 'active' : '')}
          onClick={() => setTab('context')}
        >
          Context
        </button>
      </div>
      <div className="rail-body">
        {tab === 'activity' && <ActivityList />}
        {tab === 'agent' && <AgentInspector agent={focused} />}
        {tab === 'memory' && <MemoryPanel />}
        {tab === 'context' && <ContextPanel />}
      </div>
    </div>
  );
}

function Compose({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [val, setVal] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="compose" onClick={() => ref.current?.focus()}>
      <Icons.Plus size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
      <span className="at" title="Assign to">
        <Icons.At size={11} /> Atlas
      </span>
      <input
        ref={ref}
        value={val}
        placeholder="Ask, plan, or invoke a skill — press / for skills, @ to mention"
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === '/' && val === '') {
            e.preventDefault();
            onOpenPalette();
          }
        }}
      />
      <span className="kbdh">
        <span className="k">/</span>
      </span>
      <button className="send" aria-label="Send">
        <Icons.Send size={13} />
      </button>
    </div>
  );
}

function SkillPalette({
  open,
  onClose,
  onInvoke,
}: {
  open: boolean;
  onClose: () => void;
  onInvoke: (s: Skill) => void;
}) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ('');
      setSel(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!q) return SKILLS;
    const lq = q.toLowerCase();
    return SKILLS.filter(
      (s) => s.name.toLowerCase().includes(lq) || s.desc.toLowerCase().includes(lq),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<string, Skill[]> = { Plan: [], Research: [], Build: [], Review: [], Memory: [] };
    filtered.forEach((s) => {
      (g[s.group] || (g[s.group] = [])).push(s);
    });
    return g;
  }, [filtered]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Enter' && filtered[sel]) {
        onInvoke(filtered[sel]);
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSel((s) => Math.min(filtered.length - 1, s + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => Math.max(0, s - 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, sel, filtered, onClose, onInvoke]);

  return (
    <>
      <div className={'palette-bg ' + (open ? 'show' : '')} onClick={onClose} />
      <div className={'palette ' + (open ? 'show' : '')}>
        <div className="pal-input">
          <span className="slash">/</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setSel(0);
            }}
            placeholder="Invoke a skill or search…"
          />
          <span className="kbd mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
            esc
          </span>
        </div>
        <div className="pal-list">
          {Object.entries(grouped).map(
            ([group, items]) =>
              items.length > 0 && (
                <div key={group}>
                  <div className="pal-h">{group}</div>
                  {items.map((s) => {
                    const idx = filtered.indexOf(s);
                    return (
                      <div
                        key={s.name}
                        className={'pal-item ' + (idx === sel ? 'sel' : '')}
                        onClick={() => {
                          onInvoke(s);
                          onClose();
                        }}
                        onMouseEnter={() => setSel(idx)}
                      >
                        <span className="pal-name">/{s.name}</span>
                        <span className="pal-desc">{s.desc}</span>
                        <span className="pal-by">{s.by}</span>
                      </div>
                    );
                  })}
                </div>
              ),
          )}
          {filtered.length === 0 && (
            <div style={{ padding: '20px 14px', fontSize: 13, color: 'var(--muted)' }}>
              No skills match. <span style={{ color: 'var(--ink)' }}>Create one →</span>
            </div>
          )}
        </div>
        <div className="pal-foot">
          <span>
            <span className="k">↑↓</span> navigate
          </span>
          <span>
            <span className="k">↵</span> invoke
          </span>
          <span>
            <span className="k">⌘N</span> new skill
          </span>
          <span style={{ marginLeft: 'auto' }} className="mono">
            126 skills · 5 providers
          </span>
        </div>
      </div>
    </>
  );
}

function MobilePop({ open }: { open: boolean }) {
  return (
    <div className={'mobile-pop ' + (open ? 'show' : '')}>
      <div className="m-inner">
        <div className="m-title">Atlas — Q3 Launch</div>
        <div className="m-meta">
          <span className="m-pill">12 todos</span>
          <span className="m-pill">3 agents</span>
        </div>
        <div className="m-row" data-done="1">
          <span className="c" />
          <span className="t">Lock pricing tiers</span>
        </div>
        <div className="m-row" data-done="1">
          <span className="c" />
          <span className="t">Draft launch narrative</span>
        </div>
        <div className="m-row">
          <span className="c" />
          <span className="t">Land onboarding flow</span>
        </div>
        <div className="m-row">
          <span className="c" />
          <span className="t">Benchmark vs. 3 incumbents</span>
        </div>
        <div className="m-row">
          <span className="c" />
          <span className="t">Ship beta to 200 teams</span>
        </div>
        <div className="m-row">
          <span className="c" />
          <span className="t">Configure prod deploy</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkstationApp() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobilePop, setMobilePop] = useState(false);
  const [railTab, setRailTab] = useState<'activity' | 'agent' | 'memory' | 'context'>('agent');
  const [focusedAgent, setFocusedAgent] = useState(() => DOC_AGENTS[0]?.id || AGENTS[0]?.id || 'iris');
  const [activeDocId, setActiveDocId] = useState('plan');
  const [ctx, setCtx] = useState({ used: 84, turns: 142, tokens: '84.2K' });
  const [compressing, setCompressing] = useState(false);
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  const workingAgentCount = countWorkingAgents(DOC_AGENTS);

  const toggleTodo = (id: number) =>
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const onCompress = () => {
    if (compressing) return;
    setCompressing(true);
    setTimeout(() => {
      setCtx({ used: 38, turns: 16, tokens: '38.0K' });
      setTimeout(() => setCompressing(false), 200);
    }, 500);
  };

  const onInvokeSkill = () => {
    setCtx((c) => ({ ...c, used: Math.min(99, c.used + 1.6) }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPaletteOpen((p) => !p);
      }
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  type Cursor = { id: string; name: string; sub: string; color: string; x: number; y: number };
  const [cursors, setCursors] = useState<Cursor[]>([]);
  useEffect(() => {
    let step = 0;
    const tick = () => {
      const idx = step % 4;
      setCursors([
        { id: 'iris',  name: 'Iris',  sub: 'researching', color: 'var(--a-iris)',  ...CURSOR_POSITIONS.iris[idx] },
        { id: 'forge', name: 'Forge', sub: 'editing PR',  color: 'var(--a-forge)', ...CURSOR_POSITIONS.forge[idx] },
        { id: 'yuna',  name: 'Yuna',  sub: '',            color: '#a55a3f',        ...CURSOR_POSITIONS.yuna[idx] },
      ]);
      step++;
    };
    tick();
    const iv = setInterval(tick, 2200);
    return () => clearInterval(iv);
  }, []);

  const irisAgent = AGENTS.find((a) => a.id === 'iris');

  const onOpenAgent = (id: string) => {
    setFocusedAgent(id);
    setRailTab('agent');
  };

  return (
    <div className="app" data-density="regular" data-rail="1">
      <TopBar
        project={{ workspace: 'Acme Robotics', name: 'Atlas', doc: 'Q3 Launch plan' }}
        peopleHere={PEOPLE.filter((p) => p.online)}
        agentsHere={DOC_AGENTS}
        registeredAgentCount={REGISTERED_AGENT_COUNT}
        onOpenAgent={onOpenAgent}
      />
      <Sidebar
        activeId={activeDocId}
        agentsHere={DOC_AGENTS}
        registeredAgentCount={REGISTERED_AGENT_COUNT}
        onPick={setActiveDocId}
        onOpenAgent={onOpenAgent}
      />

      <div className="doc">
        <div className="doc-body">
          <ContextStrip ctx={ctx} onCompress={onCompress} />
          <div className={'compressed ' + (compressing ? 'go' : '')} />

          <div className="doc-meta">
            <span className="pill">
              <span className="dot" /> Live · {workingAgentCount} {workingAgentCount === 1 ? 'agent' : 'agents'} working
            </span>
            <span>Updated 14s ago</span>
            <span>·</span>
            <span>
              Created by <strong style={{ color: 'var(--ink-soft)' }}>Sam Aoki</strong> · May 03
            </span>
          </div>

          <h1 className="doc-title">Atlas — Q3 Launch</h1>
          <p className="doc-sub">
            The shared layer for AI-native work. Beta to 200 teams, public launch Jul 14. Living plan —
            humans set direction, agents execute and report back here.
          </p>

          <StatusStrip />

          <h2>
            <span className="num">01</span> Mission
          </h2>
          <p>
            Most teams still treat AI as a tool you visit, not a layer you work inside.{' '}
            <span
              className="mention agent"
              style={{ ['--agent-color']: 'var(--a-iris)' } as AgentColorStyle}
            >
              @Iris
            </span>{' '}
            confirmed it on twelve workspaces this morning: agents are silos, plans live in chat, decisions
            evaporate. We&apos;re building one persistent document where agents and humans share state —
            plans, memory, decisions, code — across laptop, mobile, and any time-zone.
          </p>
          <p>
            Beta opens June 6th to <span className="mention">200 design partner teams</span>. Public launch{' '}
            <span className="mention">July 14th</span>. Owner: <span className="mention">@Sam</span>. Eng:{' '}
            <span className="mention">@Diego</span>. Design: <span className="mention">@Yuna</span>.
          </p>

          <h2>
            <span className="num">02</span> Plan
          </h2>
          <TodoList items={todos} onToggle={toggleTodo} />

          <h2>
            <span className="num">03</span> Iris is working on item 06
          </h2>
          <p>
            <span
              className="mention agent"
              style={{ ['--agent-color']: 'var(--a-iris)' } as AgentColorStyle}
            >
              @Iris
            </span>{' '}
            picked this up at 11:54 when Sam pinned the spec. She&apos;ll hand off to{' '}
            <span
              className="mention agent"
              style={{ ['--agent-color']: 'var(--a-atlas)' } as AgentColorStyle}
            >
              @Atlas
            </span>{' '}
            for replanning when done.
          </p>

          {irisAgent && (
            <AgentBlock
              agent={irisAgent}
              steps={AGENT_STEPS}
              quote={{
                text:
                  'Drop-off occurs at step 3 in 7 of 12 reviewed apps — the consent screen. Pattern: users hesitate when asked to grant agent memory access without seeing what the agent will read.',
                src: 'Iris · synthesizing across 12 sources',
              }}
            />
          )}

          <h2>
            <span className="num">04</span> Decision log
          </h2>
          <p>
            Every decision goes here, with the why.{' '}
            <span
              className="mention agent"
              style={{ ['--agent-color']: 'var(--a-loop)' } as AgentColorStyle}
            >
              @Loop
            </span>{' '}
            audits this list daily — anything flagged as &quot;drift&quot; gets pulled back into the plan.
          </p>
          <DecisionLog items={DECISIONS} />

          <h2>
            <span className="num">05</span> Memory pinned to this project
          </h2>
          <p>
            Agents read this before doing anything. To pin something new, hit{' '}
            <span
              className="mono"
              style={{ background: 'var(--bg-sunken)', padding: '1px 5px', borderRadius: 3, fontSize: 12 }}
            >
              /remember
            </span>{' '}
            or drag a paragraph into the rail.
          </p>
          {MEMORY.map((m, i) => (
            <MemoryBlock key={i} {...m} />
          ))}

          <h2>
            <span className="num">06</span> Skills available here
          </h2>
          <p>
            Anyone — human or agent — can invoke a skill inline. Skills are typed and ship from providers;
            some are scoped to this project, others come from the workspace.
          </p>
          <SkillsRow skills={SKILL_ROW_ITEMS} onInvoke={onInvokeSkill} />

          <ContinueBanner onHover={() => setMobilePop(true)} onLeave={() => setMobilePop(false)} />

          <hr className="rule" />
          <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 0 }}>
            Last sync 14s ago · 4 humans, {REGISTERED_AGENT_COUNT} agents in this workspace · indexed by ZeroEntropy · running on
            Lightsprint
          </p>
        </div>

        <div className="agent-cursors">
          {cursors.map((c) => {
            const style: AgentColorStyle = {
              left: c.x * 100 + '%',
              top: c.y * 100 + '%',
              ['--agent-color']: c.color,
            };
            return (
              <div key={c.id} className="a-cursor show" style={style}>
                <div className="caret" />
                <div className="lbl">
                  {c.name}
                  {c.sub && <span className="sub">{c.sub}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RightRail
        tab={railTab}
        setTab={setRailTab}
        focusedAgentId={focusedAgent}
        eventCount={EVENTS.length}
      />

      <Compose onOpenPalette={() => setPaletteOpen(true)} />
      <SkillPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onInvoke={onInvokeSkill}
      />
      <MobilePop open={mobilePop} />
    </div>
  );
}
