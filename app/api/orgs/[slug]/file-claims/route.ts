import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { getAgent } from '@/lib/agents';
import { listClaims, releaseClaim, tryClaim } from '@/lib/file-claims';
import { createDoc, ensureBrainRoot } from '@/lib/docs';
import { publish } from '@/lib/events';
import { orgChannel } from '@/lib/research';

export const dynamic = 'force-dynamic';

// GET /api/orgs/:slug/file-claims?held=1
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  const url = new URL(req.url);
  const held = url.searchParams.get('held') === '1' ? true
             : url.searchParams.get('held') === '0' ? false
             : undefined;
  const claims = await listClaims({ orgSlug: org.slug, held });
  return NextResponse.json({ claims });
}

// POST /api/orgs/:slug/file-claims
// body: { agentId, filePath, reason }
// On conflict, creates a "Conflict Resolution Packet" subfile and returns 409.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const agentId = typeof body.agentId === 'string' ? body.agentId : '';
  const filePath = typeof body.filePath === 'string' ? body.filePath.trim() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  if (!filePath) return NextResponse.json({ error: 'filePath is required' }, { status: 400 });
  if (!reason) return NextResponse.json({ error: 'reason is required' }, { status: 400 });

  const agent = await getAgent(agentId);
  if (!agent || agent.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Agent not in this org' }, { status: 404 });
  }

  const result = await tryClaim({
    orgSlug: org.slug,
    filePath,
    agentId: agent.id,
    agentName: agent.name,
    reason,
  });

  if (result.ok) {
    publish(orgChannel(org.slug), 'file.claimed', {
      claimId: result.claim.id, filePath, agentId: agent.id, agentName: agent.name,
    });
    return NextResponse.json({ ok: true, claim: result.claim }, { status: 201 });
  }

  // ── Conflict: same file already held by a different agent.
  const root = await ensureBrainRoot(org.slug);
  const conflictBody = renderConflictPacket({
    filePath,
    incoming: { agentName: agent.name, reason },
    holder: { agentName: result.holder.agentName, reason: result.holder.reason, claimedAt: result.holder.claimedAt },
  });

  const subfile = await createDoc({
    orgSlug: org.slug,
    parentId: root.id,
    title: `Conflict Resolution Packet: ${filePath}`,
    kind: 'subfile',
    content: conflictBody,
    createdBy: 'system',
    skillRun: {
      skillId: 'nz.conflict',
      command: '/conflict',
      kind: 'compress',
      task: `file-level conflict on ${filePath}`,
      requestedBy: 'system',
      mentionedAgents: [
        { id: result.holder.agentId, name: result.holder.agentName },
        { id: agent.id, name: agent.name },
      ],
      status: 'done',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  publish(orgChannel(org.slug), 'file.conflict', {
    filePath,
    holder: { agentId: result.holder.agentId, name: result.holder.agentName },
    incoming: { agentId: agent.id, name: agent.name },
    packetDocId: subfile.id,
  });

  return NextResponse.json(
    {
      ok: false,
      conflict: {
        filePath,
        holder: result.holder,
        incoming: { agentId: agent.id, agentName: agent.name, reason },
        packetDocId: subfile.id,
      },
    },
    { status: 409 },
  );
}

// DELETE /api/orgs/:slug/file-claims?id=<claimId>
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });
  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  const released = await releaseClaim(id);
  if (!released) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  if (released.orgSlug !== org.slug) return NextResponse.json({ error: 'Wrong org' }, { status: 404 });
  publish(orgChannel(org.slug), 'file.released', { claimId: released.id, filePath: released.filePath });
  return NextResponse.json({ ok: true, claim: released });
}

function renderConflictPacket(input: {
  filePath: string;
  incoming: { agentName: string; reason: string };
  holder: { agentName: string; reason: string; claimedAt: string };
}): string {
  const { filePath, incoming, holder } = input;
  return [
    `> **/conflict** · provider \`neverzero\` · auto-generated`,
    `> @${holder.agentName} @${incoming.agentName}`,
    '',
    `## File`,
    '',
    `\`${filePath}\``,
    '',
    `## Summary`,
    '',
    `Both agents tried to edit \`${filePath}\` at the same time.`,
    `**${holder.agentName}** holds the claim (since ${holder.claimedAt}); **${incoming.agentName}** asked for it after.`,
    '',
    `## Blocker`,
    '',
    `Two writes to the same file would clobber each other before GitHub sees the change.`,
    '',
    `## What each side was doing`,
    '',
    `| Side | Agent | Intent |`,
    `|------|-------|--------|`,
    `| holding | @${holder.agentName} | ${holder.reason} |`,
    `| incoming | @${incoming.agentName} | ${incoming.reason} |`,
    '',
    `## Recommended resolution`,
    '',
    `1. Keep @${holder.agentName}'s edits first (it had the claim).`,
    `2. After it releases, @${incoming.agentName} re-applies their change against the new HEAD.`,
    `3. Both agents acknowledge this packet in the activity log; only then does the merged version reach GitHub.`,
    '',
    `## Next action`,
    '',
    `- @${incoming.agentName}: wait for \`file.released\` event.`,
    `- @${holder.agentName}: finish + release the claim.`,
    `- Workspace: this packet is the canonical record of the resolution — pin it via \`/remember\` if it sets precedent.`,
    '',
  ].join('\n');
}
