// XTrace Memory client singleton.
//
// XTrace is the single source of truth for Throughline's durable workspace
// memory — decisions, findings, handoffs, recall, cold-start context, and the
// human-facing "Ask Mission Control" surface all read and write through here.
// The local data/*.ndjson ledger is only the transient live activity feed; it
// holds no durable knowledge.
//
// Credentials come from the environment (see .env.example). If they're missing
// we return null so callers can surface a clear "connect XTrace" state instead
// of crashing the dev server — but there is no fake in-memory fallback. XTrace
// is the brain or there is no brain.

import { MemoryClient } from '@xtraceai/memory';

let cached: MemoryClient | null | undefined;

export function xtraceConfigured(): boolean {
  return Boolean(process.env.XTRACE_API_KEY?.trim() && process.env.XTRACE_ORG_ID?.trim());
}

/** The XTrace org/account these workspace memories live under (the API tenant). */
export function xtraceOrgId(): string {
  return process.env.XTRACE_ORG_ID?.trim() ?? '';
}

/** Returns the shared MemoryClient, or null if credentials aren't configured. */
export function getXtrace(): MemoryClient | null {
  if (cached !== undefined) return cached;

  const apiKey = process.env.XTRACE_API_KEY?.trim();
  const orgId = process.env.XTRACE_ORG_ID?.trim();
  if (!apiKey || !orgId) {
    cached = null;
    return null;
  }

  const baseUrl = process.env.XTRACE_BASE_URL?.trim();
  cached = new MemoryClient({ apiKey, orgId, ...(baseUrl ? { baseUrl } : {}) });
  return cached;
}

/** Throwing accessor for write paths that must not silently no-op. */
export function requireXtrace(): MemoryClient {
  const client = getXtrace();
  if (!client) {
    throw new Error(
      'XTrace is not configured. Set XTRACE_API_KEY and XTRACE_ORG_ID in .env.local.',
    );
  }
  return client;
}
