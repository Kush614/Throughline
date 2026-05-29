'use client';

// Subfile body that mounts inside the BrainWorkstation shell's center pane.
// Hydrates with the server-rendered subfile, then polls every 700ms while
// the skill is still running. Renders a tight markdown subset (headings,
// tables, checklists, code, blockquotes, links) using the same DOM the
// brain doc uses so the workstation CSS just covers it.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';

type SkillStatus = 'pending' | 'running' | 'done' | 'error';

interface MentionedAgent { id: string; name: string; }

export interface SubfileInitial {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: string;
  parentId: string | null;
  skillRun?: {
    command: string;
    skillId: string;
    kind: string;
    task: string;
    status: SkillStatus;
    mentionedAgents: MentionedAgent[];
    requestedBy: string;
    startedAt: string;
    completedAt: string | null;
  };
}

interface ChildLink { id: string; title: string; command: string | null; createdAt: string; }

export interface SubfileCenterProps {
  orgSlug: string;
  subfile: SubfileInitial;
  parentTitle: string;
  childLinks: ChildLink[];
}

// ─────────── Tiny markdown renderer (same as SubfileLive but inlined here) ───────────

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let key = 0;
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
  for (const tok of tokens) {
    if (!tok) continue;
    if (tok.startsWith('`') && tok.endsWith('`')) {
      out.push(<code key={key++}>{tok.slice(1, -1)}</code>);
    } else if (tok.startsWith('**') && tok.endsWith('**')) {
      out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (/^\[.+\]\(.+\)$/.test(tok)) {
      const m = /^\[(.+)\]\((.+)\)$/.exec(tok)!;
      out.push(<a key={key++} href={m[2]}>{m[1]}</a>);
    } else {
      out.push(<span key={key++}>{tok}</span>);
    }
  }
  return out;
}

