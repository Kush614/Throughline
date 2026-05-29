// room.json read/write + agent CRUD.

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { Agent, Room } from '../types.js';
import { nowIso } from '../util/time.js';
import { paths } from './paths.js';

const DEFAULT_ROOM: Room = {
  room_id: 'demo-room',
  project: 'NeverZero Mission Control',
  agents: [],
};

function atomicWrite(path: string, content: string): void {
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, path);
}

export function readRoom(): Room {
  const p = paths();
  if (!existsSync(p.room)) return { ...DEFAULT_ROOM, agents: [] };
  try {
    const raw = readFileSync(p.room, 'utf8');
    if (!raw.trim()) return { ...DEFAULT_ROOM, agents: [] };
    const parsed = JSON.parse(raw) as Room;
    if (!Array.isArray(parsed.agents)) parsed.agents = [];
    return parsed;
  } catch {
    return { ...DEFAULT_ROOM, agents: [] };
  }
}

export function writeRoom(room: Room): void {
  const p = paths();
  atomicWrite(p.room, JSON.stringify(room, null, 2) + '\n');
}

export function listAgents(): Agent[] {
  return readRoom().agents;
}

export function getAgent(id: string): Agent | undefined {
  return listAgents().find((a) => a.id === id);
}

export function addAgent(input: Omit<Agent, 'last_heartbeat'>): Agent {
  const room = readRoom();
  const existing = room.agents.findIndex((a) => a.id === input.id);
  const agent: Agent = { ...input, last_heartbeat: nowIso() };
  if (existing >= 0) {
    room.agents[existing] = agent;
  } else {
    room.agents.push(agent);
  }
  writeRoom(room);
  return agent;
}

export function updateAgent(id: string, patch: Partial<Agent>): Agent {
  const room = readRoom();
  const idx = room.agents.findIndex((a) => a.id === id);
  if (idx < 0) throw new Error(`Agent not found: ${id}`);
  const current = room.agents[idx] as Agent;
  const updated: Agent = { ...current, ...patch, id: current.id };
  room.agents[idx] = updated;
  writeRoom(room);
  return updated;
}

export function removeAgent(id: string): boolean {
  const room = readRoom();
  const before = room.agents.length;
  room.agents = room.agents.filter((a) => a.id !== id);
  if (room.agents.length === before) return false;
  writeRoom(room);
  return true;
}
