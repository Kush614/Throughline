import { NextResponse } from 'next/server';
import { authenticateAgentKey, listAgents, type Agent } from '@/lib/agents';
import { listAgentMessages, type AgentMessage } from '@/lib/agent-messages';
import { getOrg, type Org } from '@/lib/orgs';
import { recallMemory, type MemoryView } from '@/lib/adapters/xtrace';
import { appendWorkspaceEvent, readRecentWorkspaceEvents, type WorkspaceEvent } from '@/lib/workspace-ledger';

export const runtime = 'nodejs';

function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

function agentView(agent: Agent) {
  return {
    id: agent.id,
    name: agent.name,
    from: agent.from,
    ownedBy: agent.ownedBy,
    workspace: agent.workspace,
    status: agent.status,
    lastSeenAt: agent.lastSeenAt,
    apiKeyPrefix: agent.apiKeyPrefix,
    platform: agent.platform,
    metadata: agent.metadata,
  };
}

function agentMetadata(agent: Agent, key: string): string {
  return agent.metadata[key] ?? '';
}

function openTasksFromAgents(agents: Agent[]) {
  return agents
    .filter((agent) => agent.status === 'connected')
    .map((agent) => ({
      agentId: agent.id,
      agentName: agent.name,
      runtime: agent.platform.runtime ?? agent.from,
      sessionId: agentMetadata(agent, 'session_id'),
      task: agentMetadata(agent, 'current_task'),
      status: agentMetadata(agent, 'heartbeat_status') || agent.status,
      updatedAt: agent.lastSeenAt,
    }))
    .filter((task) => task.task);
}

function handoffsFromEvents(events: WorkspaceEvent[]) {
  return events
    .filter((event) => event.type === 'handoff_created')
    .map((event) => ({
      id: event.id,
      agentId: event.agentId,
      sessionId: event.sessionId,
      summary: event.summary,
      createdAt: event.createdAt,
      goal: event.metadata.goal,
      currentState: event.metadata.current_state,
      completedWork: event.metadata.completed_work,
      openBlockers: event.metadata.open_blockers,
      filesTouched: event.metadata.files_touched,
      decisionsMade: event.metadata.decisions_made,
      nextAction: event.metadata.next_action,
    }));
}

function blockersFromEvents(events: WorkspaceEvent[]) {
  return events
    .flatMap((event) => {
      if (event.type === 'failure') return [event.summary];
      if (event.type !== 'handoff_created') return [];
      const blockers = event.metadata.open_blockers;
      if (Array.isArray(blockers)) return blockers.map((item) => String(item));
      if (typeof blockers === 'string' && blockers.trim()) return [blockers];
      return [];
    })
    .filter(Boolean);
}

function buildColdStartSummary({
  agent,
  org,
  agents,
  recentEvents,
  agentMessages,
  memories,
}: {
  agent: Agent;
  org?: Org;
  agents: Agent[];
  recentEvents: WorkspaceEvent[];
  agentMessages: AgentMessage[];
  memories: MemoryView[];
}): string {
  const workspaceName = org?.name ?? agent.workspace;
  const memoryLines = memories.length
    ? memories.slice(0, 12).map((m) => `- ${m.kind}${m.superseded ? ' (superseded)' : ''}: ${m.text}`)
    : ['- No durable workspace memory in XTrace yet.'];
  const peerLines = agents
    .filter((peer) => peer.id !== agent.id && peer.status !== 'revoked')
    .slice(0, 8)
    .map((peer) => `- ${peer.name} (${peer.from}, ${peer.status}, last seen ${peer.lastSeenAt ?? 'never'})`);
  const taskLines = openTasksFromAgents(agents).slice(0, 8).map((task) => (
    `- ${task.agentName}: ${task.task}`
  ));
  const handoffLines = handoffsFromEvents(recentEvents).slice(0, 5).map((handoff) => (
    `- ${handoff.summary} (${handoff.createdAt})`
  ));
  const blockerLines = blockersFromEvents(recentEvents).slice(0, 5).map((blocker) => `- ${blocker}`);
  const messageLines = agentMessages.slice(0, 5).map((message) => (
    `- ${message.fromAgentName} -> ${message.toAgentName ?? 'workspace'}: ${message.summary} (${message.createdAt})`
  ));

  return [
    `Throughline workspace: ${workspaceName} (${agent.orgSlug}).`,
    org?.tagline ? `Tagline: ${org.tagline}` : '',
    org?.mission ? `Mission: ${org.mission}` : '',
    `Requesting agent: ${agent.name} (${agent.from}, id ${agent.id}).`,
    `Runtime identity: ${agent.platform.runtime ?? agent.from} on ${agent.platform.machine ?? 'unknown machine'}.`,
    'Pinned memory:',
    ...memoryLines,
    'Active peers:',
    ...(peerLines.length ? peerLines : ['- No other non-revoked agents are active yet.']),
    'Open tasks:',
    ...(taskLines.length ? taskLines : ['- No active agent task is currently reported.']),
    'Recent handoffs:',
    ...(handoffLines.length ? handoffLines : ['- No handoff has been written yet.']),
    'Recent agent-to-agent context:',
    ...(messageLines.length ? messageLines : ['- No peer context packets have been shared yet.']),
    'Open blockers:',
    ...(blockerLines.length ? blockerLines : ['- No blockers reported in the workspace ledger.']),
    'Protocol: fetch this context before work in every new session, heartbeat every 60 seconds while active, use the agent message relay for live peer context, and write a handoff before stopping when the client has that capability.',
  ].filter(Boolean).join('\n');
}

