// memory.json read/write + structured setters.

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { Memory, MemoryDecision } from '../types.js';
import { nowIso } from '../util/time.js';
import { paths } from './paths.js';

const DEFAULT_MEMORY: Memory = {
  goals: [],
  constraints: [],
  decisions: [],
  rejected_approaches: [],
  files_touched: [],
};

function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

function cloneDefault(): Memory {
  return {
    goals: [],
    constraints: [],
    decisions: [],
    rejected_approaches: [],
    files_touched: [],
  };
}

export function readMemory(): Memory {
  const p = paths();
  if (!existsSync(p.memory)) return cloneDefault();
  try {
    const raw = readFileSync(p.memory, 'utf8');
    if (!raw.trim()) return cloneDefault();
    const parsed = JSON.parse(raw) as Partial<Memory>;
    return {
      ...DEFAULT_MEMORY,
      ...parsed,
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      rejected_approaches: Array.isArray(parsed.rejected_approaches)
        ? parsed.rejected_approaches
        : [],
      files_touched: Array.isArray(parsed.files_touched) ? parsed.files_touched : [],
    };
  } catch {
    return cloneDefault();
  }
}

export function writeMemory(m: Memory): void {
  const p = paths();
  atomicWrite(p.memory, JSON.stringify(m, null, 2) + '\n');
}

function toDecision(value: unknown): MemoryDecision {
  if (typeof value === 'string') {
    // "summary | reason" form
    const idx = value.indexOf('|');
    if (idx >= 0) {
      const summary = value.slice(0, idx).trim();
      const reason = value.slice(idx + 1).trim();
      return { summary, reason, ts: nowIso() };
    }
    return { summary: value.trim(), reason: '', ts: nowIso() };
  }
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const summary = typeof v['summary'] === 'string' ? (v['summary'] as string) : '';
    const reason = typeof v['reason'] === 'string' ? (v['reason'] as string) : '';
    const ts = typeof v['ts'] === 'string' ? (v['ts'] as string) : nowIso();
    return { summary, reason, ts };
  }
  return { summary: String(value), reason: '', ts: nowIso() };
}

export function memorySet(key: string, value: unknown): Memory {
  const m = readMemory();
  switch (key) {
    case 'goal':
    case 'goals': {
      if (typeof value === 'string' && value.trim()) m.goals.push(value);
      break;
    }
    case 'constraint':
    case 'constraints': {
      if (typeof value === 'string' && value.trim()) m.constraints.push(value);
      break;
    }
    case 'decision': {
      m.decisions.push(toDecision(value));
      break;
    }
    case 'rejected': {
      m.rejected_approaches.push(toDecision(value));
      break;
    }
    case 'file':
    case 'files': {
      if (typeof value === 'string' && value.trim()) {
        if (!m.files_touched.includes(value)) m.files_touched.push(value);
      }
      break;
    }
    case 'agent_capabilities': {
      if (value && typeof value === 'object') {
        const v = value as { agent_id?: unknown; capabilities?: unknown };
        if (typeof v.agent_id === 'string' && Array.isArray(v.capabilities)) {
          const caps = v.capabilities.filter(
            (c): c is string => typeof c === 'string',
          );
          if (!m.agent_capabilities) m.agent_capabilities = {};
          m.agent_capabilities[v.agent_id] = caps;
        }
      }
      break;
    }
    default: {
      // Top-level merge: assign value directly.
      (m as unknown as Record<string, unknown>)[key] = value;
      break;
    }
  }
  writeMemory(m);
  return m;
}
