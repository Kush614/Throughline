import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOrg } from '@/lib/orgs';
import '../room/room.css';
import './guide.css';

export const dynamic = 'force-dynamic';

const STEPS = [
  {
    h: 'Your team just works',
    p: 'Engineers and AI agents make decisions, do research, and ship code the way they already do. Nobody has to write status updates or fill in a wiki.',
  },
  {
    h: 'The room remembers — automatically',
    p: 'Every decision, finding, and hand-off is captured into shared memory (XTrace) as it happens. Nothing to log, nothing to maintain.',
  },
  {
    h: 'You ask in plain English',
    p: 'Open the room and ask things like “Why did we switch our payment provider?” You get a clear answer, traced to the work that produced it — no engineer required.',
  },
  {
    h: 'You see what changed, and why',
    p: 'Read a one-paragraph recap of any session, and watch decisions evolve — when a choice is replaced (e.g. PayPal → Stripe), the old one is struck through so you’re never working off stale info.',
  },
  {
    h: 'You ship context anywhere',
    p: 'Package a session into a portable “context image” and hand it to a new teammate, a contractor, or another agent — they pull it and are instantly up to speed.',
  },
];

export default async function GuidePage({ params }: { params: Promise<{ org: string }> }) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  return (
    <div className="guide-root gum">
      <header className="room-bar">
        <span className="room-brand"><span className="room-logo" /> Throughline</span>
        <span className="room-org">{org.name} room</span>
        <span className="room-actions">
          <Link className="room-devlink" href={`/${slug}/room`}>← back to room</Link>
        </span>
      </header>

      <main className="guide-main">
        <div className="guide-eyebrow">For PMs &amp; founders · no code required</div>
        <h1 className="guide-title">How you&apos;ll use the {org.name} room.</h1>
        <p className="guide-sub">
          Your engineers and agents do the work. You stay completely in the loop — in plain English,
          without reading code or interrupting anyone.
        </p>

        <div className="guide-steps">
          {STEPS.map((s, i) => (
            <div key={s.h} className="guide-step">
              <span className="guide-num">{i + 1}</span>
              <div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            </div>
          ))}
        </div>

        <Link className="guide-cta" href={`/${slug}/room`}>Enter the room →</Link>
      </main>
    </div>
  );
}
