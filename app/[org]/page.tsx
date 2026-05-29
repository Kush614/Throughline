import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';
import { recallMemory } from '@/lib/adapters/xtrace';
import './org-home.css';

export const dynamic = 'force-dynamic';

export default async function OrgHomePage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const [agents, memories] = await Promise.all([
    listAgents({ orgSlug: org.slug }),
    recallMemory(org.slug, { limit: 100 }),
  ]);
  const counts = {
    total: agents.length,
    connected: agents.filter((a) => a.status === 'connected').length,
  };

  return (
    <div className="org-home-root gum">
      <section className="hero">
        <Link className="brand" href="/">
          <span className="logo" />
          <span className="name">Throughline</span>
        </Link>

        <div className="eyebrow">{org.domain.toUpperCase()}</div>
        <h1>{org.name}.</h1>
        {org.tagline && <p className="tag">{org.tagline}</p>}

        <div className="stat-row">
          <span><b>{memories.length}</b> memories in XTrace</span>
          <span><b>{counts.connected}</b> agents connected</span>
        </div>

        <div className="actions">
          <Link className="btn primary" href={`/${org.slug}/room`}>Enter the room →</Link>
          <Link className="btn ghost" href={`/${org.slug}/brain`}>Builder view</Link>
        </div>
      </section>
    </div>
  );
}
