// Index a real codebase into XTrace memory: README, tech stack, recent git
// history, and top-level structure. Shared by the CLI (scripts/ingest-repo.ts)
// and the /api/index-repo route. Uses execFile (args array, no shell) so a repo
// path can never inject a command.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ingestMemory } from './adapters/xtrace';

export interface IndexResult {
  readme: boolean;
  stack: number;
  commits: number;
  dirs: number;
}

function git(repoPath: string, args: string[]): string {
  try {
    return execFileSync('git', ['-C', repoPath, ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  } catch {
    return '';
  }
}

function readFirst(repoPath: string, names: string[]): string {
  for (const n of names) {
    const p = join(repoPath, n);
    if (existsSync(p)) {
      try { return readFileSync(p, 'utf8'); } catch { /* ignore */ }
    }
  }
  return '';
}

export async function indexRepo(opts: {
  repoPath: string;
  slug: string;
  name: string;
  sessionId?: string;
  onStep?: (label: string) => void;
}): Promise<IndexResult> {
  const { repoPath, slug, name } = opts;
  const session = opts.sessionId ?? `${slug}-index`;
  const step = opts.onStep ?? (() => {});
  const result: IndexResult = { readme: false, stack: 0, commits: 0, dirs: 0 };

  const ingest = (text: string, kind: 'fact' | 'build') =>
    ingestMemory({
      orgSlug: slug, sessionId: session, text, kind,
      source: 'manual', command: '/index-repo', agentName: 'Indexer', requestedBy: 'Indexer', wait: true,
    });

  // 1) README overview
  const readme = readFirst(repoPath, ['README.md', 'readme.md', 'Readme.md', 'README']);
  if (readme.trim()) {
    step('README');
    const clean = readme
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*`_|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 2400);
    await ingest(`Here is what the ${name} codebase is, from its README: ${clean}`, 'fact');
    result.readme = true;
  }

  // 2) Tech stack from package.json
  const pkgRaw = readFirst(repoPath, ['package.json']);
  if (pkgRaw) {
    try {
      const pkg = JSON.parse(pkgRaw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0, 25);
      if (deps.length) {
        step('tech stack');
        await ingest(`The ${name} codebase is built with these key technologies and packages: ${deps.join(', ')}.`, 'fact');
        result.stack = deps.length;
      }
    } catch { /* not JSON / skip */ }
  }

  // 3) Recent git history
  const log = git(repoPath, ['log', '--no-merges', '-n', '25', '--pretty=format:%s']).trim();
  if (log) {
    const subjects = log.split('\n').filter(Boolean);
    step('git history');
    const digest = subjects.map((s) => `- ${s}`).join('\n');
    await ingest(`Recent work on the ${name} codebase (the last ${subjects.length} commits): \n${digest}`, 'build');
    result.commits = subjects.length;
  }

  // 4) Top-level structure
  const files = git(repoPath, ['ls-files']).trim();
  const topDirs = Array.from(new Set(files.split('\n').map((f) => f.split('/')[0]).filter(Boolean))).slice(0, 20);
  if (topDirs.length) {
    step('structure');
    await ingest(`The ${name} codebase is organized into these top-level files and folders: ${topDirs.join(', ')}.`, 'fact');
    result.dirs = topDirs.length;
  }

  return result;
}
