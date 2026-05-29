// Agent id generator. Stable, human-readable, collision-resistant enough
// for a local multi-agent room.

import { randomBytes } from 'node:crypto';

function slugify(s: string): string {
  const cleaned = s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || 'x';
}

export function newAgentId(name: string, runtime: string): string {
  const rand = randomBytes(3).toString('hex'); // 6 hex chars
  return `agent-${slugify(runtime)}-${slugify(name)}-${rand}`;
}