function renderMarkdown(md: string): ReactNode {
  const lines = md.split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s+/, '');
      const Tag = (level === 1 ? 'h2' : level === 2 ? 'h3' : 'h4') as keyof React.JSX.IntrinsicElements;
      out.push(<Tag key={key++}>{renderInline(text)}</Tag>);
      i++; continue;
    }
    if (line.trim() === '---') { out.push(<hr key={key++} className="rule" />); i++; continue; }
    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('> ')) {
        buf.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i++;
      }
      out.push(<blockquote key={key++} className="md-quote">{buf.map((b, j) => <div key={j}>{renderInline(b)}</div>)}</blockquote>);
      continue;
    }
    if (line.startsWith('```')) {
      const lang = line.replace(/^```/, '').trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').startsWith('```')) {
        buf.push(lines[i] ?? '');
        i++;
      }
      i++;
      out.push(<pre key={key++} className="md-pre" data-lang={lang || undefined}>{buf.join('\n')}</pre>);
      continue;
    }
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s\-|:]+\|$/.test(lines[i + 1] ?? '')) {
      const header = line.split('|').slice(1, -1).map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
        rows.push((lines[i] ?? '').split('|').slice(1, -1).map((s) => s.trim()));
        i++;
      }
      out.push(
        <table key={key++} className="md-table">
          <thead><tr>{header.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{renderInline(c)}</td>)}</tr>)}
          </tbody>
        </table>,
      );
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^- \[/.test(line)) {
      const items: { text: string; checked?: boolean }[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        let txt = (lines[i] ?? '').replace(/^[-*]\s+/, '');
        let checked: boolean | undefined;
        const cb = /^\[( |x|X)\]\s+/.exec(txt);
        if (cb) { checked = cb[1]?.toLowerCase() === 'x'; txt = txt.slice(cb[0].length); }
        items.push({ text: txt, checked });
        i++;
      }
      out.push(
        <ul key={key++} className="md-list">
          {items.map((it, j) => (
            <li key={j}>
              {typeof it.checked === 'boolean' && <span className={'md-cb ' + (it.checked ? 'on' : 'off')}>{it.checked ? '✓' : ''}</span>}
              {renderInline(it.text)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    const buf: string[] = [line];
    i++;
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !/^(#{1,3}\s|> |```|\| |[-*]\s)/.test(lines[i] ?? '')) {
      buf.push(lines[i] ?? '');
      i++;
    }
    out.push(<p key={key++}>{renderInline(buf.join(' '))}</p>);
  }
  return <>{out}</>;
}

function relativeTs(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

export default function SubfileCenter({ orgSlug, subfile, parentTitle, childLinks }: SubfileCenterProps) {
  const [state, setState] = useState<SubfileInitial>(subfile);
  const status: SkillStatus = state.skillRun?.status ?? 'done';

  useEffect(() => {
    if (status === 'done' || status === 'error') return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/docs/${subfile.id}`, { cache: 'no-store' });
        const data = (await res.json()) as { doc?: SubfileInitial };
        if (cancelled || !data.doc) return;
        setState(data.doc);
        const st = data.doc.skillRun?.status ?? 'done';
        if (st !== 'done' && st !== 'error') setTimeout(poll, 700);
      } catch {
        if (!cancelled) setTimeout(poll, 1200);
      }
    };
    setTimeout(poll, 600);
    return () => { cancelled = true; };
  }, [orgSlug, subfile.id, status]);

  const body = useMemo(() => renderMarkdown(state.content), [state.content]);
  const mentions = state.skillRun?.mentionedAgents ?? [];

  return (
    <>
      <div className="doc-meta">
        {state.skillRun && (
          <>
            <span className="pill" style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'Geist Mono, monospace' }}>
              {state.skillRun.command}
            </span>
            <span>·</span>
            <span>{state.skillRun.skillId.split('.')[0]}</span>
            <span>·</span>
          </>
        )}
        <span>{relativeTs(state.createdAt)}</span>
        <span>·</span>
        <span>created by <strong style={{ color: 'var(--ink-soft)' }}>{state.createdBy}</strong></span>
        {mentions.length > 0 && (
          <>
            <span>·</span>
            <span>
              {mentions.map((m) => (
                <span key={m.id} className="mention" style={{ marginRight: 6 }}>@{m.name}</span>
              ))}
            </span>
          </>
        )}
      </div>

      <h1 className="doc-title">{state.title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 24px', paddingBottom: 16, borderBottom: '1px solid var(--rule)' }}>
        <span
          className="pill"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px',
            borderRadius: 999,
            fontFamily: 'Geist Mono, monospace',
            fontSize: 10.5,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background:
              status === 'done' ? 'oklch(0.95 0.05 150)' :
              status === 'error' ? 'oklch(0.94 0.06 25)' :
              'oklch(0.94 0.05 90)',
            color:
              status === 'done' ? 'oklch(0.4 0.13 150)' :
              status === 'error' ? 'oklch(0.42 0.14 25)' :
              'oklch(0.4 0.13 60)',
          }}
        >
          {(status === 'running' || status === 'pending') && (
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'oklch(0.55 0.13 60)',
              animation: 'live 1.4s ease-in-out infinite',
            }} />
          )}
          {status}
        </span>
        {(status === 'running' || status === 'pending') && (
          <span style={{ fontFamily: 'Geist Mono, monospace', fontSize: 11.5, color: 'var(--muted)' }}>
            orchestrator is writing this subfile…
          </span>
        )}
        {parentTitle && (
          <span style={{ marginLeft: 'auto', fontFamily: 'Geist Mono, monospace', fontSize: 11.5, color: 'var(--muted)' }}>
            parent: <Link href={`/${orgSlug}/brain`} style={{ color: 'var(--ink-soft)', borderBottom: '1px solid var(--rule-strong)' }}>{parentTitle}</Link>
          </span>
        )}
      </div>

      <div className="md-body">{body}</div>

      {childLinks.length > 0 && (
        <>
          <h2><span className="num">·</span> Sub-pages</h2>
          <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--rule)', borderRadius: 8, overflow: 'hidden' }}>
            {childLinks.map((c) => (
              <Link
                key={c.id}
                href={`/${orgSlug}/docs/${c.id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '90px 1fr 80px', gap: 12,
                  padding: '10px 14px', borderBottom: '1px solid var(--rule)',
                  textDecoration: 'none', color: 'var(--ink)', fontSize: 14,
                }}
              >
                <span style={{
                  fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--muted)',
                  background: 'var(--bg-sunken)', padding: '2px 6px', borderRadius: 4,
                  width: 'fit-content', alignSelf: 'center',
                }}>
                  {c.command || '·'}
                </span>
                <span style={{ alignSelf: 'center', fontWeight: 500 }}>{c.title}</span>
                <span style={{
                  fontFamily: 'Geist Mono, monospace', fontSize: 11, color: 'var(--muted)',
                  textAlign: 'right', alignSelf: 'center',
                }}>
                  {relativeTs(c.createdAt)}
                </span>
              </Link>
            ))}
          </div>
        </>
      )}

      <hr className="rule" />
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 0, fontFamily: 'Geist Mono, monospace' }}>
        doc_id={state.id} · created {relativeTs(state.createdAt)} · status {status}
      </p>
    </>
  );
}
