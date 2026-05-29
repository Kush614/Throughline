// `nz resume [--agent <id>]` — read the most recent handoff packet and print
// it in a human-friendly layout. Also records a `resume_consumed` ledger event
// so the room can see who picked up the work.

import { appendLedger, readLatestHandoff } from '../store/index.js';
import { bold, dim, err } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz resume [--agent <agent-id>]` — print the latest resume packet and log a resume_consumed ledger event.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function printList(label: string, items: string[]): void {
  console.log(bold(label));
  if (items.length === 0) {
    console.log(`  ${dim('(none)')}`);
    return;
  }
  for (const item of items) {
    console.log(`  · ${item}`);
  }
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const agentId = asString(args.flags['agent']);
    const packet = readLatestHandoff();
    if (!packet) {
      console.error(err('No handoff packet yet. Run `nz handoff` first.'));
      return 1;
    }

    appendLedger({
      type: 'resume_consumed',
      agent_id: agentId,
      generated_at: packet.generated_at,
    });

    console.log(bold('GOAL'));
    console.log(`  ${packet.goal || dim('(none set)')}`);
    console.log('');
    console.log(bold('CURRENT STATE'));
    console.log(`  ${packet.current_state || dim('(none)')}`);
    console.log('');
    console.log(bold('NEXT BEST ACTION'));
    console.log(`  ${packet.next_best_action || dim('(none)')}`);
    console.log('');
    printList('OPEN TASKS', packet.open_tasks ?? []);
    console.log('');
    const decisionLines = (packet.decisions ?? []).map((d) =>
      d.reason ? `${d.summary} — ${d.reason}` : d.summary,
    );
    printList('RECENT DECISIONS', decisionLines);
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
