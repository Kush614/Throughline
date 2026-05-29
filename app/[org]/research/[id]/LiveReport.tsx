'use client';

import { useEffect, useState } from 'react';

type StepStatus = 'pending' | 'running' | 'done' | 'error';
interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}
interface Source { title: string; url?: string; note?: string; }
interface Finding { claim: string; evidence?: string; }
interface HogCompany { name?: string; domain?: string; industry?: string; hq?: string; description?: string; }
interface HogPerson { name?: string; title?: string; company?: string; linkedin?: string; }

export interface LiveReportInitial {
  id: string;
  status: 'planning' | 'running' | 'done' | 'error';
  steps: Step[];
  summary: string;
  report: string;
  sources: Source[];
  findings: Finding[];
  hogHits: { companies: HogCompany[]; people: HogPerson[] };
  completedAt: string | null;
  error: string | null;
}

export default function LiveReport({ initial }: { initial: LiveReportInitial }) {
  const [state, setState] = useState<LiveReportInitial>(initial);

  useEffect(() => {
    if (initial.status === 'done' || initial.status === 'error') return;
    const es = new EventSource(`/api/research/${initial.id}/events`);
    es.onmessage = async (msg) => {
      try {
        const data = JSON.parse(msg.data) as Record<string, unknown>;
        if (data.type === 'research.step' && data.payload && typeof data.payload === 'object') {
          const p = data.payload as { stepId: string; step: Step };
          setState((s) => ({
            ...s,
            status: 'running',
            steps: s.steps.map((x) => (x.id === p.stepId ? { ...x, ...p.step } : x)),
          }));
        }
        if (data.type === 'research.complete') {
          // refresh from API to pull the final report/findings/sources
          const res = await fetch(`/api/research/${initial.id}`).then((r) => r.json()).catch(() => null);
          if (res && res.research) {
            setState({
              id: res.research.id,
              status: res.research.status,
              steps: res.research.steps,
              summary: res.research.summary,
              report: res.research.report,
              sources: res.research.sources,
              findings: res.research.findings,
              hogHits: res.research.hogHits,
              completedAt: res.research.completedAt,
              error: res.research.error,
            });
          }
          es.close();
        }
        if (data.type === 'research.error' && data.payload) {
          const p = data.payload as { error?: string };
          setState((s) => ({ ...s, status: 'error', error: p.error || 'failed' }));
          es.close();
        }
        if (data.type === 'sse.closing') es.close();
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [initial.id, initial.status]);

  const done = state.status === 'done';

  return (
    <>
      <div className="status-strip">
        <span className={'status-pill status-' + state.status}>
          {state.status === 'running' && <span className="dot" />}
          {state.status}
        </span>
        {state.completedAt && (
          <span className="ts">completed {new Date(state.completedAt).toLocaleString()}</span>
        )}
      </div>

      <ol className="steps">
        {state.steps.map((s) => (
          <li key={s.id} className={'step ' + s.status}>
            <span className="marker">
              {s.status === 'done' && '✓'}
              {s.status === 'error' && '×'}
              {s.status === 'running' && <span className="spinner" />}
            </span>
            <div className="body">
              <div className="label">{s.label}</div>
              {s.detail && <div className="detail">{s.detail}</div>}
            </div>
          </li>
        ))}
      </ol>

      {state.error && (
        <div className="error-block">
          <strong>Error:</strong> {state.error}
        </div>
      )}

      {done && state.summary && (
        <section className="summary-card">
          <div className="label">TL;DR</div>
          <div className="body">{state.summary}</div>
        </section>
      )}

      {done && state.findings.length > 0 && (
        <section>
          <h2>Key findings</h2>
          <ul className="findings">
            {state.findings.map((f, i) => (
              <li key={i}>
                <span>{f.claim}</span>
                {f.evidence && <em> · {f.evidence}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {done && (state.hogHits.companies.length > 0 || state.hogHits.people.length > 0) && (
        <section>
          <h2>Hog signal</h2>
          {state.hogHits.companies.length > 0 && (
            <div className="hog-block">
              <div className="hog-label">Companies</div>
              {state.hogHits.companies.map((c, i) => (
                <div key={i} className="hog-row">
                  <span className="hog-name">{c.name || c.domain || 'unknown'}</span>
                  {(c.industry || c.hq) && (
                    <span className="hog-meta">{[c.industry, c.hq].filter(Boolean).join(' · ')}</span>
                  )}
                  {c.description && <div className="hog-desc">{c.description}</div>}
                </div>
              ))}
            </div>
          )}
          {state.hogHits.people.length > 0 && (
            <div className="hog-block">
              <div className="hog-label">People</div>
              {state.hogHits.people.map((p, i) => (
                <div key={i} className="hog-row">
                  <span className="hog-name">{p.name || 'unknown'}</span>
                  {(p.title || p.company) && (
                    <span className="hog-meta">{[p.title, p.company].filter(Boolean).join(' at ')}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {done && state.sources.length > 0 && (
        <section>
          <h2>Sources</h2>
          <ul className="sources">
            {state.sources.map((s, i) => (
              <li key={i}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                {s.note && <em> — {s.note}</em>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {done && state.report && (
        <details className="raw">
          <summary>View raw markdown report</summary>
          <pre>{state.report}</pre>
        </details>
      )}
    </>
  );
}
