import { NextResponse } from 'next/server';
import { createOrg, listOrgs, type OrgAgentId, type OrgPerson, type OrgMemory } from '@/lib/orgs';

export async function GET() {
  const orgs = await listOrgs();
  return NextResponse.json({ orgs });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const name = typeof body.name === 'string' ? body.name : '';
  if (!name.trim()) {
    return NextResponse.json({ error: 'Field "name" is required.' }, { status: 400 });
  }

  try {
    const org = await createOrg({
      name,
      tagline: typeof body.tagline === 'string' ? body.tagline : undefined,
      mission: typeof body.mission === 'string' ? body.mission : undefined,
      industry: typeof body.industry === 'string' ? body.industry : undefined,
      stage: typeof body.stage === 'string' ? body.stage : undefined,
      founded: typeof body.founded === 'string' ? body.founded : undefined,
      hq: typeof body.hq === 'string' ? body.hq : undefined,
      people: Array.isArray(body.people) ? (body.people as OrgPerson[]) : undefined,
      agentRoster: Array.isArray(body.agentRoster)
        ? (body.agentRoster as OrgAgentId[]) : undefined,
      memories: Array.isArray(body.memories) ? (body.memories as OrgMemory[]) : undefined,
    });
    return NextResponse.json({ org }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
