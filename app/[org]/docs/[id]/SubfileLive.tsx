'use client';

import { useEffect, useMemo, useState } from 'react';

interface MdToken { kind: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'pre' | 'blockquote' | 'hr' | 'table'; text: string; }

// A tiny, deliberately permissive markdown renderer that handles the shapes our
// skill-runner emits (headings, bullets, tables, code, blockquotes). Anything
// unrecognized falls through as a paragraph.
function renderMarkdown(md: string): React.ReactNode {
  const lines = md.split('\n');
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (/^#{1,3}\s+/.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const text = line.replace(/^#+\s+/, '');
      const Tag = (level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3') as keyof React.JSX.IntrinsicElements;
      out.push(<Tag key={key++}>{renderInline(text)}</Tag>);
      i++; continue;
    }

    if (line.trim() === '---') {
      out.push(<hr key={key++} />); i++; continue;
    }

    if (line.startsWith('> ')) {
      const buf: string[] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('> ')) {
        buf.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i++;
      }
      out.push(<blockquote key={key++}>{buf.map((b, j) => <div key={j}>{renderInline(b)}</div>)}</blockquote>);
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
      i++; // closing ```
      out.push(<pre key={key++} data-lang={lang || undefined}>{buf.join('\n')}</pre>);
      continue;
    }

    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s\-|:]+\|$/.test(lines[i + 1] ?? '')) {
      // markdown table
      const header = line.split('|').slice(1, -1).map((s) => s.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
        rows.push((lines[i] ?? '').split('|').slice(1, -1).map((s) => s.trim()));
        i++;
      }
      out.push(
        <table key={key++}>
          <thead><tr>{header.map((h, j) => <th key={j}>{renderInline(h)}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, j) => (
              <tr key={j}>{r.map((c, k) => <td key={k}>{renderInline(c)}</td>)}</tr>
            ))}
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
        <ul key={key++}>
          {items.map((it, j) => (
            <li key={j}>
              {typeof it.checked === 'boolean' && (
                <span className={'cb ' + (it.checked ? 'on' : 'off')}>{it.checked ? '✓' : ''}</span>
              )}
              {renderInline(it.text)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    if (line.trim() === '') { i++; continue; }

    // Paragraph: collect contiguous non-empty, non-prefixed lines.
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      (lines[i] ?? '').trim() !== '' &&
      !/^(#{1,3}\s|> |```|\| |[-*]\s)/.test(lines[i] ?? '')
    ) {
      buf.push(lines[i] ?? '');
      i++;
    }
    out.push(<p key={key++}>{renderInline(buf.join(' '))}</p>);
  }
  return <>{out}</>;
}

function renderInline(text: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let key = 0;
  // Order matters: handle code first so we don't double-process inside it.
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

type SkillStatus = 'pending' | 'running' | 'done' | 'error';

export default function SubfileLive({
  docId,
  orgSlug,
  initialStatus,
  initialContent,
}: {
  docId: string;
  orgSlug: string;
  initialStatus: SkillStatus;
  initialContent: string;
}) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<SkillStatus>(initialStatus);

  // While the skill is running, poll the doc every 700ms. We also subscribe
  // to the org's SSE so we hear skill.complete and refresh exactly once.
  useEffect(() => {
    if (status === 'done' || status === 'error') return;

    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/orgs/${orgSlug}/docs/${docId}`, { cache: 'no-store' });
        const data = (await r.json()) as { doc?: { content: string; skillRun?: { status: SkillStatus } } };
        if (cancelled || !data.doc) return;
        setContent(data.doc.content);
        const st: SkillStatus = data.doc.skillRun?.status ?? 'done';
        setStatus(st);
        if (st !== 'done' && st !== 'error') setTimeout(poll, 700);
      } catch {
        if (!cancelled) setTimeout(poll, 1200);
      }
    };
    void poll();

    return () => { cancelled = true; };
  }, [docId, orgSlug, status]);

  const body = useMemo(() => renderMarkdown(content), [content]);

  return (
    <>
      <div className={'status-strip status-' + status}>
        <span className={'pill status-' + status}>
          {status === 'running' && <span className="dot" />}
          {status === 'pending' && <span className="dot" />}
          {status}
        </span>
        {status === 'running' && <span className="hint">orchestrator is writing this subfile…</span>}
      </div>
      <div className="md">{body}</div>
    </>
  );
}
