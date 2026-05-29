// nz CLI — top-level argv dispatcher.
//
// Parses process.argv into a (command, CmdArgs) pair, then dynamic-imports
// the command module from ./commands/<name>.js and awaits its `run()`.
//
// Argument parsing rules:
//   - The first non-flag positional is the command name.
//   - Subsequent positionals accumulate into args.positional.
//   - `--flag value`      → args.flags.flag = "value"
//   - `--flag=value`      → args.flags.flag = "value"
//   - `--bool-flag` with no value (next token is another --flag or end of
//     argv) → args.flags.boolFlag = true.
//   - Short -h / --help anywhere → args.flags.help = true.
//   - Everything after a literal `--` separator is pushed verbatim into
//     args.positional (escape hatch for passing through raw text).
//
// kebab-case flags are normalised to camelCase keys so command handlers
// can read either form via flags["my-flag"] or flags.myFlag — for
// consistency this dispatcher writes BOTH spellings into args.flags.

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

export interface CmdArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

interface CommandModule {
  run: (args: CmdArgs) => Promise<number>;
  help: string;
}

const KNOWN_COMMANDS = [
  'init',
  'join',
  'heartbeat',
  'claim',
  'release',
  'log',
  'memory',
  'handoff',
  'resume',
  'status',
  'conflict-check',
] as const;

type KnownCommand = (typeof KNOWN_COMMANDS)[number];

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function setFlag(
  flags: Record<string, string | boolean>,
  key: string,
  value: string | boolean,
): void {
  flags[key] = value;
  const camel = kebabToCamel(key);
  if (camel !== key) flags[camel] = value;
}

export function parseArgs(argv: string[]): { command: string; args: CmdArgs } {
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let command = '';
  let sawDoubleDash = false;

  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]!;

    if (sawDoubleDash) {
      positional.push(tok);
      continue;
    }

    if (tok === '--') {
      sawDoubleDash = true;
      continue;
    }

    if (tok === '-h' || tok === '--help') {
      setFlag(flags, 'help', true);
      continue;
    }

    if (tok === '--version' || tok === '-v') {
      setFlag(flags, 'version', true);
      continue;
    }

    if (tok.startsWith('--')) {
      const body = tok.slice(2);
      const eq = body.indexOf('=');
      if (eq >= 0) {
        const k = body.slice(0, eq);
        const v = body.slice(eq + 1);
        setFlag(flags, k, v);
      } else {
        const k = body;
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('-')) {
          setFlag(flags, k, next);
          i++;
        } else {
          setFlag(flags, k, true);
        }
      }
      continue;
    }

    if (tok.startsWith('-') && tok.length > 1) {
      // Short flag (single char). Treat as boolean unless next is non-flag.
      const k = tok.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('-')) {
        setFlag(flags, k, next);
        i++;
      } else {
        setFlag(flags, k, true);
      }
      continue;
    }

    // Positional
    if (!command) {
      command = tok;
    } else {
      positional.push(tok);
    }
  }

  return { command, args: { positional, flags } };
}

// Tiny Levenshtein for "did you mean…?" hints. n*m on short strings is fine.
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1,
        (curr[j - 1] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j] ?? 0;
  }
  return prev[n] ?? 0;
}

function suggestCommand(input: string): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of KNOWN_COMMANDS) {
    const d = levenshtein(input, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist <= 3 ? best : null;
}

function readPackageJson(): { version: string; name: string } {
  // bin shims and tsx loader both end up with import.meta.url pointing at
  // either dist/index.js or src/index.ts — package.json sits one level up
  // from each. Resolve relative to this file.
  const here = dirname(fileURLToPath(import.meta.url));
  // Try ../package.json (works for src/index.ts and dist/index.js).
  const candidates = [
    resolve(here, '../package.json'),
    resolve(here, '../../package.json'),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, 'utf8');
      const parsed = JSON.parse(raw) as { version?: string; name?: string };
      if (parsed.version) {
        return { version: parsed.version, name: parsed.name ?? 'nz' };
      }
    } catch {
      // try next
    }
  }
  return { version: '0.0.0', name: 'nz' };
}

async function loadCommand(name: string): Promise<CommandModule | null> {
  try {
    // ESM import — .js extension is correct even when the source is .ts,
    // because TS compiles to .js and tsx resolves .ts via the loader.
    const mod = (await import(`./commands/${name}.js`)) as CommandModule;
    if (typeof mod.run !== 'function' || typeof mod.help !== 'string') {
      return null;
    }
    return mod;
  } catch (err) {
    // Surface "module not found" as null so callers can show a nice hint.
    const code = (err as NodeJS.ErrnoException | { code?: string }).code;
    if (
      code === 'ERR_MODULE_NOT_FOUND' ||
      code === 'MODULE_NOT_FOUND' ||
      (err instanceof Error && /Cannot find module/i.test(err.message))
    ) {
      return null;
    }
    throw err;
  }
}

