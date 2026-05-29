import { NextResponse } from 'next/server';
import { markVerified, type Agent } from '@/lib/agents';

function publicAgent(agent: Agent) {
  const { apiKeyHash: _apiKeyHash, scopes: _scopes, ...safe } = agent;
  void _apiKeyHash;
  void _scopes;
  return safe;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const updated = await markVerified(id);
  if (!updated) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  return NextResponse.json({ agent: publicAgent(updated) });
}
