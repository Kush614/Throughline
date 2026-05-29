// Append-only ndjson event log.

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import type { LedgerEvent } from '../types.js';
import { nowIso } from '../util/time.js';
import { paths } from './paths.js';

export function appendLedger(
  event: Omit<LedgerEvent, 'ts'> & { ts?: string },
): LedgerEvent {
  const p = paths();
  const full: LedgerEvent = { ...event, ts: event.ts ?? nowIso() } as LedgerEvent;
  appendFileSync(p.ledger, JSON.stringify(full) + '\n', 'utf8');
  return full;
}

export function readLedger(): LedgerEvent[] {
  const p = paths();
  if (!existsSync(p.ledger)) return [];
  const raw = readFileSync(p.ledger, 'utf8');
  const out: LedgerEvent[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed) as LedgerEvent);
    } catch {
      // skip corrupt line, never crash
    }
  }
  return out;
}

export function tailLedger(n: number): LedgerEvent[] {
  if (n <= 0) return [];
  const all = readLedger();
  return all.slice(Math.max(0, all.length - n));
}
