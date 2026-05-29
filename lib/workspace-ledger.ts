import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

export type WorkspaceEventType =
  | 'agent_registered'
  | 'context_fetch'
  | 'heartbeat'
  | 'handoff_created'
  | 'agent_message'
  | 'decision'
  | 'failure';

export interface WorkspaceEvent {
  id: string;
  type: WorkspaceEventType;
  orgSlug: string;
  agentId?: string;
  sessionId?: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const STORE = join(DATA_DIR, 'workspace-ledger.ndjson');
const MAX_RECENT_EVENTS = 60;

function newEventId(): string {
  return `evt_${randomBytes(6).toString('hex')}`;
}

function normalizeMetadata(input?: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    if (!key.trim() || value === undefined || value === null) continue;
    out[key] = value;
  }
  return out;
}

export async function appendWorkspaceEvent(input: {
  type: WorkspaceEventType;
  orgSlug: string;
  agentId?: string;
  sessionId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}): Promise<WorkspaceEvent> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const event: WorkspaceEvent = {
    id: newEventId(),
    type: input.type,
    orgSlug: input.orgSlug.toLowerCase(),
    agentId: input.agentId,
    sessionId: input.sessionId,
    summary: input.summary,
    metadata: normalizeMetadata(input.metadata),
    createdAt: new Date().toISOString(),
  };

  await appendFile(STORE, JSON.stringify(event) + '\n', 'utf8');
  return event;
}

export function readRecentWorkspaceEvents(opts?: {
  orgSlug?: string;
  limit?: number;
  types?: WorkspaceEventType[];
}): WorkspaceEvent[] {
  if (!existsSync(STORE)) return [];

  const limit = Math.max(1, Math.min(opts?.limit ?? MAX_RECENT_EVENTS, MAX_RECENT_EVENTS));
  const types = opts?.types ? new Set(opts.types) : null;
  const orgSlug = opts?.orgSlug?.toLowerCase();
  const lines = readFileSync(STORE, 'utf8').split(/\r?\n/).filter(Boolean);
  const events: WorkspaceEvent[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as WorkspaceEvent;
      if (orgSlug && parsed.orgSlug !== orgSlug) continue;
      if (types && !types.has(parsed.type)) continue;
      events.push(parsed);
    } catch {
      // Ignore partial demo events rather than breaking cold start.
    }
  }

  return events.slice(-limit).reverse();
}
