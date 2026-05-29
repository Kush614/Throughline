// The Hog API client. Auth uses X-Access-Key + X-Secret-Key headers (not Bearer).
// Endpoints currently exposed on the demo tenant: companies/search, people/search.
// deep-research / signals / people/enrich 404 — we fall back gracefully.

export const HOG_BASE = process.env.HOG_BASE_URL || 'https://developer.thehog.ai';

function hogHeaders(): HeadersInit | null {
  const access =
    process.env.HOG_ACCESS_KEY ||
    process.env.THEHOG_API_KEY ||
    process.env.HOG_API_KEY;
  const secret =
    process.env.HOG_SECRET_KEY ||
    process.env.THEHOG_API_SECRET ||
    process.env.HOG_API_SECRET;
  if (!access || !secret) return null;
  return {
    'X-Access-Key': access,
    'X-Secret-Key': secret,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

export interface HogCompany {
  id?: string;
  name?: string;
  domain?: string;
  industry?: string;
  description?: string;
  employees?: string | number;
  hq?: string;
  url?: string;
  [k: string]: unknown;
}

export interface HogPerson {
  id?: string;
  name?: string;
  title?: string;
  company?: string;
  linkedin?: string;
  [k: string]: unknown;
}

async function hogPost(path: string, body: unknown, timeoutMs = 15_000): Promise<unknown> {
  const headers = hogHeaders();
  if (!headers) throw new Error('Hog credentials missing (HOG_ACCESS_KEY / HOG_SECRET_KEY).');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${HOG_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
    if (!res.ok) {
      const detail = json && typeof json === 'object' ? JSON.stringify(json) : text;
      throw new Error(`Hog ${path} returned ${res.status}: ${detail.slice(0, 240)}`);
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

function pluck<T>(obj: unknown, keys: string[]): T[] {
  if (!obj || typeof obj !== 'object') return [];
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (Array.isArray(v)) return v as T[];
  }
  // Sometimes the API wraps results in {data: [...]}
  const data = o.data;
  if (Array.isArray(data)) return data as T[];
  return [];
}

export async function hogCompaniesSearch(query: string, limit = 5): Promise<HogCompany[]> {
  const out = await hogPost('/api/v1/companies/search', { query, limit });
  return pluck<HogCompany>(out, ['results', 'companies', 'items']);
}

export async function hogPeopleSearch(query: string, limit = 5): Promise<HogPerson[]> {
  const out = await hogPost('/api/v1/people/search', { query, limit });
  return pluck<HogPerson>(out, ['results', 'people', 'items']);
}

/** Try the deep-research endpoint if it's live on this tenant. Returns null on 404. */
export async function hogDeepResearchTry(
  prompt: string,
  schema?: Record<string, unknown>,
): Promise<{ operationId: string } | null> {
  try {
    const out = (await hogPost('/api/deep-research', { prompt, schema })) as
      | { operationId?: string; id?: string }
      | null;
    if (!out) return null;
    const id = out.operationId || out.id;
    return id ? { operationId: id } : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('404') || msg.includes('Not Found')) return null;
    throw err;
  }
}

/** Heuristic: does the query look like it's about a company vs a person? */
export function classifyQuery(query: string): 'company' | 'person' | 'topic' {
  const q = query.toLowerCase();
  // Person signals: "CEO of", "VP at", "founder", title + at + company
  if (/\b(ceo|cto|cfo|coo|vp|founder|head of|director|engineer)\b/.test(q)) return 'person';
  if (/\bat\s+[a-z]/.test(q) && q.length < 80) return 'person';
  // Otherwise treat as either company or generic topic
  if (q.split(/\s+/).length <= 4) return 'company';
  return 'topic';
}
