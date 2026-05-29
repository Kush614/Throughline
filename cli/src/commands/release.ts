// `nz release --agent <agent-id>` — release whatever task the agent currently
// holds. Idempotent: releasing an idle agent is allowed (logs an empty task).

import { appendLedger, getAgent, updateAgent } from '../store/index.js';
import { nowIso } from '../util/time.js';
import { err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz release --agent <agent-id>` — release the task currently held by an agent and return the agent to idle status.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const agentId = asString(args.flags['agent']);
    if (!agentId) {
      console.error(err('Usage: nz release --agent <agent-id>'));
      return 1;
    }
    const existing = getAgent(agentId);
    if (!existing) {
      console.error(err(`Unknown agent: ${agentId}`));
      return 1;
    }

    const previousTask = existing.current_task;
    const ts = nowIso();
    const updated = updateAgent(agentId, {
      status: 'idle',
      current_task: '',
      last_heartbeat: ts,
    });
    appendLedger({
      type: 'task_released',
      agent_id: agentId,
      task: previousTask,
      ts,
    });

    console.log(ok(`${updated.name} released task`));
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
