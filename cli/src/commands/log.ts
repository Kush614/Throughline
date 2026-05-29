// `nz log --agent <id> --type <event-type> [--task <task>] [--summary <text>]`
// Append a structured event to the ledger. For `decision` and `failure` types,
// also push the entry onto the corresponding memory bucket.

import { appendLedger, memorySet, readMemory } from '../store/index.js';
import type { LedgerEventType, MemoryDecision } from '../types.js';
import { nowIso } from '../util/time.js';
import { err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz log --agent <agent-id> --type <event-type> [--task <task>] [--summary <text>]` — append an event to the ledger. For `decision` and `failure` types, also records the entry in memory.';

const VALID_TYPES: ReadonlySet<LedgerEventType> = new Set<LedgerEventType>([
  'agent_joined',
  'heartbeat',
  'task_claimed',
  'task_released',
  'decision',
  'failure',
  'handoff_created',
  'resume_consumed',
]);

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const agentId = asString(args.flags['agent']);
    const typeRaw = asString(args.flags['type']);
    const task = asString(args.flags['task']);
    const summary = asString(args.flags['summary']);

    if (!agentId || !typeRaw) {
      console.error(
        err(
          'Usage: nz log --agent <agent-id> --type <event-type> [--task <task>] [--summary <text>]',
        ),
      );
      return 1;
    }
    if (!VALID_TYPES.has(typeRaw as LedgerEventType)) {
      console.error(
        err(
          `Invalid event type: ${typeRaw}. One of: ${[...VALID_TYPES].join(', ')}`,
        ),
      );
      return 1;
    }
    const type = typeRaw as LedgerEventType;

    const ts = nowIso();
    const event: Record<string, unknown> = {
      type,
      agent_id: agentId,
      ts,
    };
    if (task !== undefined) event['task'] = task;
    if (summary !== undefined) event['summary'] = summary;
    appendLedger(event as Parameters<typeof appendLedger>[0]);

    // Memory side-effects for decisions and failures.
    if (type === 'decision' || type === 'failure') {
      const mem = readMemory();
      const entry: MemoryDecision = {
        summary: summary ?? task ?? '',
        reason: '',
        ts,
      };
      const key = type === 'decision' ? 'decisions' : 'rejected_approaches';
      const existing = (mem[key] ?? []) as MemoryDecision[];
      memorySet(key, [...existing, entry]);
    }

    const tail = summary ?? task ?? '';
    console.log(ok(`Logged: ${type}${tail ? ` · ${tail}` : ''}`));
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
