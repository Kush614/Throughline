// Resolves the active .nz/ directory. Walks up from cwd looking for an
// existing .nz/ — supports running nz commands from any subdirectory of a
// project — and falls back to cwd/.nz when nothing is found (used by `nz init`).

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const NZ_DIRNAME = '.nz';

/** Locate the nearest ancestor .nz/ dir, or null if none found. */
export function findNzRoot(start: string = process.cwd()): string | null {
  let dir = resolve(start);
  // Defensive cap — walk at most 64 levels.
  for (let i = 0; i < 64; i++) {
    const candidate = join(dir, NZ_DIRNAME);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

/** Resolved .nz/ path — throws if not initialized. */
export function nzRoot(): string {
  const found = findNzRoot();
  if (!found) {
    throw new Error(
      'No .nz/ directory found. Run `nz init` in your project root first.',
    );
  }
  return found;
}

/** Path .nz/ would live at for the current cwd (used by `nz init`). */
export function defaultNzRoot(): string {
  return join(process.cwd(), NZ_DIRNAME);
}

/** All the well-known file paths under .nz/. Centralized so callers don't drift. */
export function paths(root: string = nzRoot()) {
  return {
    root,
    room: join(root, 'room.json'),
    ledger: join(root, 'ledger.ndjson'),
    memory: join(root, 'memory.json'),
    handoffDir: join(root, 'handoff'),
    latestHandoff: join(root, 'handoff', 'latest.nzr.json'),
  };
}
