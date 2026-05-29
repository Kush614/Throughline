// `nz status` — at-a-glance view of the room: live agents, memory summary,
// and the tail of the work ledger. The first thing a new operator should run.

import {
  listAgents,
  readMemory,
  readRoom,
  tailLedger,
} from '../store/index.js';
import type { Agent } from '../types.js';
import { HEARTBEAT_STALE_MS } from '../types.js';
import { ageMs, relative } from '../util/time.js';
import { bold, dim, err, table } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz status` — render the room snapshot: agents (with liveness markers), a memory summary, and the last 5 ledger events.';

function shortId(id: string): string {
  return id.length <= 6 ? id : id.slice(-6);
}

function statusCell(agent: Agent): string {
  const live =
    agent.last_heartbeat && ageMs(agent.last_heartbeat) <= HEARTBEAT_STALE_MS;
  if (agent.status === 'working' && live) return `● ${agent.status}`;
  if (!live) return `${agent.status} (stale)`;
  return agent.status;
}

function heartbeatCell(agent: Agent): string {
  if (!agent.last_heartbeat) return dim('never');
  const rel = relative(agent.last_heartbeat);
  const stale = ageMs(agent.last_heartbeat) > HEARTBEAT_STALE_MS;
  return stale ? dim(rel) : rel;
}

export async function run(_args: CmdArgs): Promise<number> {
  try {
    const room = readRoom();
    const agents = listAgents();

    // AGENTS table
    console.log(bold(`AGENTS  ${dim(`(${room.room_id} · ${room.project})`)}`));
    if (agents.length === 0) {
      console.log(dim('  (no agents joined)'));
    } else {
      const rows = agents.map((a) => ({
        id: shortId(a.id),
        name: a.name,
        runtime: a.runtime,
        status: statusCell(a),
        current_task: a.current_task || dim('—'),
        heartbeat: heartbeatCell(a),
      }));
      console.log(table(rows));
    }

    // MEMORY SUMMARY
    console.log('');
    console.log(bold('MEMORY SUMMARY'));
    const mem = readMemory();
    const memRows = [
      {
        goals: String(mem.goals?.length ?? 0),
        decisions: String(mem.decisions?.length ?? 0),
        constraints: String(mem.constraints?.length ?? 0),
        files_touched: String(mem.files_touched?.length ?? 0),
      },
    ];
    console.log(table(memRows));

    // RECENT LEDGER
    console.log('');
    console.log(bold('RECENT LEDGER (last 5)'));
    const events = tailLedger(5);
    if (events.length === 0) {
      console.log(dim('  (no events yet)'));
    } else {
      const agentName = (id?: string): string => {
        if (!id) return '';
        const a = agents.find((x) => x.id === id);
        return a?.name ?? shortId(id);
      };
      const rows = events.map((e) => ({
        when: relative(e.ts),
        type: e.type,
        agent: agentName(e.agent_id),
        summary: (e.summary as string) ?? (e.task as string) ?? '',
      }));
      console.log(table(rows));
    }

    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
