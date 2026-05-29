import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { getResearch } from '@/lib/research';
import LiveReport from './LiveReport';
import './research-page.css';

export const dynamic = 'force-dynamic';

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

export default async function OrgResearchDetailPage({
  params,
}: {
  params: Promise<{ org: string; id: string }>;
}) {
  const { org: slugParam, id } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();
  const rec = await getResearch(id);
  if (!rec || rec.orgSlug !== org.slug) notFound();

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
            <Link href={`/${org.slug}/research`} style={{ color: 'var(--ink-soft)' }}>Research</Link>
            <span className="sep">›</span>
            <span className="cur">{rec.id}</span>
          </div>
          <div className="nav-right">
            <Link className="txt" href={`/${org.slug}/brain`}>Brain</Link>
            <Link className="txt" href={`/${org.slug}/agents`}>Agents</Link>
          </div>
        </div>
      </nav>

      <article className="report-wrap">
        <div className="meta-row">
          <span className="kind">/research</span>
          <span className="dot-sep">·</span>
          <span className="ts">{relative(rec.createdAt)}</span>
          <span className="dot-sep">·</span>
          <span className="cls">{rec.classification}</span>
          <span className="dot-sep">·</span>
          <span className="by">requested by {rec.requestedBy}</span>
        </div>

        <h1 className="topic">{rec.topic}</h1>

        {/* Mounts the live progress strip + report renderer. Hydrates with
            server-rendered state, then subscribes to SSE for live updates
            if the op is still in flight. */}
        <LiveReport
          initial={{
            id: rec.id,
            status: rec.status,
            steps: rec.steps,
            summary: rec.summary,
            report: rec.report,
            sources: rec.sources,
            findings: rec.findings,
            hogHits: rec.hogHits,
            completedAt: rec.completedAt,
            error: rec.error,
          }}
        />

        <footer className="footer-bar">
          <span className="kbd">research_id={rec.id}</span>
          <span className="grow" />
          <Link href={`/${org.slug}/research`}>← all research</Link>
          <Link href={`/${org.slug}/brain`}>open brain</Link>
        </footer>
      </article>
    </div>
  );
}
