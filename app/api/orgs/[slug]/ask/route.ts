import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { askWorkspace } from '@/lib/adapters/xtrace';
import { xtraceConfigured } from '@/lib/xtrace';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/ask
// body: { question: string, sessionId?: string }
// Natural-language Q&A over the workspace's XTrace memory. The human-facing
// "Ask Mission Control" path — returns a sourced answer anyone can read.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  if (!xtraceConfigured()) {
    return NextResponse.json(
      { error: 'XTrace is not configured. Set XTRACE_API_KEY and XTRACE_ORG_ID.' },
      { status: 503 },
    );
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { /* allow empty */ }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return NextResponse.json({ error: 'question is required' }, { status: 400 });
  const sessionId = typeof body.sessionId === 'string' && body.sessionId.trim() ? body.sessionId.trim() : undefined;

  const result = await askWorkspace(org.slug, question, { sessionId });
  return NextResponse.json(result);
}
