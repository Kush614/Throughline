// Minimal in-process pub/sub. Used to fan out research progress + context
// updates to any subscribed clients (SSE) within a single Next.js server.
//
// Multi-process scenarios (production / serverless) would replace this with
// Redis pub/sub or similar — for the hackathon-grade demo, in-memory is fine.

type Listener = (event: NzEvent) => void;

export type NzEvent = {
  id: string;                  // event id
  ts: string;                  // ISO
  channel: string;             // e.g. "org:atlas", "research:r_abc123"
  type: string;                // e.g. "research.step", "context.update"
  payload: Record<string, unknown>;
};

// Use a `globalThis` slot so dev-mode HMR doesn't strand subscribers.
declare global {
  // eslint-disable-next-line no-var
  var __NZ_BUS:
    | {
        listeners: Map<string, Set<Listener>>;
        ring: NzEvent[];
        seq: number;
      }
    | undefined;
}

const bus =
  globalThis.__NZ_BUS ??
  (globalThis.__NZ_BUS = {
    listeners: new Map<string, Set<Listener>>(),
    ring: [] as NzEvent[],
    seq: 0,
  });

const RING_LIMIT = 500;

export function publish(channel: string, type: string, payload: Record<string, unknown>): NzEvent {
  bus.seq += 1;
  const event: NzEvent = {
    id: `ev_${Date.now().toString(36)}_${bus.seq.toString(36)}`,
    ts: new Date().toISOString(),
    channel,
    type,
    payload,
  };
  bus.ring.push(event);
  if (bus.ring.length > RING_LIMIT) bus.ring.splice(0, bus.ring.length - RING_LIMIT);

  // Fan out to channel listeners AND any wildcard listeners on '*'.
  const groups = [channel, '*'];
  for (const g of groups) {
    const set = bus.listeners.get(g);
    if (set) for (const fn of set) {
      try { fn(event); } catch { /* swallow */ }
    }
  }
  return event;
}

export function subscribe(channel: string, fn: Listener): () => void {
  let set = bus.listeners.get(channel);
  if (!set) {
    set = new Set();
    bus.listeners.set(channel, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) bus.listeners.delete(channel);
  };
}

/** Get events from the in-memory ring buffer, optionally filtered by channel. */
export function recent(channel?: string, limit = 50): NzEvent[] {
  const filtered = channel ? bus.ring.filter((e) => e.channel === channel) : bus.ring;
  return filtered.slice(-limit);
}
