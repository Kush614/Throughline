'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AgentOption { id: string; name: string; from: string; status: string; }
interface SkillOption { id: string; name: string; command: string; provider: string; description: string; }

interface ParsedCommand {
  agentTokens: string[];   // names typed after @, deduped
  skillToken: string | null;
  task: string;
  cursor: { mode: 'agent' | 'skill' | null; query: string };
}

function parseCommand(input: string, cursorPos: number): ParsedCommand {
  // Inspect the token at the cursor for autocomplete mode.
  // Simple tokenizer: split on whitespace but keep position info.
  const before = input.slice(0, cursorPos);
  const matchAt = /(?:^|\s)@([\w-]*)$/.exec(before);
  const matchSlash = /(?:^|\s)\/([\w-]*)$/.exec(before);
  let cursor: ParsedCommand['cursor'] = { mode: null, query: '' };
  if (matchAt) cursor = { mode: 'agent', query: matchAt[1] || '' };
  else if (matchSlash) cursor = { mode: 'skill', query: matchSlash[1] || '' };

  // Whole-string parse for final dispatch.
  const agentTokens: string[] = [];
  let skillToken: string | null = null;
  const taskParts: string[] = [];
  // Use a simple scan that recognizes @name and /skill at word boundaries.
  // Anything not matching is the task.
  const tokens = input.split(/\s+/).filter(Boolean);
  for (const tok of tokens) {
    if (tok.startsWith('@') && tok.length > 1) {
      const n = tok.slice(1);
      if (!agentTokens.includes(n)) agentTokens.push(n);
    } else if (tok.startsWith('/') && tok.length > 1 && skillToken === null) {
      skillToken = tok;
    } else {
      taskParts.push(tok);
    }
  }
  return { agentTokens, skillToken, task: taskParts.join(' '), cursor };
}

function replaceToken(input: string, cursorPos: number, replacement: string): { value: string; newCursor: number } {
  const before = input.slice(0, cursorPos);
  const after = input.slice(cursorPos);
  // Replace the trailing @… or /… token in `before`.
  const replacedBefore = before.replace(/(?:^|\s)([@/])[\w-]*$/, (_m, sigil) => {
    // preserve leading whitespace if any
    const lead = _m.startsWith(' ') || _m.startsWith('\t') ? ' ' : '';
    return `${lead}${sigil}${replacement} `;
  });
  return { value: replacedBefore + after, newCursor: replacedBefore.length };
}

export interface CommandBarProps {
  orgSlug: string;
  agents: AgentOption[];
}

