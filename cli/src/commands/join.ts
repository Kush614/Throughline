// `nz join --name <name> --runtime <runtime> [--machine <machine>]`
// Registers a new agent in the room and emits an `agent_joined` ledger event.

import { hostname } from 'node:os';
import { addAgent, appendLedger } from '../store/index.js';
import { newAgentId } from '../util/id.js';
import { err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz join --name <name> --runtime <runtime> [--machine <machine>]` — register an agent in the current room. Returns an agent id used by subsequent commands. Machine defaults to the local hostname.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const name = asString(args.flags['name']);
    const runtime = asString(args.flags['runtime']);
    const machine = asString(args.flags['machine']) ?? hostname();

    if (!name || !runtime) {
      console.error(err('Usage: nz join --name <name> --runtime <runtime>'));
      return 1;
    }

    const id = newAgentId(name, runtime);
    const agent = addAgent({
      id,
      name,
      runtime,
      machine,
      status: 'idle',
      current_task: '',
    });

    appendLedger({
      type: 'agent_joined',
      agent_id: agent.id,
      runtime: agent.runtime,
      machine: agent.machine,
    });

    console.log(ok(`Joined as ${agent.name} (${agent.id}) on ${agent.machine}`));
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
