'use client';

import { useMemo, useState } from 'react';

interface SessionSummary { sessionId: string; memoryCount: number; kinds: string[] }
interface Layer { kind: string; count: number }
interface ContextImage {
  ref: string; tag: string; digest: string; builtAt: string;
  org: string; session: string; layers: Layer[]; memoryCount: number;
  contextPrompt: string | null; pullCommand: string;
}
type Phase = 'idle' | 'building' | 'sealing' | 'launching' | 'shipped';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const FALLBACK_KINDS = ['decision', 'finding', 'rule', 'summary'];

export default function ShipStage({
  slug, sessions, defaultSession,
}: { slug: string; sessions: SessionSummary[]; defaultSession: string }) {
  const [sessionId, setSessionId] = useState(sessions[0]?.sessionId ?? defaultSession);
  const [phase, setPhase] = useState<Phase>('idle');
  const [image, setImage] = useState<ContextImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const plates = useMemo(() => {
    const s = sessions.find((x) => x.sessionId === sessionId);
    const kinds = s?.kinds.length ? s.kinds : FALLBACK_KINDS;
    return kinds.slice(0, 5);
  }, [sessions, sessionId]);

  const busy = phase === 'building' || phase === 'sealing' || phase === 'launching';

  async function ship() {
    if (busy) return;
    setError(null);
    setImage(null);
    setCopied(false);

    const req = fetch(`/api/orgs/${slug}/ship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).then(async (r) => ({ ok: r.ok, data: await r.json() }));

    setPhase('building'); await sleep(1850);
    setPhase('sealing'); await sleep(760);
    setPhase('launching'); await sleep(1250);

    const { ok, data } = await req;
    if (!ok) { setError(data?.error ?? 'Ship failed'); setPhase('idle'); return; }
    setImage(data as ContextImage);
    setPhase('shipped');
  }

  function copyPull() {
    if (!image) return;
    navigator.clipboard?.writeText(image.pullCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  const status =
    phase === 'building' ? 'Packing layers…'
    : phase === 'sealing' ? 'Sealing image · computing digest…'
    : phase === 'launching' ? 'Shipping to registry…'
    : phase === 'shipped' ? 'Shipped'
    : 'Ready to ship';

  return (
    <div className={`ship-wrap gum phase-${phase}`}>
      <div className="ship-scene">
        <div className="ship-space">
          <div className="ship-stack" style={{ ['--plates' as string]: String(plates.length) }}>
            <div className="ship-base" />
            {plates.map((k, i) => (
              <div key={`${k}-${i}`} className={`plate kind-${k}`} style={{ ['--i' as string]: String(i) }}>
                <span className="plate-label">{k}</span>
              </div>
            ))}
            <div className="ship-seal" />
          </div>
          <div className="ship-shadow" />
          <div className="speedlines">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={{ ['--n' as string]: String(i) }} />
            ))}
          </div>
        </div>
      </div>

      <div className="ship-status"><span className="ship-status-dot" />{status}</div>

      {phase !== 'shipped' ? (
        <div className="ship-controls">
          <label className="ship-pick">
            <span>Session</span>
            <select value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={busy}>
              {sessions.length > 0 ? (
                sessions.map((s) => (
                  <option key={s.sessionId} value={s.sessionId}>{s.sessionId} · {s.memoryCount} memories</option>
                ))
              ) : (
                <option value={defaultSession}>{defaultSession}</option>
              )}
            </select>
          </label>
          <button className="ship-go" onClick={ship} disabled={busy}>
            {busy ? 'Shipping…' : 'Build & ship session →'}
          </button>
          {error && <div className="ship-error">{error}</div>}
        </div>
      ) : image && (
        <div className="ship-result">
          <div className="ship-img-card">
            <div className="ship-img-top">
              <span className="ship-img-ref">{image.ref}</span>
              <span className="ship-img-tag">:{image.tag}</span>
            </div>
            <div className="ship-img-digest mono">{image.digest}</div>
            <div className="ship-img-layers">
              {image.layers.map((l) => (
                <span key={l.kind} className={`ship-layer-chip kind-${l.kind}`}>{l.kind} ×{l.count}</span>
              ))}
            </div>
            <div className="ship-img-meta mono">
              {image.memoryCount} memories · built {new Date(image.builtAt).toLocaleString()}
            </div>
            <button className="ship-pull mono" onClick={copyPull} title="Copy">
              {copied ? '✓ copied to clipboard' : `$ ${image.pullCommand}`}
            </button>
          </div>
          <button className="ship-again" onClick={() => setPhase('idle')}>Ship another →</button>
        </div>
      )}
    </div>
  );
}