export default function CommandBar({ orgSlug, agents }: CommandBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [cursor, setCursor] = useState(0);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [selIndex, setSelIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ docId: string; title: string; command: string } | null>(null);

  // Load skills + providers once.
  useEffect(() => {
    fetch(`/api/orgs/${orgSlug}/skills`)
      .then((r) => r.json() as Promise<{ skills: SkillOption[]; providers: string[] }>)
      .then((d) => {
        setSkills(d.skills || []);
        setProviders(d.providers || []);
      })
      .catch(() => { /* ignore */ });
  }, [orgSlug]);

  const parsed = useMemo(() => parseCommand(value, cursor), [value, cursor]);

  const suggestions: ({ kind: 'agent'; opt: AgentOption } | { kind: 'skill'; opt: SkillOption })[] = useMemo(() => {
    if (!parsed.cursor.mode) return [];
    const q = parsed.cursor.query.toLowerCase();
    if (parsed.cursor.mode === 'agent') {
      return agents
        .filter((a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
        .slice(0, 8)
        .map((opt) => ({ kind: 'agent' as const, opt }));
    }
    return skills
      .filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      .slice(0, 8)
      .map((opt) => ({ kind: 'skill' as const, opt }));
  }, [parsed, agents, skills]);

  useEffect(() => { if (selIndex >= suggestions.length) setSelIndex(0); }, [suggestions, selIndex]);

  const applySuggestion = (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;
    const replacement = s.kind === 'agent' ? s.opt.name.replace(/\s+/g, '') : s.opt.name;
    const { value: nextValue, newCursor } = replaceToken(value, cursor, replacement);
    setValue(nextValue);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
        setCursor(newCursor);
      }
    });
  };

  const dispatch = async () => {
    if (submitting) return;
    setError(null);
    setSuccess(null);
    if (!parsed.skillToken) { setError('Pick a skill with /<name> (try /plan or /research).'); return; }
    if (!parsed.task.trim()) { setError('Add a task description after the skill.'); return; }
    const mentionedAgents = parsed.agentTokens
      .map((name) => agents.find((a) => a.name.toLowerCase().replace(/\s+/g, '') === name.toLowerCase()))
      .filter((a): a is AgentOption => !!a)
      .map((a) => ({ id: a.id, name: a.name }));

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgSlug}/skills/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: parsed.skillToken,
          task: parsed.task,
          mentionedAgents,
          requestedBy: 'doc-author',
        }),
      });
      const data = (await res.json()) as
        | { doc: { id: string; title: string; skillRun?: { command: string } } }
        | { error: string };
      if (!res.ok || !('doc' in data)) {
        setError('error' in data ? data.error : 'Skill dispatch failed.');
        return;
      }
      setSuccess({
        docId: data.doc.id,
        title: data.doc.title,
        command: data.doc.skillRun?.command || parsed.skillToken,
      });
      setValue('');
      setCursor(0);
      // refresh server data (DocTree) without nuking the form
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelIndex((i) => Math.min(suggestions.length - 1, i + 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelIndex((i) => Math.max(0, i - 1)); return; }
      if (e.key === 'Tab' || (e.key === 'Enter' && parsed.cursor.mode)) {
        e.preventDefault(); applySuggestion(selIndex); return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setCursor(value.length); return; }
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      void dispatch();
    }
  };

  return (
    <div className="cmd-root">
      <div className="cmd-bar">
        <span className="cmd-prompt">/</span>
        <input
          ref={inputRef}
          className="cmd-input"
          value={value}
          placeholder="@iris @forge /plan launch beta to 5 design partners"
          onChange={(e) => {
            setValue(e.target.value);
            setCursor(e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyUp={(e) => setCursor(e.currentTarget.selectionStart ?? value.length)}
          onClick={(e) => setCursor(e.currentTarget.selectionStart ?? value.length)}
          onKeyDown={onKeyDown}
          disabled={submitting}
        />
        <button className="cmd-go" type="button" disabled={submitting || !parsed.skillToken || !parsed.task.trim()} onClick={() => void dispatch()}>
          {submitting ? 'dispatching…' : 'run →'}
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="cmd-suggest">
          <div className="cmd-suggest-head">
            {parsed.cursor.mode === 'agent' ? 'AGENTS' : 'SKILLS'}
            <span className="cmd-suggest-hint">↑↓ navigate · ⇥ insert · esc close</span>
          </div>
          <ul>
            {suggestions.map((s, i) => (
              <li
                key={s.kind === 'agent' ? `a:${s.opt.id}` : `s:${s.opt.id}`}
                className={i === selIndex ? 'sel' : ''}
                onMouseEnter={() => setSelIndex(i)}
                onClick={() => applySuggestion(i)}
              >
                {s.kind === 'agent' ? (
                  <>
                    <span className="cmd-suggest-mark agent-mark">@</span>
                    <span className="cmd-suggest-name">{s.opt.name}</span>
                    <span className="cmd-suggest-meta">{s.opt.from} · {s.opt.status}</span>
                  </>
                ) : (
                  <>
                    <span className="cmd-suggest-mark">/</span>
                    <span className="cmd-suggest-name">{s.opt.command}</span>
                    <span className="cmd-suggest-meta">{s.opt.provider}</span>
                    <span className="cmd-suggest-desc">{s.opt.description}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cmd-status">
        {parsed.agentTokens.length > 0 && (
          <span className="cmd-chip">
            assigned to <b>{parsed.agentTokens.map((n) => '@' + n).join(' ')}</b>
          </span>
        )}
        {parsed.skillToken && (
          <span className="cmd-chip">
            running <b>{parsed.skillToken}</b>
          </span>
        )}
        {providers.length > 0 && !parsed.cursor.mode && !parsed.skillToken && (
          <span className="cmd-chip dim">
            providers installed: <b>{providers.join(' · ')}</b>
          </span>
        )}
      </div>

      {error && <div className="cmd-error">{error}</div>}
      {success && (
        <div className="cmd-success">
          <span className="ok">✓</span>
          <span>
            <b>{success.command}</b> dispatched. Subfile created:{' '}
            <a href={`/${orgSlug}/docs/${success.docId}`}>{success.title} →</a>
          </span>
        </div>
      )}
    </div>
  );
}
