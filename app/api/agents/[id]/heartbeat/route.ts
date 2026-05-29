import { NextResponse } from 'next/server';
import { authenticateAgentKey, recordHeartbeat, type Agent } from '@/lib/agents';
import { appendWorkspaceEvent } from '@/lib/workspace-ledger';

export const runtime = 'nodejs';

function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) return {};
  try {
    const body = (await req.json()) as unknown;
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseOs(value: unknown): Agent['platform']['os'] | undefined {
  return value === 'mac' || value === 'win' || value === 'linux' || value === 'wsl'
    ? value
    : undefined;
}

function publicAgent(agent: Agent) {
  const { apiKeyHash: _apiKeyHash, scopes: _scopes, ...safe } = agent;
  void _apiKeyHash;
  void _scopes;
  return safe;
}

function stringField(body: Record<string, unknown>, camel: string, snake: string = camel): string | undefined {
  const value = body[camel] ?? body[snake];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function capabilitiesField(body: Record<string, unknown>): string[] | string | undefined {
  const value = body.capabilities;
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await authenticateAgentKey(bearerToken(req));

  if (!agent) {
    return NextResponse.json({ error: 'Missing or invalid agent API key.' }, { status: 401 });
  }
  if (agent.id !== id) {
    return NextResponse.json({ error: 'Agent key does not match this heartbeat endpoint.' }, { status: 403 });
  }
  if (!agent.scopes.includes('write')) {
    return NextResponse.json({ error: 'Agent key is missing write scope.' }, { status: 403 });
  }

  const body = await readBody(req);
  const sessionId = stringField(body, 'sessionId', 'session_id');
  const currentTask = stringField(body, 'currentTask', 'current_task');
  const projectPath = stringField(body, 'projectPath', 'project_path');
  const runtime = stringField(body, 'runtime');
  const machine = stringField(body, 'machine');
  const status = stringField(body, 'status');
  const parentAgentId = stringField(body, 'parentAgentId', 'parent_agent_id');
  const capabilities = capabilitiesField(body);
  const updated = await recordHeartbeat(id, {
    sessionId,
    currentTask,
    projectPath,
    capabilities,
    runtime,
    machine,
    os: parseOs(body.os),
    status,
    metadata: body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
      ? { ...(body.metadata as Record<string, unknown>), parent_agent_id: parentAgentId }
      : { parent_agent_id: parentAgentId },
  });

  if (!updated) return NextResponse.json({ error: 'Agent not found.' }, { status: 404 });

  const event = await appendWorkspaceEvent({
    type: 'heartbeat',
    orgSlug: updated.orgSlug,
    agentId: updated.id,
    sessionId,
    summary: `${updated.name} heartbeat: ${status ?? 'working'}.`,
    metadata: {
      agent_name: updated.name,
      agent_from: updated.from,
      runtime,
      machine,
      os: body.os,
      current_task: currentTask,
      capabilities,
      project_path: projectPath,
      status,
      parent_agent_id: parentAgentId,
    },
  });

  return NextResponse.json({
    agent: publicAgent(updated),
    heartbeat: {
      at: updated.lastSeenAt,
      nextInSeconds: 60,
      eventId: event.id,
    },
  });
}
