// `nz conflict-check --task <task>` — see if any live agent is already working
// on a task whose description contains (case-insensitive) the given string.
// Exit code 0 = no conflict, 1 = at least one conflict.

import { listAgents } from '../store/index.js';
import { HEARTBEAT_STALE_MS } from '../types.js';
import { ageMs, relative } from '../util/time.js';
import { dim, err, ok, warn } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz conflict-check --task <task>` — check whether any live agent (fresh heartbeat) is already working on a matching task. Returns exit 1 on conflict.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const task = asString(args.flags['task']);
    if (!task) {
      console.error(err('Usage: nz conflict-check --task <task>'));
      return 1;
    }

    const needle = task.toLowerCase();
    const conflicts = listAgents().filter((a) => {
      if (!a.current_task) return false;
      if (!a.current_task.toLowerCase().includes(needle)) return false;
      if (!a.last_heartbeat) return false;
      return ageMs(a.last_heartbeat) <= HEARTBEAT_STALE_MS;
    });

    if (conflicts.length === 0) {
      console.log(ok(`No conflict — ${task} is free.`));
      return 0;
    }

    for (const a of conflicts) {
      const when = a.last_heartbeat ? relative(a.last_heartbeat) : 'recently';
      console.error(
        warn(
          `${a.name} (${a.runtime}) is on "${a.current_task}" ${dim(`· heartbeat ${when}`)}`,
        ),
      );
    }
    return 1;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
