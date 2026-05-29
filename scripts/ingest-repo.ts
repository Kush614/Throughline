// Index a REAL codebase into a Throughline workspace's XTrace memory — README,
// tech stack, recent git history, and structure — so you can ask the room about
// real code.
//
//   pnpm exec tsx scripts/ingest-repo.ts
//   REPO_PATH=/path/to/any/repo ORG_SLUG=codebase ORG_NAME="My Repo" pnpm exec tsx scripts/ingest-repo.ts

import { basename, resolve } from 'node:path';
import { getOrg, createOrg } from '../lib/orgs';
import { indexRepo } from '../lib/index-repo';
import { xtraceConfigured } from '../lib/xtrace';

try { (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env.local'); } catch {}

const REPO = resolve(process.env.REPO_PATH || '.');
const SLUG = (process.env.ORG_SLUG || 'codebase').toLowerCase();
const NAME = process.env.ORG_NAME || basename(REPO);

async function main() {
  if (!xtraceConfigured()) {
    console.error('\n✗ XTrace not configured. Put XTRACE_API_KEY + XTRACE_ORG_ID in .env.local.\n');
    process.exit(1);
  }

  console.log(`Indexing codebase at ${REPO} → workspace "${SLUG}"`);

  if (!(await getOrg(SLUG))) {
    await createOrg({
      name: NAME,
      tagline: `The ${NAME} codebase, indexed into shared memory by Throughline.`,
      mission: `Let anyone ask plain-English questions about the ${NAME} codebase without reading the code.`,
      industry: 'Software',
      stage: 'Active',
    });
    console.log(`• created workspace "${SLUG}"`);
  }

  const r = await indexRepo({ repoPath: REPO, slug: SLUG, name: NAME, onStep: (s) => console.log(`  ✓ ${s}`) });
  console.log(`\n✓ Indexed (readme:${r.readme} stack:${r.stack} commits:${r.commits} dirs:${r.dirs}). Open /${SLUG}/room and ask: "What does this codebase do?"\n`);
}

main().catch((err) => { console.error('\n✗ ingest-repo failed:', err); process.exit(1); });
