import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { buildContextImage } from '@/lib/adapters/xtrace';
import { xtraceConfigured } from '@/lib/xtrace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/pull?ref=<org>/<tag>&digest=sha256:...
// The other half of "ship": rebuild a session's context image so a new agent or
// machine can resume from it. ref maps to a workspace + session.
export async function GET(req: Request) {
  if (!xtraceConfigured()) {
    return NextResponse.json({ error: 'XTrace is not configured.' }, { status: 503 });
  }

  const url = new URL(req.url);
  const ref = (url.searchParams.get('ref') ?? '').trim();
  const wantDigest = (url.searchParams.get('digest') ?? '').trim();

  if (!ref.includes('/')) {
    return NextResponse.json({ error: 'ref must look like <org>/<tag>, e.g. codebase/index' }, { status: 400 });
  }
  const [slug, ...rest] = ref.split('/');
  const tag = rest.join('/');
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: `No workspace "${slug}"` }, { status: 404 });

  // Reconstruct the session id from the ref (ship tags strip the "<slug>-" prefix).
  const sessionId = tag === slug ? slug : `${slug}-${tag}`;
  const image = await buildContextImage(slug, sessionId);

  return NextResponse.json({
    ...image,
    requestedDigest: wantDigest || null,
    digestMatch: wantDigest ? wantDigest === image.digest : null,
  });
}
