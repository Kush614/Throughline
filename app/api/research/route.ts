import { NextResponse } from 'next/server';
import { listResearch, startResearch } from '@/lib/research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const org = url.searchParams.get('org') || undefined;
  const items = await listResearch(org ? { orgSlug: org } : undefined);
  return NextResponse.json({ research: items });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const topic = typeof body.topic === 'string' ? body.topic : '';
  const orgSlug = typeof body.org === 'string' ? body.org : typeof body.orgSlug === 'string' ? body.orgSlug : '';
  const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy : 'user';

  if (!topic.trim()) return NextResponse.json({ error: 'Field "topic" is required.' }, { status: 400 });
  if (!orgSlug.trim()) return NextResponse.json({ error: 'Field "org" (slug) is required.' }, { status: 400 });

  try {
    const rec = await startResearch({ topic, orgSlug: orgSlug.trim().toLowerCase(), requestedBy });
    return NextResponse.json({ research: rec }, { status: 202 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
