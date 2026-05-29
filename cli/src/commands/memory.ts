// `nz memory <set|show>` — interact with the room's shared memory document.
//   nz memory set --key <key> --value <value>   → update a single key
//   nz memory show                              → pretty-print memory.json

import { memorySet, readMemory } from '../store/index.js';
import { bold, err, ok } from '../util/fmt.js';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

export const help =
  '`nz memory set --key <key> --value <value>` updates a memory key; `nz memory show` pretty-prints the current memory document.';

function asString(v: string | boolean | undefined): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

// Best-effort coercion so `--value 3` / `--value true` / `--value [a,b]` arrive
// as the right type, while plain strings stay strings.
function coerceValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === '') return raw;
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // fall through to other coercions
    }
  }
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return raw;
}

export async function run(args: CmdArgs): Promise<number> {
  try {
    const sub = args.positional[0];
    if (!sub) {
      console.error(err('Usage: nz memory <set|show>'));
      return 1;
    }

    if (sub === 'show') {
      const mem = readMemory();
      console.log(bold('MEMORY'));
      console.log(JSON.stringify(mem, null, 2));
      return 0;
    }

    if (sub === 'set') {
      const key = asString(args.flags['key']);
      const rawValue = asString(args.flags['value']);
      if (!key || rawValue === undefined) {
        console.error(err('Usage: nz memory set --key <key> --value <value>'));
        return 1;
      }
      memorySet(key, coerceValue(rawValue));
      console.log(ok(`memory.${key} updated`));
      return 0;
    }

    console.error(err(`Unknown subcommand: ${sub}. Use 'set' or 'show'.`));
    return 1;
  } catch (e) {
    console.error(err((e as Error).message));
    return 1;
  }
}
