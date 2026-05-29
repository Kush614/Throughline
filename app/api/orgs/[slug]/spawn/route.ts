import { NextResponse } from 'next/server';
import { createAgent, getAgent, listSubagents, type ClientId } from '@/lib/agents';
import { getOrg } from '@/lib/orgs';
import { publish } from '@/lib/events';
import { orgChannel } from '@/lib/research';
import { runSkill } from '@/lib/skill-runner';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/spawn
// body: { parentAgentId, name, purpose, from? }
// Creates a child agent (status=pending) under the parent and writes a
// /spawn subfile documenting the slice of context the child inherits.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const parentAgentId = typeof body.parentAgentId === 'string' ? body.parentAgentId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : '';
  const from = typeof body.from === 'string' ? (body.from as ClientId) : 'custom';

  if (!parentAgentId) return NextResponse.json({ error: 'parentAgentId is required' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!purpose) return NextResponse.json({ error: 'purpose is required' }, { status: 400 });

  const parent = await getAgent(parentAgentId);
  if (!parent || parent.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Parent agent not in this org' }, { status: 404 });
  }

  const { agent } = await createAgent({
    name,
    from,
    orgSlug: org.slug,
    parentAgentId: parent.id,
    metadata: { spawned_for: purpose, parent_agent_name: parent.name },
  });

  publish(orgChannel(org.slug), 'agent.spawned', {
    agentId: agent.id, agentName: agent.name, parentAgentId: parent.id, purpose,
  });

  // Create a subfile that documents the spawn so the doc tree reflects it.
  const doc = await runSkill({
    orgSlug: org.slug,
    skillIdOrCommand: '/spawn',
    task: `${name} — ${purpose}`,
    requestedBy: parent.name,
    mentionedAgents: [{ id: parent.id, name: parent.name }, { id: agent.id, name: agent.name }],
  });

  const subagents = await listSubagents(parent.id);
  return NextResponse.json(
    {
      agent,
      subfile: { id: doc.id, title: doc.title },
      subagent_count: subagents.length,
    },
    { status: 201 },
  );
}

// GET /api/orgs/:slug/spawn?parent=<agentId> — list child agents for a parent.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const url = new URL(req.url);
  const parent = url.searchParams.get('parent');
  if (!parent) return NextResponse.json({ error: 'parent query param required' }, { status: 400 });

  const children = (await listSubagents(parent)).filter((a) => a.orgSlug === org.slug);
  return NextResponse.json({ children });
}
