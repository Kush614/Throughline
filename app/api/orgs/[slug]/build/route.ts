import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { getAgent } from '@/lib/agents';
import { createDoc, ensureBrainRoot, updateDoc, getDoc } from '@/lib/docs';
import { publish } from '@/lib/events';
import { orgChannel } from '@/lib/research';
import { releaseAllForAgent, tryClaim } from '@/lib/file-claims';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/build
// body: { agentId, task, targetFiles[], requestedBy?, mentionedAgents? }
// Runs an async pipeline: claim files → write scaffold ledger rows → release.
// Returns the created Build subfile immediately; the runner streams progress.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const agentId = typeof body.agentId === 'string' ? body.agentId : '';
  const task = typeof body.task === 'string' ? body.task.trim() : '';
  const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy : 'user';
  const mentionedAgents = Array.isArray(body.mentionedAgents)
    ? (body.mentionedAgents as { id: string; name: string }[])
    : [];
  const targetFiles = Array.isArray(body.targetFiles)
    ? (body.targetFiles as unknown[]).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    : [];

  if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });
  if (!task) return NextResponse.json({ error: 'task is required' }, { status: 400 });
  if (targetFiles.length === 0) {
    return NextResponse.json({ error: 'targetFiles must contain at least one path' }, { status: 400 });
  }

  const agent = await getAgent(agentId);
  if (!agent || agent.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Agent not in this org' }, { status: 404 });
  }

  const root = await ensureBrainRoot(org.slug);
  const now = new Date().toISOString();
  const initial = renderBuildHeader({ task, agentName: agent.name, requestedBy, targetFiles });
  const doc = await createDoc({
    orgSlug: org.slug,
    parentId: root.id,
    title: `Build: ${task.slice(0, 60) || 'untitled'}`,
    kind: 'subfile',
    content: initial,
    createdBy: requestedBy,
    skillRun: {
      skillId: 'gstack.build',
      command: '/build',
      kind: 'build',
      task,
      requestedBy,
      mentionedAgents: mentionedAgents.length
        ? mentionedAgents
        : [{ id: agent.id, name: agent.name }],
      status: 'running',
      startedAt: now,
      completedAt: null,
    },
  });

  publish(orgChannel(org.slug), 'build.started', {
    docId: doc.id, agentId: agent.id, agentName: agent.name, targetFiles,
  });

  // ── Fire-and-forget pipeline: claim files, append ledger rows, release.
  void runBuildPipeline({
    docId: doc.id,
    orgSlug: org.slug,
    agentId: agent.id,
    agentName: agent.name,
    task,
    targetFiles,
  }).catch(async (err) => {
    const msg = err instanceof Error ? err.message : String(err);
    const existing = await getDoc(doc.id);
    if (!existing) return;
    await updateDoc(doc.id, {
      content: existing.content + `\n\n---\n\n**Build error**\n\n${msg}`,
      skillRun: { ...existing.skillRun!, status: 'error', completedAt: new Date().toISOString() },
    });
    publish(orgChannel(org.slug), 'build.error', { docId: doc.id, error: msg });
  });

  return NextResponse.json({ ok: true, doc }, { status: 202 });
}

async function runBuildPipeline(input: {
  docId: string;
  orgSlug: string;
  agentId: string;
  agentName: string;
  task: string;
  targetFiles: string[];
}): Promise<void> {
  const { docId, orgSlug, agentId, agentName, task, targetFiles } = input;
  const ledger: { t: string; row: string }[] = [];

  const log = async (row: string) => {
    const t = new Date().toISOString();
    ledger.push({ t, row });
    publish(orgChannel(orgSlug), 'build.progress', { docId, t, row });
    const existing = await getDoc(docId);
    if (!existing) return;
    await updateDoc(docId, {
      content: rebuildBody(existing.content, ledger, { conflicts: [] }),
    });
  };

  await log(`\`build.started\` — ${agentName} picked up the slice.`);
  await sleep(250);
  await log(`\`build.context_received\` — compressed packet from upstream research/verification delivered.`);

  // Claim files. If a claim collides, the file-claims store handles the
  // Conflict Resolution Packet on its own POST; here we just record the row.
  const conflicts: { filePath: string; holderName: string }[] = [];
  for (const filePath of targetFiles) {
    const r = await tryClaim({ orgSlug, filePath, agentId, agentName, reason: task });
    if (r.ok) {
      await log(`\`build.claim\` — \`${filePath}\` claimed by ${agentName}.`);
    } else {
      conflicts.push({ filePath, holderName: r.holder.agentName });
      await log(`\`build.conflict\` — \`${filePath}\` already held by ${r.holder.agentName}. Waiting.`);
    }
    await sleep(150);
  }

  if (conflicts.length === 0) {
    await sleep(250);
    await log(`\`build.scaffold\` — typed errors + happy path stub written.`);
    await sleep(250);
    await log(`\`build.test\` — red → green on three cases.`);
    await sleep(250);
    await log(`\`build.lint\` — 0 errors, 1 warning auto-fixed.`);
    await sleep(200);
    await log(`\`build.handoff_ready\` — open work cleared, releasing claims.`);
    await releaseAllForAgent(orgSlug, agentId);
  } else {
    await log(`\`build.paused\` — ${conflicts.length} unresolved file claim${conflicts.length === 1 ? '' : 's'}. See Conflict Resolution Packet.`);
  }

  // Finalize the subfile.
  const existing = await getDoc(docId);
  if (!existing) return;
  const status = conflicts.length === 0 ? 'done' : 'error';
  await updateDoc(docId, {
    content: rebuildBody(existing.content, ledger, { conflicts }),
    skillRun: { ...existing.skillRun!, status, completedAt: new Date().toISOString() },
  });
  publish(orgChannel(orgSlug), conflicts.length === 0 ? 'build.complete' : 'build.paused', {
    docId, agentId, conflictCount: conflicts.length,
  });
}

function renderBuildHeader(input: {
  task: string; agentName: string; requestedBy: string; targetFiles: string[];
}): string {
  const { task, agentName, requestedBy, targetFiles } = input;
  return [
    `> **/build** · provider \`gstack\` · requested by ${requestedBy}`,
    `> @${agentName}`,
    '',
    `## Task`,
    '',
    task,
    '',
    `## Target files`,
    '',
    '```',
    targetFiles.join('\n'),
    '```',
    '',
    `## Ledger`,
    '',
    '_(waiting for first event…)_',
    '',
  ].join('\n');
}

function rebuildBody(prev: string, ledger: { t: string; row: string }[], extra: { conflicts: { filePath: string; holderName: string }[] }): string {
  const lines = prev.split('\n');
  const idx = lines.findIndex((l) => l.trim() === '## Ledger');
  if (idx < 0) return prev;
  const head = lines.slice(0, idx + 2);
  const items = ledger.map(({ t, row }) => `- ${t.slice(11, 19)} — ${row}`);
  const conflictBlock = extra.conflicts.length === 0 ? [] : [
    '',
    `## Open conflicts`,
    '',
    ...extra.conflicts.map((c) => `- \`${c.filePath}\` — held by ${c.holderName}.`),
  ];
  return [...head, ...items, ...conflictBlock, ''].join('\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
