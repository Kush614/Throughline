// Public store API surface. The implementation files (room.ts, ledger.ts,
// memory.ts, handoff.ts) re-export their exports through here so commands
// import from one place and stay decoupled from internal layout.

export * from './paths.js';
export * from './room.js';
export * from './ledger.js';
export * from './memory.js';
export * from './handoff.js';

// Setup helper used by `nz init`. Creates .nz/ + seed files if missing.
// Idempotent — safe to call repeatedly.
export { ensureInit } from './init.js';
