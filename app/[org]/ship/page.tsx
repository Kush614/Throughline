import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import { listSessions, defaultSession } from '@/lib/adapters/xtrace';
import { xtraceConfigured } from '@/lib/xtrace';
import ShipStage from './_components/ShipStage';
import './ship.css';

export const dynamic = 'force-dynamic';

export default async function ShipPage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const sessions = xtraceConfigured() ? await listSessions(slug) : [];

  return (
    <div className="ship-root gum">
      <header className="ship-bar">
        <span className="ship-brand"><span className="logo" /> Throughline</span>
        <span className="ship-org">{org.name} room</span>
        <Link className="ship-back" href={`/${slug}/room`}>← back to room</Link>
      </header>

      <main className="ship-main">
        <div className="ship-eyebrow">Ship a session · XTrace</div>
        <h1 className="ship-title">Ship this session like an image.</h1>
        <p className="ship-sub">
          Package a coding session&apos;s memory — decisions, findings, the whole story — into a
          portable context image. Pull it into any room to resume with zero context loss.
        </p>

        <ShipStage slug={slug} sessions={sessions} defaultSession={defaultSession(slug)} />
      </main>
    </div>
  );
}
