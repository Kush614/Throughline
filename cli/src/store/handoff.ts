// Resume-packet (.nzr.json) writer + state synthesizer.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Agent, LedgerEvent, MemoryDecision, ResumePacket } from '../types.js';
import { nowIso } from '../util/time.js';
import { readLedger } from './ledger.js';
import { readMemory } from './memory.js';
import { paths } from './paths.js';
import { listAgents } from './room.js';

function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

export function writeHandoff(
  packet: ResumePacket,
): { path: string; packet: ResumePacket } {
  const p = paths();
  const stamped: ResumePacket = {
    ...packet,
    generated_at: packet.generated_at ?? nowIso(),
  };
  mkdirSync(p.handoffDir, { recursive: true });

  const json = JSON.stringify(stamped, null, 2) + '\n';
  atomicWrite(p.latestHandoff, json);

  const safeStamp = (stamped.generated_at ?? nowIso()).replace(/:/g, '-');
  const archive = join(p.handoffDir, `${safeStamp}.nzr.json`);
  atomicWrite(archive, json);

  return { path: p.latestHandoff, packet: stamped };
}

export function readLatestHandoff(): ResumePacket | undefined {
  const p = paths();
  if (!existsSync(p.latestHandoff)) return undefined;
  try {
    const raw = readFileSync(p.latestHandoff, 'utf8');
    if (!raw.trim()) return undefined;
    return JSON.parse(raw) as ResumePacket;
  } catch {
    return undefined;
  }
}

export function buildPacketFromState(currentAgentId?: string): ResumePacket {
  const agents = listAgents();
  const memory = readMemory();
  const ledger = readLedger();

  const agentNameById = new Map<string, string>();
  for (const a of agents) agentNameById.set(a.id, a.name);

  const working: Agent[] = agents.filter(
    (a) => a.status === 'working' && a.current_task.trim().length > 0,
  );

  const completed_work: string[] = ledger
    .filter((e) => e.type === 'task_released' && typeof e['task'] === 'string')
    .map((e) => {
      const task = e['task'] as string;
      const aid = typeof e.agent_id === 'string' ? e.agent_id : '';
      const name = agentNameById.get(aid) ?? aid ?? 'unknown';
      return `${task} (${name})`;
    });

  const open_tasks: string[] = working.map(
    (a) => `${a.current_task} [${a.name}]`,
  );

  const failures: MemoryDecision[] = ledger
    .filter((e: LedgerEvent) => e.type === 'failure')
    .map((e) => {
      const summary =
        typeof e['summary'] === 'string'
          ? (e['summary'] as string)
          : typeof e['task'] === 'string'
            ? (e['task'] as string)
            : 'failure';
      return { summary, reason: 'logged in ledger', ts: e.ts };
    });

  const failed_attempts: MemoryDecision[] = [
    ...memory.rejected_approaches,
    ...failures,
  ];

  const goal = memory.goals[0] ?? 'Continue current agent task';

  let current_state = 'no active work';
  if (working.length > 0) {
    const first = working[0];
    if (first) current_state = first.current_task;
  }

  const next_best_action = open_tasks[0] ?? 'wait for human direction';

  const decisions: MemoryDecision[] = memory.decisions.slice(-10);

  const packet: ResumePacket = {
    goal,
    current_state,
    completed_work,
    open_tasks,
    decisions,
    failed_attempts,
    next_best_action,
    memory_pointers: ['.nz/memory.json', '.nz/ledger.ndjson', '.nz/room.json'],
  };
  if (currentAgentId) packet.generated_by = currentAgentId;
  return packet;
}
