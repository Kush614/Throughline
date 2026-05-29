// File-level claim store. When two agents try to claim the same file in the
// same org, we detect the conflict, generate a Conflict Resolution Packet
// subfile, and report both claimants. Hackathon-grade: file-backed JSON.

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface FileClaim {
  id: string;
  orgSlug: string;
  filePath: string;          // e.g. "src/onboarding/index.ts"
  agentId: string;
  agentName: string;
  claimedAt: string;         // ISO
  releasedAt: string | null; // ISO when released; null while held
  reason: string;            // task description the claim is for
}

const DATA_DIR = join(process.cwd(), 'data');
const STORE = join(DATA_DIR, 'file-claims.json');

interface StoreFile { claims: FileClaim[]; }

async function readStore(): Promise<StoreFile> {
  try {
    const txt = await readFile(STORE, 'utf8');
    const parsed = JSON.parse(txt) as Partial<StoreFile>;
    return { claims: Array.isArray(parsed.claims) ? parsed.claims : [] };
  } catch { return { claims: [] }; }
}

async function writeStore(s: StoreFile): Promise<void> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await writeFile(STORE, JSON.stringify(s, null, 2), 'utf8');
}

const claimId = () => `fc_${randomBytes(6).toString('hex')}`;

export async function listClaims(opts: { orgSlug: string; held?: boolean }): Promise<FileClaim[]> {
  const s = await readStore();
  return s.claims
    .filter((c) => c.orgSlug === opts.orgSlug)
    .filter((c) => opts.held === undefined ? true : (opts.held ? c.releasedAt === null : c.releasedAt !== null))
    .sort((a, b) => (a.claimedAt < b.claimedAt ? 1 : -1));
}

/**
 * Attempt to claim a file. If another agent already holds it (releasedAt=null),
 * returns { ok: false, holder }. The caller can decide to write a Conflict
 * Resolution Packet subfile.
 */
export async function tryClaim(input: {
  orgSlug: string;
  filePath: string;
  agentId: string;
  agentName: string;
  reason: string;
}): Promise<{ ok: true; claim: FileClaim } | { ok: false; holder: FileClaim }> {
  const s = await readStore();
  const held = s.claims.find((c) =>
    c.orgSlug === input.orgSlug && c.filePath === input.filePath && c.releasedAt === null,
  );
  if (held && held.agentId !== input.agentId) {
    return { ok: false, holder: held };
  }
  // Re-claim by same agent: idempotent.
  if (held && held.agentId === input.agentId) {
    return { ok: true, claim: held };
  }
  const claim: FileClaim = {
    id: claimId(),
    orgSlug: input.orgSlug,
    filePath: input.filePath,
    agentId: input.agentId,
    agentName: input.agentName,
    claimedAt: new Date().toISOString(),
    releasedAt: null,
    reason: input.reason,
  };
  s.claims.push(claim);
  await writeStore(s);
  return { ok: true, claim };
}

export async function releaseClaim(id: string): Promise<FileClaim | undefined> {
  const s = await readStore();
  const idx = s.claims.findIndex((c) => c.id === id);
  if (idx < 0) return undefined;
  const existing = s.claims[idx];
  if (!existing) return undefined;
  if (existing.releasedAt) return existing;
  const updated: FileClaim = { ...existing, releasedAt: new Date().toISOString() };
  s.claims[idx] = updated;
  await writeStore(s);
  return updated;
}

export async function releaseAllForAgent(orgSlug: string, agentId: string): Promise<number> {
  const s = await readStore();
  let n = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < s.claims.length; i++) {
    const c = s.claims[i]!;
    if (c.orgSlug === orgSlug && c.agentId === agentId && c.releasedAt === null) {
      s.claims[i] = { ...c, releasedAt: now };
      n++;
    }
  }
  if (n > 0) await writeStore(s);
  return n;
}
