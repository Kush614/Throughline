# nz — git for agent context

`nz` is a local-first control plane for AI agent coordination. It tracks
who's working on what, what got decided, and what the next agent should do
when you (or your colleague's Codex, or last night's Claude session) sit
back down at the keyboard.

Think of it as `git` for the context that lives in your head — except
you're sharing that context with a swarm of agents, not just yourself.

Everything lives in a plain `.nz/` directory beside your code. No daemon,
no SaaS, no telemetry. Just JSON files and an append-only ledger.

## Quick start

```bash
# Install (from inside this repo)
pnpm install

# Initialize a room in your project
nz init

# Join the room as an agent
nz join --name Codex --runtime codex
```

You're live. The other agents in this directory can see you, and any
future `nz resume` will hand the next session a packet describing where
things left off.

## Commands

| Command         | What it does                                              |
| --------------- | --------------------------------------------------------- |
| `init`          | Scaffold `.nz/` in the current project.                   |
| `join`          | Register an agent in the room.                            |
| `heartbeat`     | Refresh an agent's `last_heartbeat`.                      |
| `claim`         | Claim a task — flips status to `working`.                 |
| `release`       | Release a task — flips status back to `idle`.             |
| `log`           | Append an event (decision, failure, note, …) to ledger.   |
| `memory`        | Read or mutate `memory.json` (goals, constraints, …).     |
| `handoff`       | Generate a `.nzr.json` resume packet for the next agent.  |
| `resume`        | Print the latest resume packet and mark it consumed.      |
| `status`        | Show who's in the room and what they're doing.            |
| `conflict-check`| Detect overlapping claims or stale `working` agents.      |
| `help`          | Print top-level help, or `nz help <command>`.             |
| `version`       | Print the CLI version.                                    |

Run `nz help <command>` for full options on any command.

### Global flags

- `-h, --help` — show help (top-level if no command given).
- `-v, --version` — print version.
- `--` — everything after is treated as a verbatim positional argument.

Flags accept `--name value` or `--name=value`. Kebab-case flags are
exposed to handlers as both kebab and camelCase keys.

## The demo script

Copy-paste this top-to-bottom in a fresh directory and watch a full agent
hand-off happen on your machine, with zero network calls:

```bash
nz init
nz join --name Codex --runtime codex
# capture the printed agent id, or read it from .nz/room.json
AGENT=$(jq -r '.agents[0].id' .nz/room.json)

nz claim --agent "$AGENT" --task "build registry"
nz log --agent "$AGENT" --type decision \
       --summary "Use local-first state store"

nz handoff --agent "$AGENT"
nz resume          # prints the packet — paste this into your next session
nz status          # see who's live and stale
```

## `.nz/` directory layout

```
.nz/
├── room.json           # who is in the room (agents, statuses, heartbeats)
├── ledger.ndjson       # append-only event log (one JSON object per line)
├── memory.json         # goals, constraints, decisions, rejected approaches
└── handoff/
    ├── latest.nzr.json # most recent resume packet
    └── *.nzr.json      # historical packets, keyed by timestamp
```

The shapes are formally defined in [`src/types.ts`](./src/types.ts) — every
read/write goes through the store layer in [`src/store/`](./src/store/).

## Develop locally

```bash
pnpm install            # one-time
pnpm run nz -- help     # invoke the dispatcher under tsx
pnpm run dev help       # alias for the above
pnpm test               # run the e2e suite (node:test)
pnpm run build          # compile TS → dist/
```

Or use the bin shim directly without building:

```bash
node bin/nz help        # dev fallback transparently shells out to tsx
```

On POSIX, make the shim executable once:

```bash
chmod +x bin/nz
./bin/nz help
```

On Windows, `nz.cmd` does the equivalent — `npm` and `pnpm` pick it up
automatically when the package is installed globally.

## Troubleshooting

**`nz: neither dist/index.js nor src/index.ts found near bin/nz`**
You ran the bin shim from a stripped install. Run `pnpm install` and
`pnpm run build`, or run via `pnpm run dev` instead.

**`Unknown command "foo"`**
The dispatcher prints a `Did you mean "<closest>"?` hint when your typo
is within edit-distance 3 of a known command. Run `nz help` to see the
full list.

**Tests fail with "Cannot find module './commands/<x>.js'"**
That command file hasn't been written yet. The dispatcher itself works,
but the e2e suite exercises each command end-to-end — if your branch is
mid-build, expect those tests to flake until the command layer lands.

**`process.argv[1]` doesn't match `import.meta.url` on Windows**
The bin shim sets `NZ_RUN=1` precisely so the dispatcher can detect "I'm
the entry point" without comparing paths across drive-letter casings.
If you're embedding `src/index.ts` programmatically, do NOT set `NZ_RUN`
— the module will then expose `main()` and `parseArgs()` without
auto-running.

## License

Internal hackathon project. See repo root for licensing.
