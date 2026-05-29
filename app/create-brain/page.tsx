'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type CSSProperties } from 'react';
import './brain.css';

type AgentColorStyle = CSSProperties & { ['--agent-color']?: string };

type AgentDef = {
  id: AgentId;
  glyph: string;
  name: string;
  role: string;
  by: string;
  color: string;
  does: string;
  skills: string[];
};

type AgentId = 'iris' | 'forge' | 'atlas' | 'loop' | 'beam';

const AGENT_DEFS: AgentDef[] = [
  { id: 'iris',  glyph: 'IR', name: 'Iris',  role: 'research-agent', by: 'ZeroEntropy', color: 'var(--a-iris)',
    does: 'Reads, gathers, cites. Surfaces contradictions.',
    skills: ['research', 'cite', 'summarize'] },
  { id: 'atlas', glyph: 'AT', name: 'Atlas', role: 'planning-agent', by: 'GBrain', color: 'var(--a-atlas)',
    does: 'Plans, decomposes, schedules. Owns the todo list.',
    skills: ['plan', 'decompose', 'estimate'] },
  { id: 'forge', glyph: 'FG', name: 'Forge', role: 'build-agent',    by: 'GStack', color: 'var(--a-forge)',
    does: 'Scaffolds, refactors, opens PRs. Tests first.',
    skills: ['scaffold', 'refactor', 'test'] },
  { id: 'loop',  glyph: 'LP', name: 'Loop',  role: 'review-agent',   by: 'The Hog', color: 'var(--a-loop)',
    does: 'Critiques drafts, fact-checks, red-teams.',
    skills: ['review', 'factcheck', 'redteam'] },
  { id: 'beam',  glyph: 'BM', name: 'Beam',  role: 'deploy-agent',   by: 'Lightsprint', color: 'var(--a-beam)',
    does: 'Ships, monitors, rolls back. Writes release notes.',
    skills: ['deploy', 'rollback', 'monitor'] },
];

type Person = { id: string; name: string; role: string };
type Memory = { id: string; kind: string; text: string };

const INDUSTRIES = [
  'Robotics / Hardware', 'AI Infrastructure', 'Developer Tools', 'Consumer Software',
  'Fintech', 'Healthcare', 'Climate', 'Other',
];
const STAGES = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Public', 'Bootstrapped'];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
};

let nextId = 100;
const uid = () => String(++nextId);

const SeedPeople: Person[] = [
  { id: uid(), name: '', role: '' },
  { id: uid(), name: '', role: '' },
  { id: uid(), name: '', role: '' },
];
const SeedMemories: Memory[] = [
  { id: uid(), kind: 'VOICE', text: '' },
  { id: uid(), kind: 'RULE', text: '' },
  { id: uid(), kind: 'FACT', text: '' },
];

