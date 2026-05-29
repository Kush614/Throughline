import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import { appendWorkspaceEvent } from './workspace-ledger';

export type AgentMessageKind = 'context' | 'handoff' | 'question' | 'status' | 'decision';

export interface AgentMessage {
  id: string;
  orgSlug: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string | null;
  toAgentName: string | null;
  kind: AgentMessageKind;
  summary: string;
  context: string;
  refs: string[];
  sessionId?: string;
  createdAt: string;
}

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, 'data');
const STORE = join(DATA_DIR, 'agent-messages.ndjson');
const MAX_CONTEXT_LENGTH = 6_000;
const MAX_SUMMARY_LENGTH = 240;
const MAX_REF_LENGTH = 180;
const ALLOWED_KINDS = new Set<AgentMessageKind>([
  'context',
  'handoff',
  'question',
  'status',
  'decision',
]);

function messageId(): string {
  return `msg_${randomBytes(6).toString('hex')}`;
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanRefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => cleanText(item, MAX_REF_LENGTH))
    .filter(Boolean)
    .slice(0, 12);
}

function parseMessage(line: string): AgentMessage | null {
  try {
    const parsed = JSON.parse(line) as Partial<AgentMessage>;
    if (!parsed.id || !parsed.orgSlug || !parsed.fromAgentId || !parsed.summary) return null;
    return {
      id: parsed.id,
      orgSlug: parsed.orgSlug.toLowerCase(),
      fromAgentId: parsed.fromAgentId,
      fromAgentName: parsed.fromAgentName ?? parsed.fromAgentId,
      toAgentId: parsed.toAgentId ?? null,
      toAgentName: parsed.toAgentName ?? null,
      kind: ALLOWED_KINDS.has(parsed.kind as AgentMessageKind)
        ? (parsed.kind as AgentMessageKind)
        : 'context',
      summary: parsed.summary,
      context: parsed.context ?? '',
      refs: Array.isArray(parsed.refs) ? parsed.refs.map(String) : [],
      sessionId: parsed.sessionId,
      createdAt: parsed.createdAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function listAgentMessages(opts: {
  orgSlug: string;
  agentId?: string;
  limit?: number;
}): AgentMessage[] {
  if (!existsSync(STORE)) return [];

  const orgSlug = opts.orgSlug.toLowerCase();
  const requestedLimit = Number.isFinite(opts.limit) ? opts.limit ?? 20 : 20;
  const limit = Math.max(1, Math.min(requestedLimit, 100));
  const agentId = opts.agentId?.trim();
  const lines = readFileSync(STORE, 'utf8').split(/\r?\n/).filter(Boolean);
  const messages: AgentMessage[] = [];

  for (const line of lines) {
    const message = parseMessage(line);
    if (!message || message.orgSlug !== orgSlug) continue;
    if (
      agentId &&
      message.fromAgentId !== agentId &&
      message.toAgentId !== agentId &&
      message.toAgentId !== null
    ) {
      continue;
    }
    messages.push(message);
  }

  return messages.slice(-limit).reverse();
}

export async function createAgentMessage(input: {
  orgSlug: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId?: string | null;
  toAgentName?: string | null;
  kind?: AgentMessageKind;
  summary: unknown;
  context?: unknown;
  refs?: unknown;
  sessionId?: string;
}): Promise<AgentMessage> {
  const summary = cleanText(input.summary, MAX_SUMMARY_LENGTH);
  if (!summary) throw new Error('summary is required.');

  const message: AgentMessage = {
    id: messageId(),
    orgSlug: input.orgSlug.toLowerCase(),
    fromAgentId: input.fromAgentId,
    fromAgentName: input.fromAgentName,
    toAgentId: input.toAgentId ?? null,
    toAgentName: input.toAgentName ?? null,
    kind: input.kind && ALLOWED_KINDS.has(input.kind) ? input.kind : 'context',
    summary,
    context: cleanText(input.context, MAX_CONTEXT_LENGTH),
    refs: cleanRefs(input.refs),
    sessionId: input.sessionId ? cleanText(input.sessionId, 120) : undefined,
    createdAt: new Date().toISOString(),
  };

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  await appendFile(STORE, JSON.stringify(message) + '\n', 'utf8');

  await appendWorkspaceEvent({
    type: 'agent_message',
    orgSlug: message.orgSlug,
    agentId: message.fromAgentId,
    sessionId: message.sessionId,
    summary: `${message.fromAgentName} shared ${message.kind} context${message.toAgentName ? ` with ${message.toAgentName}` : ' with the workspace'}.`,
    metadata: {
      message_id: message.id,
      from_agent_id: message.fromAgentId,
      from_agent_name: message.fromAgentName,
      to_agent_id: message.toAgentId,
      to_agent_name: message.toAgentName,
      kind: message.kind,
      summary: message.summary,
      refs: message.refs,
    },
  });

  return message;
}
