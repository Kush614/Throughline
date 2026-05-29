'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// Skills whose output becomes durable XTrace memory (mirrors memoryKindForSkill
// in lib/skill-runner.ts). When one completes, we nudge: "ask about it".
const CAPTURE_COMMANDS = new Set([
  '/remember', '/pin', '/research', '/recall', '/factcheck', '/review',
  '/compete', '/redteam', '/verify', '/plan', '/estimate', '/schedule',
  '/decompose', '/handoff', '/resume', '/build',
]);

interface Source {
  id: string;
  text: string;
  kind: string;
  superseded: boolean;
  subfileHref?: string;
  subfileTitle?: string;
  score: number | null;
}
interface AskResult { answer: string | null; sources: Source[]; usedContextPrompt: boolean }

export default function LiveAskDock({ slug }: { slug: string }) {
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [capture, setCapture] = useState<{ command: string; task: string } | null>(null);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Listen for knowledge skills completing — that's a memory landing in XTrace.
  useEffect(() => {
    const es = new EventSource(`/api/events?org=${encodeURIComponent(slug)}`);
    es.onmessage = (e) => {
      try {
        const ev = JSON.parse(e.data) as { type?: string; payload?: { command?: string; task?: string } };
        if (ev.type === 'skill.complete' && ev.payload?.command && CAPTURE_COMMANDS.has(ev.payload.command)) {
          setCapture({ command: ev.payload.command, task: ev.payload.task ?? '' });
          setOpen(true);
          setFlash(true);
          if (flashTimer.current) clearTimeout(flashTimer.current);
          flashTimer.current = setTimeout(() => setFlash(false), 2600);
        }
      } catch { /* ignore non-JSON keep-alives */ }
    };
    return () => { es.close(); if (flashTimer.current) clearTimeout(flashTimer.current); };
  }, [slug]);

  async function ask(query: string) {
    const text = query.trim();
    if (!text || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/orgs/${slug}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();
      setResult(res.ok ? (data as AskResult) : { answer: data.error ?? 'Error', sources: [], usedContextPrompt: false });
    } catch {
      setResult({ answer: 'Could not reach workspace memory.', sources: [], usedContextPrompt: false });
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button className={`lad-fab gum${flash ? ' flash' : ''}`} onClick={() => setOpen(true)}>
        <span className="lad-dot" /> Ask the workspace
      </button>
    );
  }

  return (
    <div className="lad-dock gum">
      <div className="lad-head">
        <span className="lad-title"><span className="lad-dot" /> Ask the workspace</span>
        <span className="lad-live">live · XTrace</span>
        <button className="lad-close" onClick={() => setOpen(false)} aria-label="Collapse">–</button>
      </div>

      {capture && (
        <div className={`lad-capture${flash ? ' flash' : ''}`}>
          <div className="lad-capture-top">
            <span className="lad-cmd">{capture.command}</span> captured to memory
          </div>
          {capture.task && <div className="lad-capture-task">“{capture.task.slice(0, 110)}”</div>}
          <div className="lad-capture-hint">Give extraction a few seconds, then ask about it below.</div>
        </div>
      )}

      <form className="lad-row" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input
          className="lad-input"
          placeholder="Ask anything the team has worked on…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="lad-ask" type="submit" disabled={loading || !q.trim()}>
          {loading ? '…' : 'Ask'}
        </button>
      </form>

      {result && (
        <div className="lad-result">
          {result.answer && (
            <p className="lad-answer">
              {result.answer.length > 360 ? result.answer.slice(0, 360) + '…' : result.answer}
            </p>
          )}
          {result.sources.slice(0, 2).map((s) => (
            <div key={s.id} className={`lad-src${s.superseded ? ' superseded' : ''}`}>
              <span className="lad-badge">{s.kind}</span>
              <span className="lad-src-text">{s.text.slice(0, 120)}</span>
              {s.subfileHref && <Link className="lad-src-link" href={s.subfileHref}>source →</Link>}
            </div>
          ))}
          {!result.answer && result.sources.length === 0 && (
            <p className="lad-empty">Nothing yet — if you just ran a skill, give it a few seconds and ask again.</p>
          )}
        </div>
      )}

      <Link className="lad-full" href={`/${slug}/ask`}>Open full Ask view →</Link>
    </div>
  );
}