async function handle(req: Request) {
  const agent = await authenticateAgentKey(bearerToken(req));
  if (!agent) {
    return NextResponse.json({ error: 'Missing or invalid agent API key.' }, { status: 401 });
  }
  if (!agent.scopes.includes('read')) {
    return NextResponse.json({ error: 'Agent key is missing read scope.' }, { status: 403 });
  }

  const origin = new URL(req.url).origin;
  const [org, agents, memories] = await Promise.all([
    getOrg(agent.orgSlug),
    listAgents({ orgSlug: agent.orgSlug }),
    recallMemory(agent.orgSlug, { limit: 40 }),
  ]);
  const contextEvent = await appendWorkspaceEvent({
    type: 'context_fetch',
    orgSlug: agent.orgSlug,
    agentId: agent.id,
    sessionId: agent.metadata.session_id,
    summary: `${agent.name} fetched cold-start context.`,
    metadata: {
      agent_name: agent.name,
      agent_from: agent.from,
      runtime: agent.platform.runtime,
      machine: agent.platform.machine,
      api_key_prefix: agent.apiKeyPrefix,
    },
  });
  const recentEvents = readRecentWorkspaceEvents({ orgSlug: agent.orgSlug, limit: 40 });
  const activeAgents = agents.filter((a) => a.status !== 'revoked').map(agentView);
  const openTasks = openTasksFromAgents(agents);
  const handoffs = handoffsFromEvents(recentEvents);
  const blockers = blockersFromEvents(recentEvents);
  const agentMessages = listAgentMessages({ orgSlug: agent.orgSlug, agentId: agent.id, limit: 10 });

  return NextResponse.json({
    workspace: {
      slug: org?.slug ?? agent.orgSlug,
      name: org?.name ?? agent.workspace,
      domain: org?.domain ?? `${agent.orgSlug}.neverzero.local`,
      tagline: org?.tagline ?? '',
      mission: org?.mission ?? '',
      industry: org?.industry ?? '',
      stage: org?.stage ?? '',
      founded: org?.founded ?? '',
      hq: org?.hq ?? '',
      people: org?.people ?? [],
      pinnedMemories: memories,
    },
    requestingAgent: agentView(agent),
    activeAgents,
    openTasks,
    blockers,
    handoffs,
    agentMessages,
    decisions: [
      ...memories
        .filter((m) => m.kind.toLowerCase() === 'decision')
        .map((m) => ({ kind: 'decision', text: m.text, createdAt: m.createdAt, superseded: m.superseded, id: m.id })),
      ...recentEvents
        .filter((event) => event.type === 'decision')
        .map((event) => ({
          kind: 'decision',
          text: event.summary,
          createdAt: event.createdAt,
          agentId: event.agentId,
        })),
    ],
    ledger: {
      recentEvents,
      contextFetchEventId: contextEvent.id,
    },
    coldStartSummary: buildColdStartSummary({ agent, org, agents, recentEvents, agentMessages, memories }),
    protocol: {
      version: 'neverzero-single-prompt-bootstrap-v1',
      requiredFirstAction:
        'Before analysis, code changes, tool calls, or answers in every new session, fetch this context with the agent API key and read coldStartSummary plus workspace state.',
      authHeader: 'Authorization: Bearer <NEVERZERO_API_KEY>',
      contextUrl: `${origin}/api/context`,
      heartbeatUrl: `${origin}/api/agents/${agent.id}/heartbeat`,
      handoffUrl: `${origin}/api/agents/${agent.id}/handoff`,
      agentMessagesUrl: `${origin}/api/orgs/${agent.orgSlug}/agent-messages`,
      heartbeatIntervalSeconds: 60,
      identityFields: [
        'agent_id',
        'agent_name',
        'agent_from',
        'workspace',
        'machine',
        'runtime',
        'session_id',
        'capabilities',
        'current_task',
        'project_path',
        'status',
        'parent_agent_id',
        'last_heartbeat_at',
      ],
    },
  });
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
