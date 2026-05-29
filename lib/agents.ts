// Agent registry — file-backed JSON store under data/agents.json.
// For hackathon-grade demos only; swap for a real DB before production.
//
// An "agent" here is a per-(workspace × client × machine) connection: each
// install of Throughline into Claude Desktop / Cursor / Aider / etc. mints
// one Agent record, which carries its own API key.

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendWorkspaceEvent } from './workspace-ledger';

export type ClientId =
  | 'codex'
  | 'claude-desktop'
  | 'claude-code'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'antigravity'
  | 'zed'
  | 'continue'
  | 'aider'
  | 'custom';

export type AgentStatus = 'pending' | 'connected' | 'revoked';
export type AgentScope = 'read' | 'write';

export interface Agent {
  // Required fields per the spec
  id: string;                 // agent-id (uuid-ish slug)
  name: string;               // agent-name (user chosen, e.g. "Codex on Sam's MacBook")
  from: ClientId;             // agent-from (which platform/client it lives in)
  ownedBy: string;            // agent-ownedby (workspace owner id)
  orgSlug: string;            // organization that owns this agent (e.g. "atlas")

  // Auth
  apiKeyPrefix: string;       // safe display, e.g. "nz_live_x9K2"
  apiKeyHash: string;         // sha256 of the full key — full key only returned once
  scopes: AgentScope[];
  workspace: string;          // e.g. "acme"

  // Lifecycle
  status: AgentStatus;
  createdAt: string;          // ISO
  lastSeenAt: string | null;  // ISO when the agent first verified

  // Subagent tree — set when the agent was spawned by another agent.
  // Resume packets walk this chain so a child can recover its parent's context.
  parentAgentId?: string | null;

  // Platform-specific
  platform: {
    os?: 'mac' | 'win' | 'linux' | 'wsl' | null;
    runtime?: string;         // e.g. "Claude Desktop 0.7.4"
    machine?: string;         // user-supplied label
  };

  // Free-form bag — install snippet used, MCP endpoint url, etc.
  metadata: Record<string, string>;
}

/** Shape returned on creation only — full key shown ONCE. */
export interface AgentCreatedResponse {
  agent: Agent;
  apiKey: string;             // full key, e.g. "nz_live_..."
  installSnippet: string;     // pre-filled snippet for the chosen client
}

// ───────── Storage ─────────

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const STORE = join(DATA_DIR, 'agents.json');
const LOCK = join(DATA_DIR, 'agents.json.lock');
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 30_000;

interface StoreFile {
  agents: Agent[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}

async function readStoreUnlocked(): Promise<StoreFile> {
  try {
    const txt = await readFile(STORE, 'utf8');
    const parsed = JSON.parse(txt) as Partial<StoreFile>;
    return { agents: Array.isArray(parsed.agents) ? parsed.agents : [] };
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { agents: [] };
    }
    throw error;
  }
}

async function readStore(): Promise<StoreFile> {
  return readStoreUnlocked();
}

async function writeStoreUnlocked(s: StoreFile): Promise<void> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const tmp = join(DATA_DIR, `agents.${process.pid}.${Date.now()}.${randomBytes(4).toString('hex')}.tmp`);
  await writeFile(tmp, JSON.stringify(s, null, 2), 'utf8');
  await rename(tmp, STORE);
}

async function maybeClearStaleLock(): Promise<void> {
  try {
    const raw = await readFile(LOCK, 'utf8');
    const parsed = JSON.parse(raw) as { createdAt?: string };
    const createdAt = parsed.createdAt ? Date.parse(parsed.createdAt) : 0;
    if (createdAt && Date.now() - createdAt > LOCK_STALE_MS) {
      await unlink(LOCK).catch(() => undefined);
    }
  } catch {
    // If the lock file is unreadable, let the acquisition timeout decide.
  }
}

type StoreLock = Awaited<ReturnType<typeof open>>;

async function acquireStoreLock(): Promise<StoreLock> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const started = Date.now();

  while (true) {
    try {
      const lock = await open(LOCK, 'wx');
      await lock.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
      return lock;
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'EEXIST') throw error;
      await maybeClearStaleLock();
      if (Date.now() - started > LOCK_TIMEOUT_MS) {
        throw new Error('Timed out waiting for agent registry lock.');
      }
      await sleep(25 + Math.floor(Math.random() * 25));
    }
  }
}

async function releaseStoreLock(lock: StoreLock): Promise<void> {
  await lock.close().catch(() => undefined);
  await unlink(LOCK).catch(() => undefined);
}

async function updateStore<T>(mutate: (store: StoreFile) => T | Promise<T>): Promise<T> {
  const lock = await acquireStoreLock();
  try {
    const store = await readStoreUnlocked();
    const result = await mutate(store);
    await writeStoreUnlocked(store);
    return result;
  } finally {
    await releaseStoreLock(lock);
  }
}

