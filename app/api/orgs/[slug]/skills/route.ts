import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { skillsForProviders, type ProviderId } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const providers = (org.providers ?? []) as ProviderId[];
  const skills = skillsForProviders(providers).map((s) => ({
    id: s.id, name: s.name, command: s.command,
    provider: s.provider, kind: s.kind, description: s.description,
  }));
  return NextResponse.json({ skills, providers });
}
