// End-to-end smoke suite for the nz CLI.
//
// Each test creates a fresh temp dir, chdirs in, then drives the CLI via
// real `spawnSync` against src/index.ts under the tsx loader. We assert on
// stdout/stderr/exit code AND on the contents of the .nz/ files the
// command handlers are expected to write.
//
// This file runs against the live command implementations (init, join,
// claim, log, handoff, resume, status). If a command isn't implemented
// yet, its test will fail with a clear "not implemented" message — that
// is intentional, since the e2e suite is the contract between the
// dispatcher and the command layer.

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI_ROOT = resolve(HERE, '..');
const ENTRY = resolve(CLI_ROOT, 'src', 'index.ts');

// Resolve `tsx/esm` from CLI_ROOT once so spawned children running with a
// tmp `cwd` can still find the loader (otherwise Node resolves the loader
// specifier relative to cwd's node_modules and fails).
const require = createRequire(import.meta.url);
const TSX_LOADER: string = (() => {
  try {
    // tsx exposes `esm` as an entry in package.json's exports.
    const pkgPath = require.resolve('tsx/package.json', { paths: [CLI_ROOT] });
    const pkgDir = dirname(pkgPath);
    // tsx 4.x ships ./dist/esm/index.mjs as the esm loader.
    const candidates = [
      resolve(pkgDir, 'dist', 'esm', 'index.mjs'),
      resolve(pkgDir, 'dist', 'esm.mjs'),
    ];
    for (const c of candidates) {
      if (existsSync(c)) return pathToFileURL(c).href;
    }
    // Fallback: just use the bare specifier — works if NODE_PATH is set.
    return 'tsx/esm';
  } catch {
    return 'tsx/esm';
  }
})();

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

function runNz(cwd: string, args: string[]): RunResult {
  const r: SpawnSyncReturns<string> = spawnSync(
    process.execPath,
    ['--import', TSX_LOADER, ENTRY, ...args],
    {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, NZ_RUN: '1' },
    },
  );
  return {
    status: r.status ?? -1,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
  };
}