async function printTopLevelHelp(): Promise<void> {
  const { version } = readPackageJson();
  const lines: string[] = [];
  lines.push(`nz ${version} — git for agent context`);
  lines.push('');
  lines.push('Usage: nz <command> [options]');
  lines.push('');
  lines.push('Commands:');
  // Best-effort: load each command for its first help line. If a command
  // module isn't written yet, fall back to a placeholder so the dispatcher
  // is useful even mid-build.
  const rows: Array<[string, string]> = [];
  for (const c of KNOWN_COMMANDS) {
    const mod = await loadCommand(c);
    const first = mod ? (mod.help.split('\n')[0] ?? '').trim() : '(not implemented yet)';
    rows.push([c, first]);
  }
  rows.push(['help', 'Show this help, or `nz help <command>` for a command.']);
  rows.push(['version', 'Print the CLI version and exit.']);
  const pad = Math.max(...rows.map(([n]) => n.length));
  for (const [n, d] of rows) {
    lines.push(`  ${n.padEnd(pad)}  ${d}`);
  }
  lines.push('');
  lines.push('Global flags:');
  lines.push('  -h, --help      Show help for the command (or top-level if none given).');
  lines.push('  -v, --version   Print version.');
  lines.push('');
  lines.push('Examples:');
  lines.push('  nz init');
  lines.push('  nz join --name Codex --runtime codex');
  lines.push('  nz claim --agent <id> --task "build registry"');
  lines.push('  nz handoff --agent <id> && nz resume');
  process.stdout.write(lines.join('\n') + '\n');
}

async function printCommandHelp(name: string): Promise<number> {
  const mod = await loadCommand(name);
  if (!mod) {
    process.stderr.write(`nz: unknown command "${name}"\n`);
    const hint = suggestCommand(name);
    if (hint) process.stderr.write(`Did you mean "${hint}"?\n`);
    return 1;
  }
  process.stdout.write(mod.help.trim() + '\n');
  return 0;
}

export async function main(argv: string[]): Promise<number> {
  const { command, args } = parseArgs(argv);

  // Top-level --version / -v.
  if (args.flags.version && !command) {
    const { version } = readPackageJson();
    process.stdout.write(`nz ${version}\n`);
    return 0;
  }

  // No command, or explicit `help`.
  if (!command || command === 'help') {
    // `nz help <command>` → per-command help.
    const target = args.positional[0];
    if (target) return printCommandHelp(target);
    await printTopLevelHelp();
    return 0;
  }

  // `nz <cmd> --help`
  if (args.flags.help) {
    return printCommandHelp(command);
  }

  // `nz version` as a subcommand alias.
  if (command === 'version') {
    const { version } = readPackageJson();
    process.stdout.write(`nz ${version}\n`);
    return 0;
  }

  const mod = await loadCommand(command);
  if (!mod) {
    process.stderr.write(`nz: unknown command "${command}"\n`);
    const hint = suggestCommand(command);
    if (hint) {
      process.stderr.write(`Did you mean "${hint}"?\n`);
    } else {
      process.stderr.write(`Run "nz help" to see available commands.\n`);
    }
    return 1;
  }

  return mod.run(args);
}

// Entry point: run when executed directly OR when imported by the bin shim.
//
// The POSIX/Windows bin shim does `await import(dist/index.js)`, in which
// case `process.argv[1]` points at the bin script — not this module. So we
// also opt-in via `NZ_RUN=1` from the shim. Tests that import this module
// for unit-level access should NOT have NZ_RUN set.
const isDirectRun = (() => {
  if (process.env.NZ_RUN === '1') return true;
  try {
    const thisUrl = import.meta.url;
    const argv1 = process.argv[1];
    if (!argv1) return false;
    if (thisUrl === pathToFileURL(argv1).href) return true;
    // tsx loader: argv1 is a .ts path; import.meta.url is the same .ts file.
    const thisFile = fileURLToPath(thisUrl);
    return resolve(thisFile) === resolve(argv1);
  } catch {
    return false;
  }
})();

if (isDirectRun) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exit(code);
    })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(`nz: ${msg}\n`);
      if (process.env.NZ_DEBUG && err instanceof Error && err.stack) {
        process.stderr.write(err.stack + '\n');
      }
      process.exit(1);
    });
}