async function writeStore(s: StoreFile): Promise<void> {
  const lock = await acquireStoreLock();
  try {
    await writeStoreUnlocked(s);
  } finally {
    await releaseStoreLock(lock);
  }
}

// ───────── ID + Key generation ─────────

function shortId(prefix: string): string {
  return prefix + '_' + randomBytes(6).toString('hex');
}

function newApiKey(): { key: string; prefix: string; hash: string } {
  const body = randomBytes(24).toString('hex'); // 48 hex chars
  const key = `nz_live_${body}`;
  const prefix = key.slice(0, 12); // "nz_live_xxxx"
  const hash = createHash('sha256').update(key).digest('hex');
  return { key, prefix, hash };
}

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function metadataFromRecord(input?: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (value === undefined || value === null || key.trim() === '') continue;
    if (Array.isArray(value)) {
      out[key] = value.map((item) => String(item)).join(', ');
    } else if (typeof value === 'object') {
      out[key] = JSON.stringify(value);
    } else {
      out[key] = String(value);
    }
  }
  return out;
}

// ───────── Public API ─────────

export async function listAgents(opts?: { orgSlug?: string }): Promise<Agent[]> {
  const s = await readStore();
  const filtered = opts?.orgSlug
    ? s.agents.filter((a) => a.orgSlug === opts.orgSlug)
    : s.agents;
  return filtered.slice().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const s = await readStore();
  return s.agents.find((a) => a.id === id);
}

/** List direct subagents of a given parent agent id. */
export async function listSubagents(parentAgentId: string): Promise<Agent[]> {
  const s = await readStore();
  return s.agents.filter((a) => a.parentAgentId === parentAgentId);
}

export async function authenticateAgentKey(apiKey: string): Promise<Agent | undefined> {
  const trimmed = apiKey.trim();
  if (!trimmed) return undefined;
  const s = await readStore();
  const hash = hashApiKey(trimmed);
  return s.agents.find((a) => a.apiKeyHash === hash && a.status !== 'revoked');
}

export interface CreateAgentInput {
  name: string;
  from: ClientId;
  orgSlug: string;       // required — every agent must belong to an org
  ownedBy?: string;      // defaults to 'sam' (single-user demo)
  workspace?: string;    // defaults to org slug
  scopes?: AgentScope[]; // defaults to ['read', 'write']
  platform?: Agent['platform'];
  metadata?: Record<string, unknown>;
  parentAgentId?: string | null;  // set when this agent was /spawn'd by another
}

export async function createAgent(input: CreateAgentInput): Promise<AgentCreatedResponse> {
  const trimmedName = input.name.trim();
  if (!trimmedName) throw new Error('Agent name is required.');
  if (trimmedName.length > 80) throw new Error('Agent name must be ≤ 80 characters.');

  const orgSlug = (input.orgSlug || '').toLowerCase().trim();
  if (!orgSlug) throw new Error('orgSlug is required.');

  const { key, prefix, hash } = newApiKey();
  const agent: Agent = {
    id: shortId('agt'),
    name: trimmedName,
    from: input.from,
    ownedBy: input.ownedBy ?? 'sam',
    orgSlug,
    apiKeyPrefix: prefix,
    apiKeyHash: hash,
    scopes: input.scopes ?? ['read', 'write'],
    workspace: input.workspace ?? orgSlug,
    status: 'pending',
    createdAt: new Date().toISOString(),
    lastSeenAt: null,
    parentAgentId: input.parentAgentId ?? null,
    platform: input.platform ?? {},
    metadata: metadataFromRecord(input.metadata),
  };

  await updateStore((store) => {
    store.agents.push(agent);
  });

  await appendWorkspaceEvent({
    type: 'agent_registered',
    orgSlug,
    agentId: agent.id,
    summary: `${agent.name} registered from ${agent.from}.`,
    metadata: {
      agent_name: agent.name,
      agent_from: agent.from,
      runtime: agent.platform.runtime,
      machine: agent.platform.machine,
      os: agent.platform.os,
      workspace: agent.workspace,
      owned_by: agent.ownedBy,
      api_key_prefix: agent.apiKeyPrefix,
      ...agent.metadata,
    },
  });

  return {
    agent,
    apiKey: key,
    installSnippet: buildInstallSnippet(agent.from, '<one-time-key-returned-as-apiKey>', agent.workspace),
  };
}

export async function revokeAgent(id: string): Promise<Agent | undefined> {
  return updateStore((store) => {
    const idx = store.agents.findIndex((a) => a.id === id);
    if (idx < 0) return undefined;
    const existing = store.agents[idx];
    if (!existing) return undefined;
    const updated: Agent = { ...existing, status: 'revoked' };
    store.agents[idx] = updated;
    return updated;
  });
}

