// Terminal formatting helpers. Zero-dep ANSI. Respects NO_COLOR.

const noColor = (): boolean => Boolean(process.env['NO_COLOR']);

const wrap = (code: string, s: string): string =>
  noColor() ? s : `\x1b[${code}m${s}\x1b[0m`;

export function bold(s: string): string {
  return wrap('1', s);
}

export function dim(s: string): string {
  return wrap('2', s);
}

export function ok(s: string): string {
  const mark = wrap('32', '✓'); // green ✓
  return `${mark} ${s}`;
}

export function warn(s: string): string {
  const mark = wrap('33', '⚠'); // yellow ⚠
  return `${mark} ${s}`;
}

export function err(s: string): string {
  const mark = wrap('31', '✗'); // red ✗
  return `${mark} ${s}`;
}

export function table(rows: Record<string, string>[]): string {
  if (rows.length === 0) return '(empty)';

  // Collect column order from first appearance across all rows.
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    }
  }

  // Compute column widths.
  const widths: Record<string, number> = {};
  for (const c of cols) widths[c] = c.length;
  for (const row of rows) {
    for (const c of cols) {
      const v = row[c] ?? '';
      const len = String(v).length;
      const cur = widths[c] ?? 0;
      if (len > cur) widths[c] = len;
    }
  }

  const pad = (s: string, w: number): string =>
    s.length >= w ? s : s + ' '.repeat(w - s.length);

  const header = cols.map((c) => bold(pad(c, widths[c] ?? c.length))).join('  ');
  const sep = cols.map((c) => '-'.repeat(widths[c] ?? c.length)).join('  ');
  const body = rows
    .map((row) =>
      cols.map((c) => pad(String(row[c] ?? ''), widths[c] ?? c.length)).join('  '),
    )
    .join('\n');

  return `${header}\n${sep}\n${body}`;
}
