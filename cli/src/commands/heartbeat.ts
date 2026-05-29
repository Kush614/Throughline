// `nz heartbeat --agent <agent-id>` — refresh the agent's last_heartbeat and
// append a `heartbeat` ledger event. Used by daemons / wrappers to mark liveness.

import { appendLedger, getAgent, updateAgent } from '../store/index.js';
import { nowIso } from '../util/time.js';
import { err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz heartbeat --agent <agent-id>` — update the agent\'s heartbeat timestamp and append a heartbeat event to the ledger.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const agentId = asString(args.flags['agent']);
    if (!agentId) {
      console.error(err('Usage: nz heartbeat --agent <agent-id>'));
      return 1;
    }
    const existing = getAgent(agentId);
    if (!existing) {
      console.error(err(`Unknown agent: ${agentId}`));
      return 1;
    }

    const ts = nowIso();
    const updated = updateAgent(agentId, { last_heartbeat: ts });
    appendLedger({ type: 'heartbeat', agent_id: agentId, ts });

    console.log(ok(`Heartbeat from ${updated.name} at ${ts}`));
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
