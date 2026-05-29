import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { listResearch } from '@/lib/research';
import './[id]/research-page.css';

export const dynamic = 'force-dynamic';

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

export default async function OrgResearchListPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const items = await listResearch({ orgSlug: org.slug });

  return (
    <div className="research-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">Throughline<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-crumb">
            <Link href={`/${org.slug}`} style={{ color: 'var(--ink-soft)' }}>{org.name}</Link>
            <span className="sep">›</span>
            <span className="cur">Research</span>
          </div>
          <div className="nav-right">
            <Link className="txt" href={`/${org.slug}/brain`}>Brain</Link>
            <Link className="txt" href={`/${org.slug}/agents`}>Agents</Link>
          </div>
        </div>
      </nav>

      <section className="report-wrap" style={{ paddingTop: 56 }}>
        <div className="meta-row">
          <span className="kind">/research</span>
          <span className="dot-sep">·</span>
          <span className="cls">{items.length} report{items.length === 1 ? '' : 's'}</span>
        </div>
        <h1 className="topic">{org.name} research</h1>

        {items.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: 15 }}>
            No research yet. Open <Link href="/doc-minimal" style={{ color: 'var(--ink)', borderBottom: '1px solid var(--rule-strong)' }}>/doc-minimal</Link>{' '}
            and add a <code style={{ background: 'var(--bg-sunken)', padding: '1px 5px', borderRadius: 3 }}>/research</code> skill block.
          </p>
        ) : (
          <ul className="findings">
            {items.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/${org.slug}/research/${r.id}`}
                  style={{ color: 'var(--ink)', fontWeight: 500 }}
                >
                  {r.topic}
                </Link>
                <em>
                  {' · '}{r.status}
                  {' · '}{relative(r.createdAt)}
                  {' · '}{r.classification}
                </em>
                {r.summary && (
                  <div style={{ marginTop: 4, fontSize: 13, color: 'var(--muted)' }}>
                    {r.summary.slice(0, 160)}{r.summary.length > 160 ? '…' : ''}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
