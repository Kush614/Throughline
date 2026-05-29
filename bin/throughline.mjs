#!/usr/bin/env node
// throughline — pull a shipped context image and resume from it.
//   throughline pull <org>/<tag>[@sha256:...]
// Talks to a running Throughline server (THROUGHLINE_HOST, default :4000).

const [cmd, arg] = process.argv.slice(2);
const HOST = (process.env.THROUGHLINE_HOST || 'http://localhost:4000').replace(/\/$/, '');

const C = { pink: '\x1b[38;5;213m', dim: '\x1b[2m', bold: '\x1b[1m', green: '\x1b[32m', yellow: '\x1b[33m', reset: '\x1b[0m' };

if (cmd !== 'pull' || !arg) {
  console.error('usage: throughline pull <org>/<tag>[@sha256:<digest>]');
  process.exit(1);
}

const [ref, digest] = arg.split('@');
const u = new URL(HOST + '/api/pull');
u.searchParams.set('ref', ref);
if (digest) u.searchParams.set('digest', digest);

try {
  const res = await fetch(u);
  const d = await res.json();
  if (!res.ok) {
    console.error(`${C.yellow}✗ ${d.error || ('HTTP ' + res.status)}${C.reset}`);
    process.exit(1);
  }

  process.stdout.write(`\n${C.pink}${C.bold}◆ Pulling ${d.ref}${C.reset}${C.dim}@${d.digest}${C.reset}\n`);
  if (d.requestedDigest) {
    process.stdout.write(
      d.digestMatch
        ? `${C.green}✓ digest verified — context unchanged since it was shipped${C.reset}\n`
        : `${C.yellow}⚠ memory has changed since this was shipped — pulling the current image${C.reset}\n`,
    );
  }
  const layers = (d.layers || []).map((l) => `${l.kind}×${l.count}`).join('  ');
  process.stdout.write(`${C.dim}layers:${C.reset} ${layers || '(none)'}  ${C.dim}·${C.reset}  ${d.memoryCount} memories\n`);

  process.stdout.write(`\n${C.dim}── resumed context ───────────────────────────────────${C.reset}\n\n`);
  const body = d.contextPrompt
    || ((d.memories || []).map((m) => `${C.pink}•${C.reset} ${C.dim}[${m.kind}]${C.reset} ${m.text}`).join('\n\n'))
    || '(no assembled context for this session)';
  process.stdout.write(body + '\n');
  process.stdout.write(`\n${C.dim}──────────────────────────────────────────────────────${C.reset}\n`);
  process.stdout.write(`${C.green}✓ Context loaded.${C.reset} A new agent can continue from here with zero re-explaining.\n\n`);
} catch (err) {
  console.error(`${C.yellow}✗ Could not reach Throughline at ${HOST} — is the server running?${C.reset}`);
  console.error(C.dim + String(err) + C.reset);
  process.exit(1);
}
