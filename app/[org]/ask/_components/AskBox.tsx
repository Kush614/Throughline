'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Source {
  id: string;
  type: string;
  text: string;
  kind: string;
  status: string;
  superseded: boolean;
  agentName?: string;
  source?: string;
  command?: string;
  subfileHref?: string;
  subfileTitle?: string;
  score: number | null;
}

interface AskResult {
  answer: string | null;
  sources: Source[];
  usedContextPrompt: boolean;
  stageTimings?: Record<string, number>;
}

const EXAMPLES = [
  'What have we decided so far?',
  'Why did we change our payment provider?',
  'What are the open blockers?',
  'What changed recently?',
];

export default function AskBox({ slug }: { slug: string }) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asked, setAsked] = useState<string>('');

  async function ask(q: string) {
    const query = q.trim();
    if (!query || loading) return;
    setLoading(true);
    setError(null);
    setAsked(query);
    try {
      const res = await fetch(`/api/orgs/${slug}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.');
        setResult(null);
      } else {
        setResult(data as AskResult);
      }
    } catch {
      setError('Could not reach the workspace memory.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    ask(question);
  }

  const empty = result && result.sources.length === 0 && !result.answer;

  return (
    <div className="ask-box">
      <form className="ask-input-row" onSubmit={onSubmit}>
        <input
          className="ask-input"
          placeholder="Ask your workspace anything…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          autoFocus
        />
        <button className="ask-submit" type="submit" disabled={loading || !question.trim()}>
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

      {!result && !loading && !error && (
        <div className="ask-examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="ask-chip" onClick={() => { setQuestion(ex); ask(ex); }}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && <div className="ask-error">{error}</div>}

      {result && (
        <div className="ask-result">
          <div className="ask-asked">
            <span className="ask-q-label">Q</span> {asked}
          </div>

          {result.answer ? (
            <div className="ask-answer">
              <div className="ask-answer-head">
                <span className="ask-a-label">Answer</span>
                <span className="ask-source-tag">
                  {result.usedContextPrompt ? 'assembled by XTrace' : `from ${result.sources.length} memor${result.sources.length === 1 ? 'y' : 'ies'}`}
                </span>
              </div>
              <p className="ask-answer-text">{result.answer}</p>
            </div>
          ) : empty ? (
            <div className="ask-empty">
              No memory matches that yet. As agents work, the workspace remembers — try again later,
              or ask about a decision that&apos;s already been made.
            </div>
          ) : null}

          {result.sources.length > 0 && (
            <div className="ask-sources">
              <div className="ask-sources-head">Sources · click to trace</div>
              <ul>
                {result.sources.map((s) => (
                  <li key={s.id} className={`ask-src${s.superseded ? ' superseded' : ''}`}>
                    <div className="ask-src-meta">
                      <span className={`kind-badge kind-${s.kind}`}>{s.kind}</span>
                      {s.agentName && <span className="ask-src-agent">@{s.agentName}</span>}
                      {s.command && <span className="ask-src-cmd mono">{s.command}</span>}
                      {s.superseded && <span className="ask-src-super">superseded</span>}
                      {typeof s.score === 'number' && (
                        <span className="ask-src-score mono">{(s.score * 100).toFixed(0)}%</span>
                      )}
                    </div>
                    <div className="ask-src-text">{s.text}</div>
                    {s.subfileHref && (
                      <Link className="ask-src-link" href={s.subfileHref}>
                        → {s.subfileTitle ?? 'View source'}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
