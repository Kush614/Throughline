// ZeroEntropy adapter — compress messy agent context into a small packet.
// Same shape as the call site we'd use against the real ZeroEntropy API; today
// the implementation is a deterministic local compressor so the demo is
// hermetic. Swapping in the real adapter is one fetch().

export const ZEROENTROPY_PROVIDER = 'zeroentropy' as const;

export interface ZECompressInput {
  text: string;
  maxChars?: number;
}

export interface ZEPacket {
  summary: string;
  blockers: string[];
  nextAction: string;
  decisions: string[];
}

/** Compress a long piece of markdown / log text into a TL;DR string. */
export function compress(input: ZECompressInput): string {
  const max = input.maxChars ?? 280;
  const cleaned = input.text
    .replace(/^#+ .*$/gm, '')
    .replace(/^> .*$/gm, '')
    .replace(/^_+.*_+$/gm, '')
    .replace(/[-*]\s+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length <= max ? cleaned : cleaned.slice(0, max - 1) + '…';
}

/** Build a structured Resume/Handoff packet from raw room text. */
export function packetize(input: { text: string; goal: string }): ZEPacket {
  const blockers = extractMatches(input.text, /(?:^|\n)\s*[-*]\s*(?:blocker|blocked by|risk)\s*[:\-]\s*(.+)/gi);
  const decisions = extractMatches(input.text, /(?:^|\n)\s*[-*]\s*(?:decision|decided)\s*[:\-]\s*(.+)/gi);
  return {
    summary: compress({ text: input.text, maxChars: 240 }),
    blockers,
    decisions,
    nextAction: extractFirst(input.text, /(?:next action|next step)\s*[:\-]\s*(.+)/i) || `Continue toward: ${input.goal}`,
  };
}

function extractMatches(text: string, re: RegExp): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[1]) out.push(m[1].trim());
  }
  return out.slice(0, 6);
}

function extractFirst(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  return m && m[1] ? m[1].trim() : null;
}
