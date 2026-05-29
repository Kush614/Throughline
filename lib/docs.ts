// Doc tree — every org has a root "brain" doc; skill invocations create
// child docs ("subfiles") so the main doc stays clean.

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { SkillKind } from './providers';

export type DocKind =
  | 'brain'      // root org doc
  | 'subfile';   // generic subfile (skill result, note, etc.)

export interface SkillRunMeta {
  skillId: string;
  command: string;          // "/plan"
  kind: SkillKind;
  task: string;
  requestedBy: string;      // human user label
  mentionedAgents: { id: string; name: string }[];
  status: 'pending' | 'running' | 'done' | 'error';
  startedAt: string;
  completedAt: string | null;
}

export interface DocNode {
  id: string;
  orgSlug: string;
  parentId: string | null;   // null = root
  title: string;
  kind: DocKind;
  content: string;            // markdown body
  createdBy: string;          // agent id or "user"
  createdAt: string;
  updatedAt: string;
  skillRun?: SkillRunMeta;    // present iff this subfile was produced by a skill
}

const DATA_DIR = join(process.cwd(), 'data');
const STORE = join(DATA_DIR, 'docs.json');

interface StoreFile { docs: DocNode[]; }

async function readStore(): Promise<StoreFile> {
  try {
    const txt = await readFile(STORE, 'utf8');
    const parsed = JSON.parse(txt) as Partial<StoreFile>;
    return { docs: Array.isArray(parsed.docs) ? parsed.docs : [] };
  } catch { return { docs: [] }; }
}
async function writeStore(s: StoreFile): Promise<void> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await writeFile(STORE, JSON.stringify(s, null, 2), 'utf8');
}

const docId = (prefix = 'doc') => `${prefix}_${randomBytes(6).toString('hex')}`;

/** Get or create the root brain doc for an org. Idempotent. */
export async function ensureBrainRoot(orgSlug: string): Promise<DocNode> {
  const s = await readStore();
  const existing = s.docs.find((d) => d.orgSlug === orgSlug && d.kind === 'brain' && d.parentId === null);
  if (existing) return existing;
  const now = new Date().toISOString();
  const root: DocNode = {
    id: docId('brain'),
    orgSlug,
    parentId: null,
    title: 'Company brain',
    kind: 'brain',
    content: '',
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  };
  s.docs.push(root);
  await writeStore(s);
  return root;
}

export async function listDocs(opts: { orgSlug: string; parentId?: string | null }): Promise<DocNode[]> {
  const s = await readStore();
  return s.docs
    .filter((d) => d.orgSlug === opts.orgSlug)
    .filter((d) => opts.parentId === undefined || (d.parentId ?? null) === (opts.parentId ?? null))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getDoc(id: string): Promise<DocNode | undefined> {
  const s = await readStore();
  return s.docs.find((d) => d.id === id);
}

export interface CreateDocInput {
  orgSlug: string;
  parentId?: string | null;
  title: string;
  kind?: DocKind;
  content?: string;
  createdBy?: string;
  skillRun?: SkillRunMeta;
}

export async function createDoc(input: CreateDocInput): Promise<DocNode> {
  const title = input.title.trim();
  if (!title) throw new Error('Doc title is required.');
  const now = new Date().toISOString();
  const doc: DocNode = {
    id: docId('sub'),
    orgSlug: input.orgSlug,
    parentId: input.parentId ?? null,
    title,
    kind: input.kind ?? 'subfile',
    content: input.content ?? '',
    createdBy: input.createdBy ?? 'user',
    createdAt: now,
    updatedAt: now,
    skillRun: input.skillRun,
  };
  const s = await readStore();
  s.docs.push(doc);
  await writeStore(s);
  return doc;
}

export async function updateDoc(id: string, patch: Partial<DocNode>): Promise<DocNode | undefined> {
  const s = await readStore();
  const idx = s.docs.findIndex((d) => d.id === id);
  if (idx < 0) return undefined;
  const existing = s.docs[idx];
  if (!existing) return undefined;
  // Never let id/orgSlug/createdAt mutate through patch.
  const updated: DocNode = {
    ...existing,
    ...patch,
    id: existing.id,
    orgSlug: existing.orgSlug,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  s.docs[idx] = updated;
  await writeStore(s);
  return updated;
}

export async function deleteDocTree(id: string): Promise<string[]> {
  const s = await readStore();
  const target = s.docs.find((d) => d.id === id);
  if (!target) return [];

  const ids = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const doc of s.docs) {
      if (doc.parentId && ids.has(doc.parentId) && !ids.has(doc.id)) {
        ids.add(doc.id);
        changed = true;
      }
    }
  }

  const nextDocs = s.docs.filter((d) => !ids.has(d.id));
  if (nextDocs.length === s.docs.length) return [];
  await writeStore({ docs: nextDocs });
  return Array.from(ids);
}
