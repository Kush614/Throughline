'use client';

import { useEffect, useState } from 'react';
import './research-panel.css';

type StepStatus = 'pending' | 'running' | 'done' | 'error';
interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

export interface ResearchPanelHandle {
  id: string;
  topic: string;
  orgSlug: string;
}

export default function ResearchPanel({
  research,
  onClose,
}: {
  research: ResearchPanelHandle;
  onClose: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<'planning' | 'running' | 'done' | 'error'>('planning');
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/research/${research.id}/events`);
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data) as Record<string, unknown>;
        if (data.type === 'hello' && Array.isArray(data.steps)) {
          setSteps(data.steps as Step[]);
          setStatus((data.status as typeof status) || 'planning');
          return;
        }
        if (data.type === 'research.step' && data.payload && typeof data.payload === 'object') {
          const p = data.payload as { stepId: string; step: Step };
          setStatus('running');
          setSteps((prev) =>
            prev.map((s) => (s.id === p.stepId ? { ...s, ...p.step } : s)).slice(),
          );
          return;
        }
        if (data.type === 'research.complete' && data.payload) {
          const p = data.payload as { summary?: string };
          if (p.summary) setSummary(p.summary);
          setStatus('done');
          // Mark any still-pending step as done so the UI doesn't look stuck.
          setSteps((prev) => prev.map((s) => (s.status === 'pending' || s.status === 'running' ? { ...s, status: 'done' } : s)));
          es.close();
          return;
        }
        if (data.type === 'research.error' && data.payload) {
          const p = data.payload as { error?: string };
          setError(p.error || 'Research failed');
          setStatus('error');
          es.close();
          return;
        }
        if (data.type === 'sse.closing') {
          es.close();
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    es.onerror = () => {
      // EventSource auto-reconnects; only abandon on persistent failure.
      // We rely on sse.closing to fully close on the happy path.
    };
    return () => es.close();
  }, [research.id]);

  return (
    <aside className="rp-root" aria-label="Research progress">
      <header className="rp-hd">
        <div className="rp-eyebrow">
          RESEARCH · <span className="rp-id">{research.id}</span>
        </div>
        <button className="rp-close" type="button" onClick={onClose} aria-label="Hide panel">
          ×
        </button>
      </header>

      <div className="rp-topic">
        <div className="rp-label">Topic</div>
        <div className="rp-topic-body">{research.topic}</div>
      </div>

      <div className="rp-status-row">
        <span className={'rp-status status-' + status}>
          {status === 'running' && <span className="rp-dot" />}
          {status}
        </span>
        <a
          className="rp-link"
          href={`/${research.orgSlug}/research/${research.id}`}
          target="_blank"
          rel="noreferrer"
        >
          open page ↗
        </a>
      </div>

      <ol className="rp-steps">
        {steps.length === 0 && (
          <li className="rp-step rp-step-pending">
            <span className="rp-marker" />
            <span className="rp-step-body">Waiting for orchestrator…</span>
          </li>
        )}
        {steps.map((s) => (
          <li key={s.id} className={'rp-step rp-step-' + s.status}>
            <span className="rp-marker">
              {s.status === 'done' && '✓'}
              {s.status === 'error' && '×'}
              {s.status === 'running' && <span className="rp-spinner" />}
            </span>
            <span className="rp-step-body">
              <span className="rp-step-label">{s.label}</span>
              {s.detail && <span className="rp-step-detail">{s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>

      {summary && (
        <div className="rp-summary">
          <div className="rp-label">Summary</div>
          <div className="rp-summary-body">{summary}</div>
        </div>
      )}

      {error && (
        <div className="rp-error">
          <div className="rp-label">Error</div>
          <div>{error}</div>
        </div>
      )}

      {status === 'done' && (
        <a
          className="rp-cta"
          href={`/${research.orgSlug}/research/${research.id}`}
          target="_blank"
          rel="noreferrer"
        >
          Read full report →
        </a>
      )}
    </aside>
  );
}
