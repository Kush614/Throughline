// Organizations — file-backed JSON store under data/orgs.json.
// One org = one company brain = its own /[slug]/install · /[slug]/agents ·
// /[slug]/brain namespace and a future subdomain like <slug>.neverzero.org.

import { existsSync, mkdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface OrgPerson {
  name: string;
  role: string;
}

export interface OrgMemory {
  kind: string;
  text: string;
}

export type OrgAgentId =
  | 'iris' | 'forge' | 'atlas-agent' | 'loop' | 'beam';

export type OrgProviderId =
  | 'gbrain' | 'gstack' | 'zeroentropy' | 'the-hog' | 'lightsprint' | 'neverzero';

export interface Org {
  slug: string;                // url-safe, e.g. "atlas"
  name: string;                // display name, e.g. "Atlas"
  domain: string;              // <slug>.neverzero.org
  tagline: string;
  mission: string;
  industry: string;
  stage: string;
  founded: string;
  hq: string;
  people: OrgPerson[];
  agentRoster: OrgAgentId[];   // which named agents are on payroll
  providers: OrgProviderId[];  // installed skill providers
  memories: OrgMemory[];
  createdAt: string;           // ISO
}

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const STORE = join(DATA_DIR, 'orgs.json');

interface StoreFile { orgs: Org[]; }

async function readStore(): Promise<StoreFile> {
  try {
    const txt = await readFile(STORE, 'utf8');
    const parsed = JSON.parse(txt) as Partial<StoreFile>;
    return { orgs: Array.isArray(parsed.orgs) ? parsed.orgs : [] };
  } catch {
    return { orgs: [] };
  }
}

async function writeStore(s: StoreFile): Promise<void> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await writeFile(STORE, JSON.stringify(s, null, 2), 'utf8');
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

export async function listOrgs(): Promise<Org[]> {
  const s = await readStore();
  return s.orgs.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getOrg(slug: string): Promise<Org | undefined> {
  const s = await readStore();
  return s.orgs.find((o) => o.slug === slug.toLowerCase());
}

export interface CreateOrgInput {
  name: string;
  tagline?: string;
  mission?: string;
  industry?: string;
  stage?: string;
  founded?: string;
  hq?: string;
  people?: OrgPerson[];
  agentRoster?: OrgAgentId[];
  providers?: OrgProviderId[];
  memories?: OrgMemory[];
}

/** Add/remove installed providers on an existing org. Returns the new list. */
export async function setOrgProviders(slug: string, providers: OrgProviderId[]): Promise<OrgProviderId[] | undefined> {
  const dedup = Array.from(new Set(providers));
  const updated = await updateOrg(slug, { providers: dedup });
  return updated?.providers;
}

export async function createOrg(input: CreateOrgInput): Promise<Org> {
  const name = input.name.trim();
  if (!name) throw new Error('Organization name is required.');
  if (name.length > 64) throw new Error('Organization name must be ≤ 64 characters.');

  const slug = slugify(name);
  if (!slug) throw new Error('Could not derive a URL slug from the name.');

  const store = await readStore();
  if (store.orgs.some((o) => o.slug === slug)) {
    throw new Error(`Organization with slug "${slug}" already exists.`);
  }

  const org: Org = {
    slug,
    name,
    domain: `${slug}.throughline.app`,
    tagline: (input.tagline ?? '').trim(),
    mission: (input.mission ?? '').trim(),
    industry: (input.industry ?? '').trim(),
    stage: (input.stage ?? '').trim(),
    founded: (input.founded ?? '').trim(),
    hq: (input.hq ?? '').trim(),
    people: (input.people ?? []).filter((p) => p.name.trim() || p.role.trim()),
    agentRoster: input.agentRoster ?? ['iris', 'atlas-agent'],
    // Default providers. `neverzero` is the native platform provider (/remember,
    // /pin, /resume, /handoff) and must always be installed; the rest are the
    // headline sponsors so every new org has /plan + /scaffold + /research too.
    providers: input.providers ?? ['neverzero', 'gbrain', 'gstack', 'zeroentropy', 'the-hog'],
    memories: (input.memories ?? []).filter((m) => m.text.trim()),
    createdAt: new Date().toISOString(),
  };

  store.orgs.push(org);
  await writeStore(store);
  return org;
}

export async function updateOrg(slug: string, patch: Partial<Org>): Promise<Org | undefined> {
  const store = await readStore();
  const idx = store.orgs.findIndex((o) => o.slug === slug.toLowerCase());
  if (idx < 0) return undefined;
  const existing = store.orgs[idx];
  if (!existing) return undefined;
  // Never let slug/domain mutate via patch.
  const updated: Org = { ...existing, ...patch, slug: existing.slug, domain: existing.domain };
  store.orgs[idx] = updated;
  await writeStore(store);
  return updated;
}
