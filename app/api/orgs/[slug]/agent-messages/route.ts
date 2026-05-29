import { NextResponse } from 'next/server';
import { createAgentMessage, listAgentMessages, type AgentMessageKind } from '@/lib/agent-messages';
import { authenticateAgentKey, getAgent } from '@/lib/agents';
import { publish } from '@/lib/events';
import { getOrg } from '@/lib/orgs';
import { orgChannel } from '@/lib/research';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = new Set<AgentMessageKind>(['context', 'handoff', 'question', 'status', 'decision']);

function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function stringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

async function authenticatedAgent(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  return authenticateAgentKey(token);
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const agent = await authenticatedAgent(req);
  if (!agent) return NextResponse.json({ error: 'Missing or invalid agent API key.' }, { status: 401 });
  if (agent && agent.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Agent key belongs to another workspace.' }, { status: 403 });
  }

  const url = new URL(req.url);
  const requestedAgentId = url.searchParams.get('agentId')?.trim();
  if (requestedAgentId && requestedAgentId !== agent.id) {
    return NextResponse.json({ error: 'Agent key cannot read another direct inbox.' }, { status: 403 });
  }

  const messages = listAgentMessages({
    orgSlug: org.slug,
    agentId: agent.id,
    limit: Number(url.searchParams.get('limit') ?? 20),
  });

  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const agent = await authenticatedAgent(req);
  if (!agent) return NextResponse.json({ error: 'Missing or invalid agent API key.' }, { status: 401 });
  if (agent.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Agent key belongs to another workspace.' }, { status: 403 });
  }
  if (!agent.scopes.includes('write')) {
    return NextResponse.json({ error: 'Agent key is missing write scope.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });

  const fromAgentId = stringOrNull(body.fromAgentId ?? body.agent_id ?? body.agentId);
  if (fromAgentId && fromAgentId !== agent.id) {
    return NextResponse.json({ error: 'Agent key cannot send as another agent.' }, { status: 403 });
  }

  const toAgentId = stringOrNull(body.toAgentId ?? body.to_agent_id);
  const toAgent = toAgentId ? await getAgent(toAgentId) : undefined;
  if (toAgentId && (!toAgent || toAgent.orgSlug !== org.slug || toAgent.status === 'revoked')) {
    return NextResponse.json({ error: 'Recipient agent not found in this workspace.' }, { status: 404 });
  }

  const rawKind = stringOrNull(body.kind);
  const kind = rawKind && KINDS.has(rawKind as AgentMessageKind)
    ? (rawKind as AgentMessageKind)
    : 'context';
  const message = await createAgentMessage({
    orgSlug: org.slug,
    fromAgentId: agent.id,
    fromAgentName: agent.name,
    toAgentId: toAgent?.id ?? null,
    toAgentName: toAgent?.name ?? null,
    kind,
    summary: body.summary,
    context: body.context,
    refs: body.refs,
    sessionId: stringOrNull(body.sessionId ?? body.session_id) ?? undefined,
  });

  publish(orgChannel(org.slug), 'agent.message', { message });

  return NextResponse.json({ message }, { status: 201 });
}
