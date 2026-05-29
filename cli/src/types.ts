// Shared types for the nz CLI. The store layer reads/writes these shapes
// to/from JSON files under .nz/. Command handlers and the entry dispatcher
// import from this file only — never from internal store implementation.

export type AgentStatus = 'idle' | 'working' | 'paused' | 'dead';

export interface Agent {
  id: string;
  name: string;
  runtime: string;            // codex, claude-code, cursor, custom, ...
  machine: string;            // hostname
  status: AgentStatus;
  current_task: string;       // empty string when idle
  last_heartbeat: string;     // ISO 8601 UTC-offset string
}

export interface Room {
  room_id: string;
  project: string;
  agents: Agent[];
}

export type LedgerEventType =
  | 'agent_joined'
  | 'heartbeat'
  | 'task_claimed'
  | 'task_released'
  | 'decision'
  | 'failure'
  | 'handoff_created'
  | 'resume_consumed';

export interface LedgerEvent {
  ts: string;                 // ISO 8601
  agent_id?: string;
  type: LedgerEventType;
  task?: string;
  summary?: string;
  // Permissive — commands may stash extra context (file paths, packet ids, ...)
  // without forcing every consumer to model every field.
  [key: string]: unknown;
}

export interface MemoryDecision {
  summary: string;
  reason: string;
  ts?: string;
}

export interface Memory {
  goals: string[];
  constraints: string[];
  decisions: MemoryDecision[];
  rejected_approaches: MemoryDecision[];
  files_touched: string[];
  agent_capabilities?: Record<string, string[]>;
}

export interface ResumePacket {
  goal: string;
  current_state: string;
  completed_work: string[];
  open_tasks: string[];
  decisions: MemoryDecision[];
  failed_attempts: MemoryDecision[];
  next_best_action: string;
  memory_pointers: string[];
  // Optional metadata
  generated_at?: string;
  generated_by?: string;      // agent id
  compressed?: boolean;
}

// Stale heartbeat threshold (ms). After this, an agent is considered dead
// for status/conflict-check purposes even if room.json says "working".
export const HEARTBEAT_STALE_MS = 60_000;
