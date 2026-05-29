import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { listDocs, createDoc, ensureBrainRoot } from '@/lib/docs';
import { listClaims } from '@/lib/file-claims';
import { publish } from '@/lib/events';
import { orgChannel } from '@/lib/research';

export const dynamic = 'force-dynamic';

// POST /api/orgs/:slug/github
// body: { requestedBy?, repo?, branch? }
// Bundles the recent room state into a "GitHub Bundle" subfile. Returns a
// compare URL the user can open to finish the PR by hand. We never push from
// the server — the bundle subfile IS the proof artifact.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { /* allow empty */ }

  const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy : 'user';
  const repo = typeof body.repo === 'string' && body.repo.trim()
    ? body.repo.trim()
    : 'ayushozha/neverzero-workspace';
  const branch = typeof body.branch === 'string' && body.branch.trim()
    ? body.branch.trim()
    : `nz/${org.slug}/${new Date().toISOString().slice(0, 10)}`;

  const root = await ensureBrainRoot(org.slug);
  const [allDocs, claims] = await Promise.all([
    listDocs({ orgSlug: org.slug }),
    listClaims({ orgSlug: org.slug, held: true }),
  ]);

  const subfiles = allDocs.filter((d) => d.kind === 'subfile' && d.skillRun?.status === 'done');
  const builds = subfiles.filter((d) => d.skillRun?.kind === 'build');
  const verifications = subfiles.filter((d) => d.skillRun?.kind === 'verify');
  const research = subfiles.filter((d) => d.skillRun?.kind === 'research');

  // Pull a stable file set from the most recent build's body.
  const latestBuild = builds[0];
  const filesFromBuild = latestBuild
    ? extractClaimedFiles(latestBuild.content)
    : [];

  const compareUrl = `https://github.com/${repo}/compare/main...${encodeURIComponent(branch)}`;
  const content = renderBundle({
    org: { slug: org.slug, name: org.name },
    repo, branch, compareUrl, requestedBy,
    filesFromBuild,
    builds: builds.slice(0, 3).map((d) => ({ id: d.id, title: d.title })),
    verifications: verifications.slice(0, 3).map((d) => ({ id: d.id, title: d.title })),
    research: research.slice(0, 3).map((d) => ({ id: d.id, title: d.title })),
    heldClaims: claims.map((c) => ({ filePath: c.filePath, agentName: c.agentName })),
  });

  const subfile = await createDoc({
    orgSlug: org.slug,
    parentId: root.id,
    title: `GitHub Bundle: ${branch}`,
    kind: 'subfile',
    content,
    createdBy: requestedBy,
    skillRun: {
      skillId: 'nz.github',
      command: '/github',
      kind: 'release',
      task: `Stage GitHub PR for ${repo}@${branch}`,
      requestedBy,
      mentionedAgents: [],
      status: 'done',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  });

  publish(orgChannel(org.slug), 'github.bundle_created', {
    docId: subfile.id, repo, branch, compareUrl, fileCount: filesFromBuild.length,
  });

  return NextResponse.json({
    ok: true,
    doc: subfile,
    compareUrl,
    bundle: {
      repo, branch,
      builds: builds.length,
      verifications: verifications.length,
      research: research.length,
      files: filesFromBuild,
      heldClaims: claims.length,
    },
  }, { status: 201 });
}

function extractClaimedFiles(content: string): string[] {
  // Build subfile has a "## Target files" block followed by a fenced code list.
  const m = /## Target files\s*\n+```\s*\n([\s\S]*?)\n```/i.exec(content);
  if (!m) return [];
  return m[1]!.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 16);
}

function renderBundle(input: {
  org: { slug: string; name: string };
  repo: string; branch: string; compareUrl: string; requestedBy: string;
  filesFromBuild: string[];
  builds: { id: string; title: string }[];
  verifications: { id: string; title: string }[];
  research: { id: string; title: string }[];
  heldClaims: { filePath: string; agentName: string }[];
}): string {
  const { org, repo, branch, compareUrl, requestedBy, filesFromBuild, builds, verifications, research, heldClaims } = input;
  const lines: string[] = [];
  lines.push(`> **/github** · provider \`neverzero\` · requested by ${requestedBy}`);
  lines.push(`> target: \`${repo}\` · branch: \`${branch}\``);
  lines.push('');
  lines.push('## Task');
  lines.push('');
  lines.push(`Stage a GitHub PR for ${org.name}.`);
  lines.push('');
  lines.push('## Output');
  lines.push('');
  lines.push(`Bundle ready for ${repo}. Open the compare view to finish the PR:`);
  lines.push('');
  lines.push(`→ **[Open compare on GitHub](${compareUrl})**`);
  lines.push('');

  if (heldClaims.length > 0) {
    lines.push('## ⚠ Open file claims');
    lines.push('');
    lines.push('Some agents still hold file claims. The PR will conflict at merge unless these release first.');
    lines.push('');
    for (const c of heldClaims.slice(0, 6)) {
      lines.push(`- \`${c.filePath}\` — held by @${c.agentName}`);
    }
    lines.push('');
  }

  lines.push('## Files in this bundle');
  lines.push('');
  if (filesFromBuild.length === 0) {
    lines.push('- _no build subfile yet — run \`/build\` to produce the file list_');
  } else {
    for (const f of filesFromBuild) lines.push(`- \`${f}\``);
  }
  lines.push('');

  lines.push('## Linked subfiles');
  lines.push('');
  lines.push(`**Research** (${research.length})`);
  if (research.length === 0) lines.push('- _none._');
  else for (const r of research) lines.push(`- [${r.title}](/${org.slug}/docs/${r.id})`);
  lines.push('');
  lines.push(`**Verifications** (${verifications.length})`);
  if (verifications.length === 0) lines.push('- _none._');
  else for (const v of verifications) lines.push(`- [${v.title}](/${org.slug}/docs/${v.id})`);
  lines.push('');
  lines.push(`**Builds** (${builds.length})`);
  if (builds.length === 0) lines.push('- _none._');
  else for (const b of builds) lines.push(`- [${b.title}](/${org.slug}/docs/${b.id})`);
  lines.push('');

  lines.push('## Next action');
  lines.push('');
  lines.push(`1. Open [the compare view](${compareUrl}).`);
  lines.push(`2. Title the PR: \`${org.name}: shipping work from ${new Date().toISOString().slice(0, 10)}\`.`);
  lines.push(`3. Paste the linked subfiles above into the PR description so reviewers see the full coordinated context.`);
  lines.push('');
  return lines.join('\n');
}
