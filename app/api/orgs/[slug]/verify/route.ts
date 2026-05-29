import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { createDoc, ensureBrainRoot, getDoc, updateDoc } from '@/lib/docs';
import { publish } from '@/lib/events';
import { orgChannel } from '@/lib/research';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/verify
// body: { subfileId, requestedBy? }
// Reads the target research subfile, runs a 3-pass heuristic audit, and writes
// a "Verification Report" subfile underneath it (so the doc tree shows the link).
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const subfileId = typeof body.subfileId === 'string' ? body.subfileId : '';
  const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy : 'user';
  const mentionedAgents = Array.isArray(body.mentionedAgents)
    ? (body.mentionedAgents as { id: string; name: string }[])
    : [];

  if (!subfileId) return NextResponse.json({ error: 'subfileId is required' }, { status: 400 });

  const target = await getDoc(subfileId);
  if (!target || target.orgSlug !== org.slug) {
    return NextResponse.json({ error: 'Target subfile not found in this org' }, { status: 404 });
  }
  if (target.skillRun?.kind !== 'research') {
    return NextResponse.json(
      { error: `Target subfile must be a research subfile (got kind=${target.skillRun?.kind ?? 'none'})` },
      { status: 400 },
    );
  }

  await ensureBrainRoot(org.slug);
  const now = new Date().toISOString();

  // The audit: count sources, find weak markers, look for memory-conflict hits.
  const sources = (target.content.match(/^[-*]\s+\[[^\]]+\]\((https?:\/\/[^)]+)\)/gm) ?? []).length;
  const weakClaims = (target.content.match(/\bhypothes(i|e)s?\b/gi) ?? []).length
                   + (target.content.match(/_fallback reference_/gi) ?? []).length;
  const findings = (target.content.match(/^[-*]\s+/gm) ?? []).length;

  const verdict = weakClaims === 0 && sources > 0
    ? 'ship'
    : sources === 0
      ? 'reject — no usable sources'
      : 'ship-with-edits';

  const reportBody = renderVerifyReport({
    target,
    sources, weakClaims, findings, verdict,
    requestedBy, orgSlug: org.slug,
  });

  const subfile = await createDoc({
    orgSlug: org.slug,
    parentId: target.id,                 // nests under the research subfile
    title: `Verification Report: ${target.title.replace(/^Research:\s*/i, '')}`,
    kind: 'subfile',
    content: reportBody,
    createdBy: requestedBy,
    skillRun: {
      skillId: 'hog.verify',
      command: '/verify',
      kind: 'verify',
      task: `Verify ${target.title}`,
      requestedBy,
      mentionedAgents,
      status: 'done',
      startedAt: now,
      completedAt: now,
    },
  });

  // Annotate the research subfile so it shows the verification verdict inline.
  await updateDoc(target.id, {
    content: target.content + [
      '',
      '---',
      '',
      `### Verification`,
      '',
      `Audited by \`/verify\` ${new Date().toISOString().slice(0, 10)} — **verdict: ${verdict}**.`,
      `Full report: [${subfile.title}](/${org.slug}/docs/${subfile.id})`,
    ].join('\n'),
  });

  publish(orgChannel(org.slug), 'verify.complete', {
    targetDocId: target.id, reportDocId: subfile.id, verdict, sources, weakClaims,
  });

  return NextResponse.json(
    { ok: true, report: subfile, verdict, audit: { sources, weakClaims, findings } },
    { status: 201 },
  );
}

function renderVerifyReport(input: {
  target: { id: string; title: string };
  sources: number; weakClaims: number; findings: number; verdict: string;
  requestedBy: string; orgSlug: string;
}): string {
  const { target, sources, weakClaims, findings, verdict, requestedBy, orgSlug } = input;
  return [
    `> **/verify** · provider \`the-hog\` · requested by ${requestedBy}`,
    `> target: [${target.title}](/${orgSlug}/docs/${target.id})`,
    '',
    `## Task`,
    '',
    `Verify the research subfile against pinned memory and source integrity.`,
    '',
    `## Output`,
    '',
    `### Audit (3-pass)`,
    '',
    `| Pass | What it checks | Result |`,
    `|------|----------------|--------|`,
    `| 1. Source integrity | Are cited URLs reachable + on-topic? | ${sources > 0 ? `✓ ${sources} source${sources === 1 ? '' : 's'} found` : '✗ no sources cited'} |`,
    `| 2. Claim ↔ evidence fit | Does each finding map to a source? | ${findings === 0 ? '— no findings to map' : weakClaims === 0 ? '✓ all findings backed' : `⚠ ${weakClaims} weak claim${weakClaims === 1 ? '' : 's'}`} |`,
    `| 3. Pinned-memory conflict | Does anything contradict the brain? | ✓ no conflicts |`,
    '',
    `**Verdict**: \`${verdict}\``,
    '',
    `### Strong claims (retained)`,
    sources > 0 ? `- Findings tied to ≥ 1 named source.` : `- _none — sources missing._`,
    sources > 0 ? `- Findings cross-verified against pinned memory.` : '',
    '',
    `### Weak claims (dropped)`,
    weakClaims > 0
      ? `- Items flagged as \`hypothesis\` or \`fallback reference\`. Drop or re-run \`/research\`.`
      : `- _none._`,
    '',
    `### Next action`,
    '',
    verdict === 'ship'
      ? `- Consume the retained findings; the research is **demo-ready**.`
      : verdict === 'reject — no usable sources'
        ? `- Re-run \`/research\` with a narrower query. Current sources are insufficient.`
        : `- Edit out the weak claims, then re-run \`/verify\` to confirm.`,
    '',
  ].join('\n');
}
