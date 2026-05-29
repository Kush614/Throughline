// `nz handoff [--agent <id>] [--compress]` — snapshot the room into a resume
// packet that a future agent can load to pick up where work was left.

import {
  appendLedger,
  buildPacketFromState,
  writeHandoff,
} from '../store/index.js';
import { bold, dim, err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz handoff [--agent <agent-id>] [--compress]` — write a resume packet derived from the current room state to .nz/handoff/. Pass --compress to flag the packet for downstream summarization.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const agentId = asString(args.flags['agent']);
    const compress = args.flags['compress'] === true || args.flags['compress'] === 'true';

    const packet = buildPacketFromState(agentId);
    if (compress) {
      packet.compressed = true;
    }

    const result = writeHandoff(packet);

    appendLedger({
      type: 'handoff_created',
      agent_id: agentId,
      path: result.path,
    });

    console.log(bold('HANDOFF'));
    console.log(`  ${bold('Goal:')}              ${packet.goal || dim('(none set)')}`);
    console.log(
      `  ${bold('Current state:')}     ${packet.current_state || dim('(none)')}`,
    );
    console.log(
      `  ${bold('Next best action:')}  ${packet.next_best_action || dim('(none)')}`,
    );
    if (compress) {
      console.log(dim('  (compress flag set — downstream summarizer will be applied)'));
    }
    console.log(ok(`Wrote ${result.path}`));
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
