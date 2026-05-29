import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';
import { createDoc, ensureBrainRoot, listDocs } from '@/lib/docs';
import { listResearch } from '@/lib/research';
import { listClaims } from '@/lib/file-claims';
import { publish } from '@/lib/events';
import { orgChannel } from '@/lib/research';
import { recallMemory, ingestMemorySafe, type MemoryView } from '@/lib/adapters/xtrace';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/resume
// body: { requestedBy?, goal? }
// Generates a Resume Packet subfile by snapshotting the room state:
//   - org mission + pinned memory
//   - latest research + verify + build subfiles
//   - active agents + held file claims
//   - recent decisions (completed subfiles)
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { /* allow empty */ }

  const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy : 'user';
  const goal = typeof body.goal === 'string' && body.goal.trim()
    ? body.goal.trim()
    : (org.mission || `Continue work on ${org.name}`);

  await ensureBrainRoot(org.slug);

  const [agents, allDocs, researchRecords, heldClaims, memories] = await Promise.all([
    listAgents({ orgSlug: org.slug }),
    listDocs({ orgSlug: org.slug }),
    listResearch({ orgSlug: org.slug }),
    listClaims({ orgSlug: org.slug, held: true }),
    recallMemory(org.slug, { limit: 12 }),
  ]);

  const subfiles = allDocs.filter((d) => d.kind === 'subfile');
  const recent = subfiles
    .filter((d) => d.skillRun)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, 8);
  const completed = recent.filter((d) => d.skillRun?.status === 'done');
  const running = recent.find((d) => d.skillRun?.status === 'running');

  const now = new Date().toISOString();
  const content = renderResumePacket({
    org, goal, agents, subfiles: recent, completed, running, research: researchRecords.slice(0, 3), heldClaims, memories,
  });

  const doc = await createDoc({
    orgSlug: org.slug,
    parentId: (await ensureBrainRoot(org.slug)).id,
    title: `Resume Packet: ${new Date(now).toISOString().slice(0, 16).replace('T', ' ')}Z`,
    kind: 'subfile',
    content,
    createdBy: requestedBy,
    skillRun: {
      skillId: 'nz.resume',
      command: '/resume',
      kind: 'resume',
      task: `Snapshot ${org.name} room state`,
      requestedBy,
      mentionedAgents: agents.slice(0, 5).map((a) => ({ id: a.id, name: a.name })),
      status: 'done',
      startedAt: now,
      completedAt: now,
    },
  });

  void ingestMemorySafe({
    orgSlug: org.slug,
    text: `Resume point — goal: ${goal}. ${completed.length} completed item(s), ${heldClaims.length} held claim(s)${running ? `, in progress: ${running.title}` : ''}.`,
    kind: 'resume',
    source: 'resume',
    command: '/resume',
    requestedBy,
    subfileId: doc.id,
    subfileTitle: doc.title,
  });

  publish(orgChannel(org.slug), 'resume.created', {
    docId: doc.id, requestedBy, agentCount: agents.length, completedCount: completed.length,
  });

  return NextResponse.json({ ok: true, doc }, { status: 201 });
}

function renderResumePacket(input: {
  org: { slug: string; name: string; mission: string };
  goal: string;
  agents: { id: string; name: string; status: string; parentAgentId?: string | null }[];
  subfiles: { id: string; title: string; createdAt: string; skillRun?: { command: string; status: string; requestedBy: string } }[];
  completed: { id: string; title: string; skillRun?: { command: string } }[];
  running: { id: string; title: string; skillRun?: { command: string } } | undefined;
  research: { id: string; topic: string; status: string; summary: string }[];
  heldClaims: { filePath: string; agentName: string }[];
  memories: MemoryView[];
}): string {
  const { org, goal, agents, completed, running, research, heldClaims, subfiles, memories } = input;
  const lines: string[] = [];

  lines.push(`> **/resume** · provider \`neverzero\` · ${new Date().toISOString()}`);
  lines.push(`> compressed via ZeroEntropy · persisted via XTrace memory`);
  lines.push('');
  lines.push('## Goal');
  lines.push('');
  lines.push(goal);
  lines.push('');

  lines.push('## Current state');
  if (running) {
    lines.push(`- 🔄 In progress: [${running.title}](/${org.slug}/docs/${running.id}) — ${running.skillRun?.command}`);
  } else {
    lines.push('- ✅ No agents are mid-task right now — safe pickup point.');
  }
  if (heldClaims.length > 0) {
    lines.push(`- 🔒 ${heldClaims.length} file claim${heldClaims.length === 1 ? '' : 's'} still held:`);
    for (const c of heldClaims.slice(0, 5)) {
      lines.push(`  - \`${c.filePath}\` — @${c.agentName}`);
    }
  } else {
    lines.push('- 🔓 No held file claims — write surface is free.');
  }
  lines.push('');

  lines.push('## Completed work (latest 8)');
  if (completed.length === 0) {
    lines.push('- _none yet — the room is fresh._');
  } else {
    for (const s of completed.slice(0, 8)) {
      lines.push(`- [${s.title}](/${org.slug}/docs/${s.id}) — \`${s.skillRun?.command ?? ''}\``);
    }
  }
  lines.push('');

  if (research.length > 0) {
    lines.push('## Research summary');
    for (const r of research) {
      lines.push(`- **${r.topic}** — ${r.summary.slice(0, 140) || '(no summary)'}`);
    }
    lines.push('');
  }

  lines.push('## Active agents');
  if (agents.length === 0) {
    lines.push('- _none registered._');
  } else {
    for (const a of agents.slice(0, 10)) {
      const parent = a.parentAgentId ? ` (child of ${a.parentAgentId})` : '';
      lines.push(`- @${a.name} — \`${a.status}\`${parent}`);
    }
  }
  lines.push('');

  if (memories.length > 0) {
    lines.push('## Durable memory (XTrace)');
    for (const m of memories.slice(0, 6)) {
      lines.push(`- **${m.kind}**${m.superseded ? ' _(superseded)_' : ''} — ${m.text}`);
    }
    lines.push('');
  }

  lines.push('## Open blockers');
  if (heldClaims.length > 0) {
    lines.push('- Resolve the held file claims above before writing to those paths.');
  } else if (running) {
    lines.push(`- Wait for [${running.title}](/${org.slug}/docs/${running.id}) to finish, then pick up.`);
  } else {
    lines.push('- _none._');
  }
  lines.push('');

  lines.push('## Next action');
  lines.push('');
  lines.push(
    running
      ? `Read [${running.title}](/${org.slug}/docs/${running.id}), then continue from the last \`build.handoff_ready\` row in the ledger.`
      : completed.length > 0
        ? `Open the most recent completed subfile, then propose the next \`@agent /skill\` from the command bar on \`/${org.slug}/brain\`.`
        : `Start with \`@iris /research <topic>\` to seed the room.`,
  );
  lines.push('');

  lines.push('---');
  lines.push(`_packet items: ${subfiles.length} subfile${subfiles.length === 1 ? '' : 's'} · ${agents.length} agent${agents.length === 1 ? '' : 's'} · ${heldClaims.length} held claim${heldClaims.length === 1 ? '' : 's'}_`);

  return lines.join('\n');
}