export default function CreateBrainPage() {
  const router = useRouter();

  const [name, setName]         = useState('');
  const [tagline, setTagline]   = useState('');
  const [mission, setMission]   = useState('');
  const [industry, setIndustry] = useState('');
  const [stage, setStage]       = useState('');
  const [founded, setFounded]   = useState('');
  const [hq, setHq]             = useState('');
  const [people, setPeople]     = useState<Person[]>(SeedPeople);
  const [memories, setMemories] = useState<Memory[]>(SeedMemories);
  const [selected, setSelected] = useState<Set<AgentId>>(new Set(['iris', 'atlas']));

  // ── Derived state ─────────────────────────────────────────────────────────
  const filledPeople = people.filter((p) => p.name.trim() || p.role.trim());
  const filledMemories = memories.filter((m) => m.text.trim());
  const selectedAgents = AGENT_DEFS.filter((a) => selected.has(a.id));

  const fieldsFilled = useMemo(() => {
    const f = [
      name.trim(), tagline.trim(), mission.trim(),
      industry, stage, founded.trim(), hq.trim(),
      filledPeople.length >= 1 ? '1' : '',
    ];
    return f.filter(Boolean).length;
  }, [name, tagline, mission, industry, stage, founded, hq, filledPeople.length]);
  const fieldsTotal = 8;
  const progressPct = Math.round((fieldsFilled / fieldsTotal) * 100);
  const ready = name.trim().length > 0;

  // Mission paragraph rewritten in clear agent-readable prose
  const missionParagraph = useMemo(() => {
    if (!mission && !founded && !hq && !industry && !stage) return null;
    const head = mission
      ? { name: name || 'The company', body: mission.replace(/^we['']re\s+/i, 'is ') }
      : null;
    const bits: string[] = [];
    if (industry) bits.push(industry);
    if (stage) bits.push(stage);
    if (founded) bits.push('founded ' + founded);
    if (hq) bits.push('based in ' + hq);
    return { head, tail: bits.join(' · ') };
  }, [name, mission, founded, hq, industry, stage]);

  const skillsLine = useMemo(() => {
    const s = new Set<string>();
    selectedAgents.forEach((a) => a.skills.forEach((sk) => s.add(sk)));
    return s.size ? '/' + Array.from(s).join(' · /') : null;
  }, [selectedAgents]);

  // Word count of the rendered doc
  const wordCount = useMemo(() => {
    const parts: string[] = [];
    parts.push(name || 'Your company name');
    parts.push(tagline || 'A short tagline lives here…');
    if (missionParagraph) {
      if (missionParagraph.head) parts.push(missionParagraph.head.name, missionParagraph.head.body);
      parts.push(missionParagraph.tail);
    } else {
      parts.push("Tell us what your company is, when it was founded, where it's based, and what it does. The brain rewrites this in clear, agent-readable prose.");
    }
    filledPeople.forEach((p) => { parts.push(p.name || '(unnamed)'); parts.push(p.role || '—'); });
    selectedAgents.forEach((a) => parts.push(a.name, a.role, a.by));
    filledMemories.forEach((m) => parts.push(m.kind, m.text));
    if (skillsLine) parts.push(skillsLine);
    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    return text ? text.split(/\s+/).length : 0;
  }, [name, tagline, missionParagraph, filledPeople, selectedAgents, filledMemories, skillsLine]);

  // ── Mutators ──────────────────────────────────────────────────────────────
  const updatePerson = (id: string, key: 'name' | 'role', value: string) =>
    setPeople((ps) => ps.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  const addPerson = () => setPeople((ps) => [...ps, { id: uid(), name: '', role: '' }]);
  const removePerson = (id: string) => setPeople((ps) => ps.filter((p) => p.id !== id));

  const updateMemory = (id: string, text: string) =>
    setMemories((ms) => ms.map((m) => (m.id === id ? { ...m, text } : m)));
  const removeMemory = (id: string) => setMemories((ms) => ms.filter((m) => m.id !== id));
  const addMemorySuggestion = (kind: string, text: string) =>
    setMemories((ms) => [...ms, { id: uid(), kind, text }]);

  const toggleAgent = (id: AgentId) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const doCreate = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const agentRoster = Array.from(selected).map((id) => (id === 'atlas' ? 'atlas-agent' : id));
      const res = await fetch('/api/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tagline,
          mission,
          industry,
          stage,
          founded,
          hq,
          people: people.filter((p) => p.name.trim() || p.role.trim()),
          memories: memories.filter((m) => m.text.trim()),
          agentRoster,
        }),
      });
      const data = (await res.json()) as { org?: { slug: string }; error?: string };
      if (!res.ok || !data.org) {
        setSubmitError(data.error || 'Failed to create organization');
        setSubmitting(false);
        return;
      }
      router.push(`/${data.org.slug}/install?from=brain`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error');
      setSubmitting(false);
    }
  };
  const skip = () => router.push('/workstation');

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="brain-root">
      <div className="topbar">
        <Link className="brand" href="/">
          <span className="logo" />
          <span className="name">Throughline<span className="sm">Cloud</span></span>
        </Link>
        <div className="crumb-area">
          <span>Set up</span>
          <span className="sep">›</span>
          <span className="cur">Company brain</span>
        </div>
        <div className="topbar-right">
          <div className="progress">
            <span>{fieldsFilled} of {fieldsTotal} fields</span>
            <div className="bar"><i style={{ width: progressPct + '%' }} /></div>
          </div>
          <button className="btn" onClick={skip} type="button">Skip for now</button>
          <button className="btn primary" disabled={!ready || submitting} onClick={doCreate} type="button">
            {submitting ? 'Creating…' : 'Create brain'} <span className="arr">→</span>
          </button>
        </div>
      </div>

      <div className="split">
        <div className="form-pane">
          <div className="intro">
            <div className="eyebrow">SETUP · 90 SECONDS</div>
            <h1>
              Your company,<br />
              <span className="muted">turned into a brain.</span>
            </h1>
            <p>
              The company brain is one document every agent reads before doing anything. It&apos;s
              the source of truth for who you are, what you&apos;re building, who&apos;s on the
              team, and the rules you don&apos;t want to repeat. Edit it once — every agent
              updates instantly.
            </p>
          </div>

          {/* 01 · Company */}
          <section className="sec">
            <div className="sec-hd">
              <span className="num">01</span>
              <h3>About the company</h3>
            </div>
            <p className="sec-sub">
              The doc starts here. Anything you tell us, agents will recite back without being asked.
            </p>

            <div className="field">
              <label>Company name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Robotics" />
            </div>
            <div className="field">
              <label>
                One-line tagline <span className="hint">what an agent should say in 7 words</span>
              </label>
              <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Industrial robotics for warehouses." />
            </div>
            <div className="field">
              <label>
                Mission <span className="hint">why you exist</span>
              </label>
              <textarea
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                placeholder="We're making warehouses safer and 10× more efficient by giving every shelf, conveyor, and forklift a brain that talks to the others."
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Industry</label>
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option value="">Select…</option>
                  {INDUSTRIES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Stage</label>
                <select value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="">Select…</option>
                  {STAGES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label>Founded</label>
                <input value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="2023" />
              </div>
              <div className="field">
                <label>Headquarters</label>
                <input value={hq} onChange={(e) => setHq(e.target.value)} placeholder="Brooklyn, NY" />
              </div>
            </div>
          </section>

          {/* 02 · Team */}
          <section className="sec">
            <div className="sec-hd">
              <span className="num">02</span>
              <h3>Who&apos;s on the team</h3>
              <span className="opt">OPTIONAL</span>
            </div>
            <p className="sec-sub">
              You can add the whole org later. Three people is enough for agents to know who to @-mention.
            </p>

            <div className="people-rows">
              {people.map((p, i) => (
                <div key={p.id} className="people-row">
                  <input
                    placeholder={i === 0 ? 'Sam Aoki' : i === 1 ? 'Yuna Park' : i === 2 ? 'Diego Marín' : 'Name'}
                    value={p.name}
                    onChange={(e) => updatePerson(p.id, 'name', e.target.value)}
                  />
                  <input
                    placeholder={i === 0 ? 'Founder / CEO' : i === 1 ? 'Head of Design' : i === 2 ? 'Eng Lead' : 'Role'}
                    value={p.role}
                    onChange={(e) => updatePerson(p.id, 'role', e.target.value)}
                  />
                  <span className="rm" onClick={() => removePerson(p.id)} title="Remove">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>
            <button className="add-row" onClick={addPerson} type="button">+ Add teammate</button>
          </section>

          {/* 03 · Agents */}
          <section className="sec">
            <div className="sec-hd">
              <span className="num">03</span>
              <h3>Which agents to put on payroll</h3>
            </div>
            <p className="sec-sub">
              You can change this any time. Each agent has its own budget, provider, and memory scope.
              We recommend starting with Iris and Atlas, then adding the rest as you go.
            </p>

            <div className="agent-grid">
              {AGENT_DEFS.map((a) => (
                <div
                  key={a.id}
                  className="agent-card"
                  data-on={selected.has(a.id) ? '1' : '0'}
                  style={{ ['--agent-color']: a.color } as AgentColorStyle}
                  onClick={() => toggleAgent(a.id)}
                >
                  <span className="av">{a.glyph}</span>
                  <div className="body">
                    <div className="name">{a.name}</div>
                    <div className="role">{a.role} · {a.by}</div>
                    <div className="does">{a.does}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 04 · Memories */}
          <section className="sec">
            <div className="sec-hd">
              <span className="num">04</span>
              <h3>The rules you don&apos;t want to repeat</h3>
            </div>
            <p className="sec-sub">
              Pin a decision, a brand rule, a constraint. Every agent reads these before doing
              anything — and obeys them. You can keep adding pins forever.
            </p>

            <div className="memory-list">
              {memories.map((m, i) => (
                <div key={m.id} className="memory-row">
                  <span className="tag">{m.kind}</span>
                  <textarea
                    value={m.text}
                    onChange={(e) => updateMemory(m.id, e.target.value)}
                    placeholder={
                      i === 0 ? 'Never say "AI assistant". Always say "agent" or call it by name.'
                      : i === 1 ? "Don't ship customer-facing copy without Yuna's review."
                      : i === 2 ? 'Series A led by Sequoia · $14M · April 2026.'
                      : 'Add a fact, rule, or decision…'
                    }
                  />
                  <span className="rm" onClick={() => removeMemory(m.id)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </span>
                </div>
              ))}
            </div>

            <div className="suggested">
              <span className="suggested-label">Suggested pins</span>
              <button className="suggest-chip" type="button" onClick={() => addMemorySuggestion('VOICE', 'Always say agent — never AI or assistant.')}>
                <span className="k">+</span>Brand voice rule
              </button>
              <button className="suggest-chip" type="button" onClick={() => addMemorySuggestion('RULE', "Never bypass Loop's review on customer-facing changes.")}>
                <span className="k">+</span>Review policy
              </button>
              <button className="suggest-chip" type="button" onClick={() => addMemorySuggestion('FACT', 'Our pricing: Solo (free), Team ($48 / agent / mo), Workspace (custom).')}>
                <span className="k">+</span>Pricing structure
              </button>
              <button className="suggest-chip" type="button" onClick={() => addMemorySuggestion('GOAL', 'Q3 launch: beta Jun 6, public Jul 14.')}>
                <span className="k">+</span>Launch dates
              </button>
            </div>
          </section>

          <div className="create-bar">
            <div className="txt">
              <b>Ready when you are.</b> The brain stays editable — you can keep adding facts,
              rules, and people any time. Agents pick up changes instantly.
            </div>
            <button className="big-btn" disabled={!ready || submitting} onClick={doCreate} type="button">
              {submitting ? 'Creating…' : 'Create brain'} <span className="arr">→</span>
            </button>
          </div>
          {submitError && (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'oklch(0.95 0.05 25)',
              color: 'oklch(0.4 0.15 25)',
              borderRadius: 8,
              fontSize: 13,
            }}>{submitError}</div>
          )}
        </div>

        {/* Right: live preview */}
        <div className="preview-pane">
          <div className="preview-hd">
            <span className="dot" />
            <span>LIVE PREVIEW · WRITING ITSELF</span>
            <span className="grow" />
            <span className="counter mono">{wordCount} word{wordCount === 1 ? '' : 's'}</span>
          </div>

          <div className="brain-doc">
            <div className="brain-tab">
              <span className="d" /><span className="d" /><span className="d" />
              <span className="live-pill"><span className="live" />Company Brain</span>
              <span className="url">neverzero.cloud/{slugify(name) || '—'}</span>
            </div>

            <div className="brain-body">
              <div className="doc-meta">
                Draft · {filledPeople.length} human{filledPeople.length === 1 ? '' : 's'} ·{' '}
                {selectedAgents.length} agent{selectedAgents.length === 1 ? '' : 's'} · just now
              </div>

              <h1 className={'b-title ' + (name ? '' : 'empty')}>
                {name || 'Your company name'}
                <span className="cursor" />
              </h1>
              <p className={'b-tagline ' + (tagline ? '' : 'empty')}>
                {tagline || 'A short tagline lives here…'}
              </p>

              <div className="b-section">
                <div className="h">MISSION</div>
                <p className="b-paragraph">
                  {missionParagraph ? (
                    <>
                      {missionParagraph.head && (
                        <>
                          <b>{missionParagraph.head.name}</b> {missionParagraph.head.body}
                        </>
                      )}
                      {missionParagraph.head && missionParagraph.tail ? ' · ' : ''}
                      {!missionParagraph.head && missionParagraph.tail && name ? (
                        <>
                          <b>{name}</b> —{' '}
                        </>
                      ) : null}
                      {missionParagraph.tail && (missionParagraph.tail + '.')}
                    </>
                  ) : (
                    <span className="ph">
                      Tell us what your company is, when it was founded, where it&apos;s based,
                      and what it does. The brain rewrites this in clear, agent-readable prose.
                    </span>
                  )}
                </p>
              </div>

              <div className="b-section">
                <div className="h">
                  TEAM <span className="count">{filledPeople.length ? '· ' + filledPeople.length : ''}</span>
                </div>
                {filledPeople.length === 0 ? (
                  <div className="empty-state">No teammates yet. They&apos;ll show up here.</div>
                ) : (
                  <div className="b-people fade-in">
                    {filledPeople.map((p) => (
                      <div key={p.id} className="b-person">
                        <span className="av">{initials(p.name) || '?'}</span>
                        <span className="nm">{p.name || '(unnamed)'}</span>
                        <span className="rl">{p.role || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="b-section">
                <div className="h">
                  AGENTS ON PAYROLL{' '}
                  <span className="count">{selectedAgents.length ? '· ' + selectedAgents.length : ''}</span>
                </div>
                {selectedAgents.length === 0 ? (
                  <div className="empty-state">Pick agents on the left to add them here.</div>
                ) : (
                  <div className="b-agents fade-in">
                    {selectedAgents.map((a) => (
                      <div key={a.id} className="b-agent" style={{ ['--agent-color']: a.color } as AgentColorStyle}>
                        <span className="av">{a.glyph}</span>
                        <div>
                          <div className="nm">{a.name}</div>
                          <div className="role">{a.role}</div>
                        </div>
                        <span className="by">{a.by}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="b-section">
                <div className="h">
                  PINNED MEMORY{' '}
                  <span className="count">{filledMemories.length ? '· ' + filledMemories.length : ''}</span>
                </div>
                {filledMemories.length === 0 ? (
                  <div className="empty-state">Pinned facts and rules appear here.</div>
                ) : (
                  filledMemories.map((m) => (
                    <div key={m.id} className="b-mem fade-in">
                      <span className="tag">{m.kind} · PINNED</span>
                      <div className="q">{m.text}</div>
                      <div className="meta">read by every agent · just now</div>
                    </div>
                  ))
                )}
              </div>

              <div className="b-section">
                <div className="h">SKILLS GRANTED</div>
                <p
                  className="b-paragraph"
                  style={{
                    fontSize: 13,
                    fontFamily: skillsLine ? 'Geist Mono, monospace' : undefined,
                    color: skillsLine ? 'var(--ink-soft)' : undefined,
                  }}
                >
                  {skillsLine ?? (
                    <span className="ph">
                      Skills will reflect the agents you select. Each agent ships with their own
                      scoped toolkit.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        className="preview-toggle"
        type="button"
        onClick={() => document.querySelector('.preview-pane')?.scrollIntoView({ behavior: 'smooth' })}
      >
        Preview brain ↓
      </button>
    </div>
  );
}
