'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const STAGES = [
  'Cloning the repo…',
  'Reading the README & tech stack…',
  'Summarizing recent git history…',
  'Building shared memory in XTrace…',
  'Almost there…',
];

export default function IndexRepoBox() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  async function index(e: React.FormEvent) {
    e.preventDefault();
    const repoUrl = url.trim();
    if (!repoUrl || busy) return;
    setError(null);
    setBusy(true);
    setStage(0);
    timer.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 4000);

    try {
      const res = await fetch('/api/index-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to index the repo.');
        setBusy(false);
      } else {
        router.push(`/${data.slug}/room`);
      }
    } catch {
      setError('Could not reach the server.');
      setBusy(false);
    } finally {
      if (timer.current) clearInterval(timer.current);
    }
  }

  return (
    <div className="idx">
      <form className="idx-row" onSubmit={index}>
        <input
          className="idx-input"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <button className="idx-btn" type="submit" disabled={busy || !url.trim()}>
          {busy ? 'Indexing…' : 'Index this repo →'}
        </button>
      </form>

      {busy && <div className="idx-status"><span className="idx-status-dot" />{STAGES[stage]}</div>}
      {error && <div className="idx-error">{error}</div>}
      {!busy && !error && (
        <div className="idx-hint">
          Paste any public GitHub/GitLab repo. Try <code>https://github.com/gothinkster/realworld</code>.
        </div>
      )}
    </div>
  );
}
