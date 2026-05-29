import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { buildContextImage, defaultSession } from '@/lib/adapters/xtrace';
import { xtraceConfigured } from '@/lib/xtrace';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/ship
// body: { sessionId?: string }
// Packages a coding session's XTrace memory into a portable "context image"
// (layers + digest + pull command) — ship a session like a Docker image.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  if (!xtraceConfigured()) {
    return NextResponse.json({ error: 'XTrace is not configured.' }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { /* allow empty */ }

  const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim()
    ? body.sessionId.trim()
    : defaultSession(slug);

  const image = await buildContextImage(slug, sessionId);
  return NextResponse.json(image);
}
