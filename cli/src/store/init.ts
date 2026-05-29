// Initializes the .nz/ workspace. Idempotent.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Memory, Room } from '../types.js';
import { defaultNzRoot, paths } from './paths.js';

const DEFAULT_ROOM: Room = {
  room_id: 'demo-room',
  project: 'NeverZero Mission Control',
  agents: [],
};

const DEFAULT_MEMORY: Memory = {
  goals: [],
  constraints: [],
  decisions: [],
  rejected_approaches: [],
  files_touched: [],
};

function writeJsonIfMissing(path: string, data: unknown): boolean {
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return true;
}

function touchFileIfMissing(path: string): boolean {
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '', 'utf8');
  return true;
}

export function ensureInit(rootPath?: string): { root: string; created: boolean } {
  const root = rootPath ?? defaultNzRoot();
  const p = paths(root);

  const existedBefore = existsSync(root);
  if (!existedBefore) mkdirSync(root, { recursive: true });
  mkdirSync(p.handoffDir, { recursive: true });

  const a = writeJsonIfMissing(p.room, DEFAULT_ROOM);
  const b = touchFileIfMissing(p.ledger);
  const c = writeJsonIfMissing(p.memory, DEFAULT_MEMORY);

  const created = !existedBefore || a || b || c;
  return { root, created };
}
