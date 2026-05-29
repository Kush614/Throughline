import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';
import { decisionTimeline, recallMemory } from '@/lib/adapters/xtrace';
import { xtraceConfigured } from '@/lib/xtrace';
import AskBox from '../ask/_components/AskBox';
import '../ask/ask.css';
import './room.css';

export const dynamic = 'force-dynamic';

export default async function RoomPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const configured = xtraceConfigured();
  const [agents, timeline, recall] = configured
    ? await Promise.all([
        listAgents({ orgSlug: slug }),
        decisionTimeline(slug, { limit: 60 }),
        recallMemory(slug, { limit: 30 }),
      ])
    : [[], { active: [], superseded: [] }, []];

  const connected = agents.filter((a) => a.status === 'connected');
  // When no agents are live, fall back to recent contributors from memory so the
  // room still feels populated.
  const contributors = Array.from(
    new Set(recall.map((m) => m.agentName).filter((n): n is string => Boolean(n))),
  ).slice(0, 6);

  // What the room knows = decisions (active + superseded, struck) first, then
  // episode summaries / other memory from recall. So the room is rich even when
  // a workspace is episode-heavy (e.g. an indexed codebase).
  const seen = new Set<string>();
  const knows: typeof recall = [];
  for (const d of [...timeline.active, ...timeline.superseded]) {
    if (!seen.has(d.id)) { knows.push(d); seen.add(d.id); }
  }
  for (const m of recall) {
    if (!seen.has(m.id)) { knows.push(m); seen.add(m.id); }
  }
  const items = knows.slice(0, 8);

  return (
    <div className="room-root gum">
      <header className="room-bar">
        <span className="room-brand"><span className="room-logo" /> Throughline</span>
        <span className="room-org">{org.name} room</span>
        <span className="room-actions">
          <Link className="room-devlink" href={`/${slug}/guide`}>how it works</Link>
          <Link className="room-devlink ship" href={`/${slug}/ship`}>ship session →</Link>
          <Link className="room-devlink" href={`/${slug}/brain`}>builder view →</Link>
        </span>
      </header>

      <main className="room-main">
        <div className="room-eyebrow">Live workspace memory · XTrace</div>
        <h1 className="room-title">Ask the {org.name} room.</h1>
        <p className="room-sub">
          Everything your agents have decided, found, and shipped — answerable in plain English,
          traced to its source. No engineer required.
        </p>

        {!configured && (
          <div className="room-banner">
            Connect XTrace to bring the room to life: add <code>XTRACE_API_KEY</code> and{' '}
            <code>XTRACE_ORG_ID</code> to <code>.env.local</code>.
          </div>
        )}

        <AskBox slug={slug} />

        <div className="room-presence">
          <span className="label">In the room</span>
          {connected.length > 0 ? (
            connected.slice(0, 6).map((a) => (
              <span key={a.id} className="room-agent">
                <span className="room-dot" /> {a.name}
                {a.metadata?.current_task ? ` — ${a.metadata.current_task}` : ''}
              </span>
            ))
          ) : contributors.length > 0 ? (
            <span>recently contributed · {contributors.join('  ·  ')}</span>
          ) : (
            <span>quiet right now</span>
          )}
        </div>

        <section className="room-section">
          <div className="room-section-h">What the room knows</div>
          {items.length === 0 ? (
            <p className="room-muted">
              Nothing captured yet. Memory fills in as agents make decisions, do research, or index
              a codebase.
            </p>
          ) : (
            <ul className="room-decisions">
              {items.map((d) => (
                <li key={d.id} className={`room-dec${d.superseded ? ' superseded' : ''}`}>
                  <span className="room-dot" />
                  <div>
                    <div className="room-dec-text">{d.text.length > 200 ? d.text.slice(0, 200) + '…' : d.text}</div>
                    <div className="room-dec-meta">
                      {d.superseded ? 'superseded' : d.kind}
                      {d.agentName ? ` · ${d.agentName}` : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
