import { NextResponse } from 'next/server';
import { createAgent, listAgents, type Agent, type ClientId } from '@/lib/agents';

function publicAgent(agent: Agent) {
  const { apiKeyHash: _apiKeyHash, scopes: _scopes, ...safe } = agent;
  void _apiKeyHash;
  void _scopes;
  return safe;
}

export async function GET() {
  const agents = await listAgents();
  return NextResponse.json({ agents: agents.map(publicAgent) });
}

const VALID_CLIENTS: ClientId[] = [
  'codex',
  'claude-desktop', 'claude-code', 'cursor', 'vscode', 'windsurf',
  'antigravity', 'zed', 'continue', 'aider', 'custom',
];

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name : '';
  const from = typeof body.from === 'string' ? (body.from as ClientId) : null;

  if (!name.trim()) {
    return NextResponse.json({ error: 'Field "name" is required.' }, { status: 400 });
  }
  if (!from || !VALID_CLIENTS.includes(from)) {
    return NextResponse.json(
      { error: 'Field "from" must be one of: ' + VALID_CLIENTS.join(', ') },
      { status: 400 },
    );
  }

  const orgSlug = typeof body.org === 'string' ? body.org
    : typeof body.orgSlug === 'string' ? body.orgSlug
    : '';
  if (!orgSlug.trim()) {
    return NextResponse.json({ error: 'Field "org" (slug) is required.' }, { status: 400 });
  }

  try {
    const result = await createAgent({
      name,
      from,
      orgSlug: orgSlug.trim().toLowerCase(),
      ownedBy: typeof body.ownedBy === 'string' ? body.ownedBy : undefined,
      workspace: typeof body.workspace === 'string' ? body.workspace : undefined,
      platform: typeof body.platform === 'object' && body.platform !== null
        ? (body.platform as Record<string, string>) : undefined,
      metadata: typeof body.metadata === 'object' && body.metadata !== null
        ? (body.metadata as Record<string, string>) : undefined,
    });
    return NextResponse.json({
      agent: publicAgent(result.agent),
      apiKey: result.apiKey,
      installSnippet: result.installSnippet,
    }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
