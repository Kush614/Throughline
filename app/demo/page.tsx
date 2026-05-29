import Link from 'next/link';
import { getOrg } from '@/lib/orgs';
import { xtraceConfigured } from '@/lib/xtrace';
import IndexRepoBox from './_components/IndexRepoBox';
import '../[org]/room/room.css';
import './demo.css';

export const dynamic = 'force-dynamic';

const FEATURES = [
  { h: 'Ask in plain English', p: 'Anyone — PM, founder, new hire — asks the room a question and gets a sourced answer. No engineer required.' },
  { h: 'See decisions evolve', p: 'Every decision is remembered; when one is replaced, the old one is struck through. You never act on stale info.' },
  { h: 'Ship a session anywhere', p: 'Package a session’s context into a portable image and pull it into any room — zero context loss across machines.' },
];

export default async function DemoPage() {
  const configured = xtraceConfigured();
  // Only surface the ready-made rooms that actually exist.
  const ready = (await Promise.all(
    [
      { slug: 'maple', k: 'online store', h: 'Maple', p: 'A normal company building an online store — guest checkout, all-in pricing, PayPal → Stripe.' },
      { slug: 'codebase', k: 'real codebase', h: 'Codebase', p: 'This very repo, indexed: ask what it does, the tech stack, and how a prod bug got fixed.' },
    ].map(async (r) => ({ ...r, exists: Boolean(await getOrg(r.slug)) })),
  )).filter((r) => r.exists);

  return (
    <div className="demo-root gum">
      <header className="room-bar">
        <span className="room-brand"><span className="room-logo" /> Throughline</span>
        <span className="room-org">demo</span>
      </header>

      <main className="demo-main">
        <div className="demo-eyebrow">Shared memory for AI-native teams · powered by XTrace</div>
        <h1 className="demo-title">Your codebase, in plain English.</h1>
        <p className="demo-sub">
          Your agents do the work; Throughline remembers it. Index a real repo, then ask the room
          anything — decisions, findings, even how a production bug got fixed.
        </p>

        {!configured && (
          <div className="idx-error">XTrace isn’t connected — add XTRACE_API_KEY and XTRACE_ORG_ID to .env.local.</div>
        )}

        <IndexRepoBox />

        {ready.length > 0 && (
          <>
            <div className="demo-or">or jump into a ready-made room</div>
            <div className="demo-rooms">
              {ready.map((r) => (
                <Link key={r.slug} className="demo-room-card" href={`/${r.slug}/room`}>
                  <div className="rk">{r.k}</div>
                  <h3>{r.h} room →</h3>
                  <p>{r.p}</p>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="demo-features">
          {FEATURES.map((f, i) => (
            <div key={f.h} className="demo-feature">
              <div className="fnum">0{i + 1}</div>
              <h4>{f.h}</h4>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
