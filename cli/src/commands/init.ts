// `nz init [path]` — create .nz/ scaffold (room.json, ledger, memory, handoff/).
// Idempotent — calling again on an initialized directory is a no-op message.

import { join, resolve } from 'node:path';
import { ensureInit } from '../store/index.js';
import { err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz init [path]` — initialize a .nz/ directory in the given path (default: current directory). Creates room.json, ledger.ndjson, memory.json, and handoff/. Safe to re-run.';

export async function run(args: CmdArgs): Promise<number> {
  try {
    const positional = args.positional[0];
    const rootArg = positional
      ? join(resolve(positional), '.nz')
      : undefined;
    const result = ensureInit(rootArg);
    if (result.created) {
      console.log(ok(`Initialized .nz/ at ${result.root}`));
    } else {
      console.log(`Already initialized at ${result.root}`);
    }
    return 0;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
