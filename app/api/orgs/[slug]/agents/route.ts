import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const agents = await listAgents({ orgSlug: org.slug });
  return NextResponse.json({
    agents: agents.map((a) => ({
      id: a.id, name: a.name, from: a.from, status: a.status,
      apiKeyPrefix: a.apiKeyPrefix, platform: a.platform,
    })),
  });
}
