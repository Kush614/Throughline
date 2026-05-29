import { NextResponse } from 'next/server';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getOrg, createOrg, slugify } from '@/lib/orgs';
import { indexRepo } from '@/lib/index-repo';
import { xtraceConfigured } from '@/lib/xtrace';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Only allow public https github/gitlab repos. No ssh, no file://, no localhost.
const REPO_URL = /^https:\/\/(?:www\.)?(?:github|gitlab)\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?\/?$/;

function parseRepo(url: string): { owner: string; repo: string } | null {
  if (!REPO_URL.test(url)) return null;
  const path = url.replace(/^https:\/\/(?:www\.)?(?:github|gitlab)\.com\//, '').replace(/\.git\/?$/, '').replace(/\/$/, '');
  const [owner, repo] = path.split('/');
  if (!owner || !repo) return null;
  return { owner, repo };
}

async function uniqueSlug(owner: string, repo: string): Promise<string> {
  const base = slugify(repo);
  if (!(await getOrg(base))) return base;
  const withOwner = slugify(`${owner}-${repo}`);
  if (!(await getOrg(withOwner))) return withOwner;
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

// POST /api/index-repo  body: { repoUrl }
// Shallow-clones a public repo, indexes it into a new Throughline workspace
// (README, tech stack, git history, structure), and returns the workspace slug.
export async function POST(req: Request) {
  if (!xtraceConfigured()) {
    return NextResponse.json({ error: 'XTrace is not configured.' }, { status: 503 });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const repoUrl = typeof body.repoUrl === 'string' ? body.repoUrl.trim() : '';
  const parsed = parseRepo(repoUrl);
  if (!parsed) {
    return NextResponse.json({ error: 'Enter a public GitHub or GitLab repo URL, e.g. https://github.com/owner/repo' }, { status: 400 });
  }

  const slug = await uniqueSlug(parsed.owner, parsed.repo);
  const name = parsed.repo;
  const cloneUrl = `https://${repoUrl.includes('gitlab.com') ? 'gitlab.com' : 'github.com'}/${parsed.owner}/${parsed.repo}.git`;

  const dir = mkdtempSync(join(tmpdir(), 'tl-repo-'));
  try {
    // Shallow, single-branch clone. execFile with an args array + `--` means the
    // URL can never be interpreted as a flag or shell command.
    execFileSync('git', ['clone', '--depth', '30', '--single-branch', '--', cloneUrl, dir], {
      timeout: 90_000,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'ignore', 'pipe'],
    });

    await createOrg({
      name,
      tagline: `The ${name} codebase, indexed into shared memory by Throughline.`,
      mission: `Let anyone ask plain-English questions about the ${name} codebase without reading the code.`,
      industry: 'Software',
      stage: 'Active',
    });

    const result = await indexRepo({ repoPath: dir, slug, name });
    return NextResponse.json({ slug, name, result }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const friendly = /timed out|ETIMEDOUT/i.test(msg)
      ? 'Cloning took too long — try a smaller repo.'
      : /not found|repository .* does not exist|exit code 128/i.test(msg)
        ? 'Could not clone that repo — is it public and the URL correct?'
        : 'Failed to index the repo.';
    return NextResponse.json({ error: friendly }, { status: 502 });
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}
