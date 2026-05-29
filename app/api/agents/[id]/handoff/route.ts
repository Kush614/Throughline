import { NextResponse } from 'next/server';
import { authenticateAgentKey, recordHeartbeat } from '@/lib/agents';
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

function stringField(body: Record<string, unknown>, camel: string, snake: string = camel): string {
  const value = body[camel] ?? body[snake];
  return typeof value === 'string' ? value.trim() : '';
}

function listField(body: Record<string, unknown>, camel: string, snake: string = camel): string[] {
  const value = body[camel] ?? body[snake];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agent = await authenticateAgentKey(bearerToken(req));

  if (!agent) {
    return NextResponse.json({ error: 'Missing or invalid agent API key.' }, { status: 401 });
  }
  if (agent.id !== id) {
    return NextResponse.json({ error: 'Agent key does not match this handoff endpoint.' }, { status: 403 });
  }
  if (!agent.scopes.includes('write')) {
    return NextResponse.json({ error: 'Agent key is missing write scope.' }, { status: 403 });
  }

  const body = await readBody(req);
  const sessionId = stringField(body, 'sessionId', 'session_id');
  const goal = stringField(body, 'goal');
  const currentState = stringField(body, 'currentState', 'current_state');
  const completedWork = listField(body, 'completedWork', 'completed_work');
  const openBlockers = listField(body, 'openBlockers', 'open_blockers');
  const filesTouched = listField(body, 'filesTouched', 'files_touched');
  const decisionsMade = listField(body, 'decisionsMade', 'decisions_made');
  const nextAction = stringField(body, 'nextAction', 'next_action');

  if (!goal && !currentState && !nextAction && completedWork.length === 0) {
    return NextResponse.json(
      { error: 'Handoff requires at least goal, currentState, completedWork, or nextAction.' },
      { status: 400 },
    );
  }

  await recordHeartbeat(id, {
    sessionId,
    currentTask: goal || agent.metadata.current_task,
    status: 'handoff',
    metadata: {
      last_handoff_goal: goal,
      last_handoff_next_action: nextAction,
    },
  });

  const event = await appendWorkspaceEvent({
    type: 'handoff_created',
    orgSlug: agent.orgSlug,
    agentId: agent.id,
    sessionId,
    summary: goal ? `${agent.name} handoff: ${goal}.` : `${agent.name} wrote a handoff.`,
    metadata: {
      agent_name: agent.name,
      agent_from: agent.from,
      runtime: agent.platform.runtime ?? agent.from,
      machine: agent.platform.machine,
      goal,
      current_state: currentState,
      completed_work: completedWork,
      open_blockers: openBlockers,
      files_touched: filesTouched,
      decisions_made: decisionsMade,
      next_action: nextAction,
    },
  });

  return NextResponse.json({
    handoff: {
      id: event.id,
      createdAt: event.createdAt,
      agentId: agent.id,
      sessionId,
      goal,
      currentState,
      completedWork,
      openBlockers,
      filesTouched,
      decisionsMade,
      nextAction,
    },
  }, { status: 201 });
}