/** Called when the agent first checks in — flips status to 'connected'. */
export async function markVerified(id: string): Promise<Agent | undefined> {
  return updateStore((store) => {
    const idx = store.agents.findIndex((a) => a.id === id);
    if (idx < 0) return undefined;
    const existing = store.agents[idx];
    if (!existing) return undefined;
    const updated: Agent = {
      ...existing,
      status: existing.status === 'revoked' ? 'revoked' : 'connected',
      lastSeenAt: new Date().toISOString(),
    };
    store.agents[idx] = updated;
    return updated;
  });
}

export interface HeartbeatPatch {
  sessionId?: string;
  currentTask?: string;
  projectPath?: string;
  capabilities?: string[] | string;
  runtime?: string;
  machine?: string;
  os?: Agent['platform']['os'];
  status?: string;
  metadata?: Record<string, unknown>;
}

export async function recordHeartbeat(
  id: string,
  patch: HeartbeatPatch = {},
): Promise<Agent | undefined> {
  return updateStore((store) => {
    const idx = store.agents.findIndex((a) => a.id === id);
    if (idx < 0) return undefined;
    const existing = store.agents[idx];
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const metadata = metadataFromRecord({
      ...patch.metadata,
      session_id: patch.sessionId,
      current_task: patch.currentTask,
      project_path: patch.projectPath,
      capabilities: Array.isArray(patch.capabilities)
        ? patch.capabilities.join(', ')
        : patch.capabilities,
      heartbeat_runtime: patch.runtime,
      heartbeat_machine: patch.machine,
      heartbeat_status: patch.status,
      last_heartbeat_at: now,
    });

    const updated: Agent = {
      ...existing,
      status: existing.status === 'revoked' ? 'revoked' : 'connected',
      lastSeenAt: now,
      platform: {
        ...existing.platform,
        ...(patch.os ? { os: patch.os } : {}),
        ...(patch.runtime ? { runtime: patch.runtime } : {}),
        ...(patch.machine ? { machine: patch.machine } : {}),
      },
      metadata: {
        ...existing.metadata,
        ...metadata,
      },
    };

    store.agents[idx] = updated;
    return updated;
  });
}

// ───────── Snippet generation ─────────

function buildInstallSnippet(client: ClientId, apiKey: string, workspace: string): string {
  switch (client) {
    case 'codex':
      return [
        `NEVERZERO_API_KEY=${apiKey}`,
        `NEVERZERO_WORKSPACE=${workspace}`,
        'NEVERZERO_CONTEXT_URL=http://localhost:3000/api/context',
        'NEVERZERO_HEARTBEAT_INTERVAL_SECONDS=60',
      ].join('\n');
    case 'claude-desktop':
    case 'cursor':
    case 'windsurf':
    case 'continue':
    case 'zed':
      return JSON.stringify(
        {
          mcpServers: {
            neverzero: {
              command: 'npx',
              args: ['-y', '@neverzero/mcp'],
              env: { NEVERZERO_API_KEY: apiKey, NEVERZERO_WORKSPACE: workspace },
            },
          },
        },
        null,
        2,
      );
    case 'claude-code':
      return [
        `claude mcp add neverzero \\`,
        `  --command "npx -y @neverzero/mcp" \\`,
        `  --env NEVERZERO_API_KEY=${apiKey} \\`,
        `  --env NEVERZERO_WORKSPACE=${workspace}`,
      ].join('\n');
    case 'antigravity':
      return JSON.stringify(
        {
          tool_servers: [
            {
              id: 'neverzero',
              protocol: 'mcp',
              command: 'npx -y @neverzero/mcp',
              env: { NEVERZERO_API_KEY: apiKey },
              auto_invoke: ['brain.read', 'memory.recall'],
            },
          ],
        },
        null,
        2,
      );
    case 'aider':
      return [
        `export NEVERZERO_API_KEY=${apiKey}`,
        `aider \\`,
        `  --mcp-server "npx -y @neverzero/mcp" \\`,
        `  --read-from-mcp brain.read,memory.recall`,
      ].join('\n');
    case 'vscode':
      return JSON.stringify(
        {
          'neverzero.apiKey': apiKey,
          'neverzero.workspace': workspace,
          'neverzero.autoReadBrain': true,
          'neverzero.copilot.injectMemory': true,
        },
        null,
        2,
      );
    case 'custom':
      return [
        `curl https://api.neverzero.cloud/v1/brain/${workspace} \\`,
        `  -H "Authorization: Bearer ${apiKey}"`,
      ].join('\n');
  }
}
