import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import {
  recallMemory,
  sessionRecap,
  decisionTimeline,
  defaultSession,
} from '@/lib/adapters/xtrace';
import { xtraceConfigured } from '@/lib/xtrace';
import AskBox from './_components/AskBox';
import './ask.css';

export const dynamic = 'force-dynamic';

export default async function AskPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const configured = xtraceConfigured();

  // Find the most recent active session to recap, then pull its narrative + the
  // decision-evolution timeline. All no-op safely when XTrace isn't configured.
  const recent = configured ? await recallMemory(slug, { limit: 1 }) : [];
  const activeSession = recent[0]?.sessionId ?? defaultSession(slug);
  const [recap, timeline] = configured
    ? await Promise.all([sessionRecap(slug, activeSession), decisionTimeline(slug)])
    : [null, { active: [], superseded: [] }];

  return (
    <div className="ask-root gum">
      <header className="ask-header">
        <Link className="ask-brand" href={`/${slug}`}>
          <span className="logo" />
          <span className="name">Throughline<span className="sm">Cloud</span></span>
        </Link>
        <nav className="ask-nav">
          <Link href={`/${slug}/brain`}>Brain</Link>
          <Link href={`/${slug}/agents`}>Agents</Link>
          <Link className="active" href={`/${slug}/ask`}>Ask</Link>
        </nav>
      </header>

      <main className="ask-main">
        <div className="ask-eyebrow">WORKSPACE MEMORY · powered by XTrace</div>
        <h1 className="ask-title">Ask {org.name} anything.</h1>
        <p className="ask-sub">
          Plain-English answers from your team&apos;s shared memory — every claim traced back to the
          work that produced it. No engineer required.
        </p>

        {!configured && (
          <div className="ask-banner">
            <b>XTrace isn&apos;t connected yet.</b> Add <code>XTRACE_API_KEY</code> and{' '}
            <code>XTRACE_ORG_ID</code> to <code>.env.local</code> and restart, then the workspace
            memory comes alive.
          </div>
        )}

        <AskBox slug={slug} />

        <section className="ask-section">
          <div className="ask-section-head">
            <h2>Catch me up</h2>
            <span className="ask-section-sub mono">session · {activeSession}</span>
          </div>
          {recap && (recap.contextPrompt || recap.episode || recap.facts.length > 0) ? (
            <div className="recap-card">
              {recap.episode?.title && <div className="recap-episode-title">{recap.episode.title}</div>}
              <p className="recap-summary">
                {recap.episode?.summary || recap.contextPrompt || 'Here is what happened this session.'}
              </p>
              {recap.facts.length > 0 && (
                <ul className="recap-facts">
                  {recap.facts.slice(0, 8).map((f) => (
                    <li key={f.id} className={f.superseded ? 'superseded' : ''}>
                      <span className={`kind-badge kind-${f.kind}`}>{f.kind}</span>
                      <span className="recap-fact-text">{f.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="ask-muted-card">
              Nothing recorded for this session yet. When agents make decisions or finish research,
              the recap fills in automatically.
            </div>
          )}
        </section>

        <section className="ask-section">
          <div className="ask-section-head">
            <h2>How decisions evolved</h2>
            <span className="ask-section-sub mono">
              {timeline.active.length} active · {timeline.superseded.length} superseded
            </span>
          </div>
          {timeline.active.length === 0 && timeline.superseded.length === 0 ? (
            <div className="ask-muted-card">
              No decisions captured yet. They appear here the moment an agent runs{' '}
              <code>/remember</code> or <code>/pin</code>.
            </div>
          ) : (
            <div className="timeline">
              {timeline.active.map((d) => (
                <div key={d.id} className="tl-row active">
                  <span className="tl-dot" />
                  <div className="tl-body">
                    <div className="tl-text">{d.text}</div>
                    <div className="tl-meta mono">
                      {d.kind}{d.agentName ? ` · @${d.agentName}` : ''}{d.command ? ` · ${d.command}` : ''}
                    </div>
                  </div>
                </div>
              ))}
              {timeline.superseded.map((d) => (
                <div key={d.id} className="tl-row superseded">
                  <span className="tl-dot" />
                  <div className="tl-body">
                    <div className="tl-text struck">{d.text}</div>
                    <div className="tl-meta mono">superseded · {d.kind}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
