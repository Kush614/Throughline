// `nz claim --agent <id> --task <task>` — claim a task for the agent.
// Refuses if another LIVE agent (fresh heartbeat) already holds the same task.

import {
  appendLedger,
  getAgent,
  listAgents,
  updateAgent,
} from '../store/index.js';
import { HEARTBEAT_STALE_MS } from '../types.js';
import { ageMs, nowIso, relative } from '../util/time.js';
import { err, ok, warn } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz claim --agent <agent-id> --task <task>` — claim a task for an agent. Prints a conflict warning and exits non-zero if another live agent already holds the same task.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const agentId = asString(args.flags['agent']);
    const task = asString(args.flags['task']);
    if (!agentId || !task) {
      console.error(err('Usage: nz claim --agent <agent-id> --task <task>'));
      return 1;
    }

    const me = getAgent(agentId);
    if (!me) {
      console.error(err(`Unknown agent: ${agentId}`));
      return 1;
    }

    // Conflict scan — only fresh-heartbeat agents count.
    for (const other of listAgents()) {
      if (other.id === agentId) continue;
      if (!other.current_task) continue;
      if (other.current_task !== task) continue;
      const stale =
        !other.last_heartbeat ||
        ageMs(other.last_heartbeat) > HEARTBEAT_STALE_MS;
      if (stale) continue;
      const when = other.last_heartbeat
        ? relative(other.last_heartbeat)
        : 'recently';
      console.error(
        warn(`Conflict: ${other.name} claimed this task ${when}`),
      );
      return 1;
    }

    const ts = nowIso();
    const updated = updateAgent(agentId, {
      status: 'working',
      current_task: task,
      last_heartbeat: ts,
    });
    appendLedger({
      type: 'task_claimed',
      agent_id: agentId,
      task,
      ts,
    });

    console.log(ok(`${updated.name} claimed: ${task}`));
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
