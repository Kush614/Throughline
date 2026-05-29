// Time helpers for nz. ISO 8601 UTC strings + human-friendly relative formatting.

export function nowIso(): string {
  return new Date().toISOString();
}

export function ageMs(iso: string, fromIso?: string): number {
  const from = fromIso ? Date.parse(fromIso) : Date.now();
  const t = Date.parse(iso);
  if (Number.isNaN(t) || Number.isNaN(from)) return 0;
  return from - t;
}

export function relative(iso: string, fromIso?: string): string {
  const diff = ageMs(iso, fromIso);
  const abs = Math.abs(diff);
  if (abs < 2_000) return 'just now';
  const sec = Math.floor(abs / 1_000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}