function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function readNdjson(path: string): Array<Record<string, unknown>> {
  const raw = readFileSync(path, 'utf8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

// ───────────────────────── Dispatcher (always passes) ─────────────────────

describe('nz dispatcher', () => {
  test('`nz help` lists commands and exits 0', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'nz-disp-'));
    try {
      const r = runNz(tmp, ['help']);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /init/);
      assert.match(r.stdout, /join/);
      assert.match(r.stdout, /handoff/);
      assert.match(r.stdout, /resume/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('`nz` with no args prints top-level help', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'nz-disp-'));
    try {
      const r = runNz(tmp, []);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /Usage:\s+nz\s+<command>/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('`nz --version` prints the package version', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'nz-disp-'));
    try {
      const r = runNz(tmp, ['--version']);
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^nz \d+\.\d+\.\d+/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('unknown command produces a helpful error and exit 1', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'nz-disp-'));
    try {
      const r = runNz(tmp, ['initt']);
      assert.equal(r.status, 1);
      assert.match(r.stderr, /unknown command "initt"/);
      assert.match(r.stderr, /Did you mean "init"\?/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ──────────────────────── Demo flow (E2E) ────────────────────────────────
//
// The full demo described in the spec: init → join → claim → log → handoff
// → resume → status. We keep state in a single tmp dir across the
// describe-block so each step builds on the previous.

describe('nz demo flow', () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'nz-e2e-'));
  });

  afterEach(() => {
    if (tmp && existsSync(tmp)) {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('full demo: init → join → claim → log → handoff → resume → status', () => {
    // 1) init
    {
      const r = runNz(tmp, ['init']);
      assert.equal(r.status, 0, `init failed: ${r.stderr}`);
      const nzDir = join(tmp, '.nz');
      assert.ok(existsSync(nzDir), '.nz/ directory should exist');
      assert.ok(existsSync(join(nzDir, 'room.json')), '.nz/room.json should exist');
      assert.ok(existsSync(join(nzDir, 'ledger.ndjson')), '.nz/ledger.ndjson should exist');
      assert.ok(existsSync(join(nzDir, 'memory.json')), '.nz/memory.json should exist');
      const handoffDir = join(nzDir, 'handoff');
      assert.ok(existsSync(handoffDir), '.nz/handoff/ should exist');
      assert.ok(statSync(handoffDir).isDirectory(), '.nz/handoff/ should be a directory');
    }

    // 2) join
    let agentId = '';
    {
      const r = runNz(tmp, ['join', '--name', 'Codex', '--runtime', 'codex']);
      assert.equal(r.status, 0, `join failed: ${r.stderr}`);
      const room = readJson<{ agents: Array<{ id: string; name: string; runtime: string }> }>(
        join(tmp, '.nz', 'room.json'),
      );
      assert.ok(Array.isArray(room.agents));
      const me = room.agents.find((a) => a.name === 'Codex');
      assert.ok(me, 'agent "Codex" should be in room.json');
      assert.equal(me!.runtime, 'codex');
      agentId = me!.id;
      assert.ok(agentId, 'agent should have a non-empty id');

      const ledger = readNdjson(join(tmp, '.nz', 'ledger.ndjson'));
      assert.ok(
        ledger.some((e) => e.type === 'agent_joined'),
        'ledger should contain an agent_joined event',
      );
    }

    // 3) claim
    {
      const r = runNz(tmp, ['claim', '--agent', agentId, '--task', 'build registry']);
      assert.equal(r.status, 0, `claim failed: ${r.stderr}`);
      const room = readJson<{ agents: Array<{ id: string; status: string; current_task: string }> }>(
        join(tmp, '.nz', 'room.json'),
      );
      const me = room.agents.find((a) => (a as { id: string }).id === agentId)!;
      assert.equal(me.status, 'working');
      assert.equal(me.current_task, 'build registry');

      const ledger = readNdjson(join(tmp, '.nz', 'ledger.ndjson'));
      assert.ok(ledger.some((e) => e.type === 'task_claimed'));
    }

    // 4) log decision
    {
      const r = runNz(tmp, [
        'log',
        '--agent',
        agentId,
        '--type',
        'decision',
        '--summary',
        'Use local-first state store',
      ]);
      assert.equal(r.status, 0, `log failed: ${r.stderr}`);
      const ledger = readNdjson(join(tmp, '.nz', 'ledger.ndjson'));
      assert.ok(
        ledger.some(
          (e) =>
            e.type === 'decision' &&
            typeof e.summary === 'string' &&
            (e.summary as string).includes('local-first'),
        ),
        'ledger should contain the decision event',
      );

      const memory = readJson<{ decisions: Array<{ summary: string }> }>(
        join(tmp, '.nz', 'memory.json'),
      );
      assert.ok(
        memory.decisions.some((d) => d.summary.includes('local-first')),
        'memory.decisions should contain the new decision',
      );
    }

    // 5) handoff
    {
      const r = runNz(tmp, ['handoff', '--agent', agentId]);
      assert.equal(r.status, 0, `handoff failed: ${r.stderr}`);
      const latest = join(tmp, '.nz', 'handoff', 'latest.nzr.json');
      assert.ok(existsSync(latest), '.nz/handoff/latest.nzr.json should exist');
      const packet = readJson<{
        goal?: string;
        current_state?: string;
        next_best_action?: string;
      }>(latest);
      assert.equal(typeof packet.goal, 'string');
      assert.equal(typeof packet.current_state, 'string');
      assert.equal(typeof packet.next_best_action, 'string');
      assert.ok((packet.next_best_action ?? '').length > 0, 'next_best_action should be populated');
    }

    // 6) resume
    {
      const r = runNz(tmp, ['resume']);
      assert.equal(r.status, 0, `resume failed: ${r.stderr}`);
      assert.match(r.stdout, /local-first/);
      const ledger = readNdjson(join(tmp, '.nz', 'ledger.ndjson'));
      assert.ok(ledger.some((e) => e.type === 'resume_consumed'));
    }

    // 7) status
    {
      const r = runNz(tmp, ['status']);
      assert.equal(r.status, 0, `status failed: ${r.stderr}`);
      // Don't pin the exact format; just sanity check.
      assert.ok(r.stdout.length > 0);
    }
  });
});
