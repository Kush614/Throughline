// Seed a demo workspace ("Maple", a normal online store) with a coherent story
// in XTrace memory.
//
//   pnpm run seed
//
// Maple is an everyday e-commerce company — the kind of repo a normal company
// works in. Decisions a general audience instantly understands (guest checkout,
// all-in pricing, payment provider), including one that gets SUPERSEDED
// (PayPal-only → Stripe) to show off XTrace's revision chains.

import { getOrg, createOrg, setOrgProviders, type OrgProviderId } from '../lib/orgs';
import { ingestMemory, supersedeFact, type IngestMemoryInput } from '../lib/adapters/xtrace';
import { getXtrace, xtraceConfigured } from '../lib/xtrace';

try {
  // Node 22+ — load env before any adapter reads process.env.
  (process as NodeJS.Process & { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env.local');
} catch {
  /* no .env.local — rely on ambient env */
}

const SLUG = 'maple';
const S1 = 'maple-2026-05-26'; // checkout-planning session
const S2 = 'maple-2026-05-27'; // build-day session

async function ensureOrg() {
  const existing = await getOrg(SLUG);
  if (existing) {
    const provs = new Set<OrgProviderId>(existing.providers as OrgProviderId[]);
    if (!provs.has('neverzero')) {
      provs.add('neverzero');
      await setOrgProviders(SLUG, Array.from(provs));
      console.log(`• added "neverzero" provider to "${SLUG}"`);
    }
    console.log(`• org "${SLUG}" already exists — reusing`);
    return;
  }
  await createOrg({
    name: 'Maple',
    tagline: 'The online store with no surprises at checkout.',
    mission: 'Make buying furniture and home goods online feel as easy and trustworthy as a great shop in person.',
    industry: 'E-commerce / Retail',
    stage: 'Seed',
    hq: 'Remote',
    people: [
      { name: 'Priya Nair', role: 'Founder / CEO (non-technical)' },
      { name: 'Dev Sharma', role: 'Founding engineer' },
    ],
  });
  console.log(`• created org "${SLUG}"`);
}

/** Wipe all existing memory for the demo org so re-seeding is clean + repeatable. */
async function clearOrgMemory() {
  const c = getXtrace();
  if (!c) return;
  let removed = 0;
  for (let i = 0; i < 10; i++) {
    const page = await c.memories.listPage({ user_id: SLUG, type: 'fact', limit: 100, order: 'created_at_desc' });
    const live = page.data.filter((m) => (m.details as { status?: string }).status !== 'retracted');
    if (live.length === 0) break;
    for (const m of live) {
      try { await c.memories.delete(m.id); removed++; } catch { /* already gone */ }
    }
    if (!page.has_more) break;
  }
  // Episodes are NOT returned by list — sweep them via search and hard-delete.
  for (let i = 0; i < 6; i++) {
    const env = await c.memories.search({ query: 'session conversation summary decision', filters: { user_id: SLUG }, limit: 100 });
    let any = false;
    for (const m of env.data) {
      try { await c.memories.delete(m.id); removed++; any = true; } catch { /* already gone / retracted */ }
    }
    if (!any) break;
  }
  if (removed) console.log(`• cleared ${removed} existing memor${removed === 1 ? 'y' : 'ies'} from "${SLUG}"`);
}

/** Ingest one memory and return the id of the first extracted fact, if any. */
async function ingestFact(input: Omit<IngestMemoryInput, 'orgSlug' | 'wait'>): Promise<string | null> {
  const res = await ingestMemory({ ...input, orgSlug: SLUG, wait: true });
  if (res && 'memories_created' in res) {
    const fact = res.memories_created.find((m) => m.type === 'fact') ?? res.memories_created[0];
    console.log(`  ✓ ${input.kind.padEnd(8)} → ${fact ? fact.id : '(no fact extracted)'}  "${input.text.slice(0, 56)}…"`);
    return fact?.id ?? null;
  }
  console.log(`  … ${input.kind.padEnd(8)} → async (${JSON.stringify(res)})`);
  return null;
}

/** Ingest and insist on a fact id — extraction is nondeterministic, and the
 *  supersession demo depends on having a real fact to supersede. */
async function ingestFactRequired(input: Omit<IngestMemoryInput, 'orgSlug' | 'wait'>, tries = 4): Promise<string | null> {
  for (let i = 0; i < tries; i++) {
    const id = await ingestFact(input);
    if (id) return id;
    if (i < tries - 1) console.log(`    ↻ no fact extracted — retrying (${i + 2}/${tries})`);
  }
  return null;
}

async function main() {
  if (!xtraceConfigured()) {
    console.error('\n✗ XTrace is not configured. Put XTRACE_API_KEY + XTRACE_ORG_ID in .env.local first.\n');
    process.exit(1);
  }

  await ensureOrg();
  await clearOrgMemory();

  // XTrace's extractor pulls facts from first-person / decision-framed turns,
  // so we phrase each memory the way a teammate would actually say it.
  console.log('\nSession 1 — checkout planning:');
  await ingestFact({
    text: 'We decided to offer guest checkout so shoppers can buy without being forced to create an account.',
    kind: 'decision', source: 'seed', command: '/remember', agentName: 'Forge', requestedBy: 'Forge', sessionId: S1,
  });
  await ingestFact({
    text: 'Our analytics showed that about 60 percent of carts were abandoned at the forced sign-up step.',
    kind: 'finding', source: 'seed', command: '/research', agentName: 'Iris', requestedBy: 'Iris', sessionId: S1,
  });
  await ingestFact({
    text: 'We always show the full price including tax and shipping before the final checkout step, with no surprise fees.',
    kind: 'rule', source: 'seed', command: '/remember', agentName: 'Loop', requestedBy: 'Loop', sessionId: S1,
  });
  await ingestFact({
    text: 'In all Maple store copy we say "order", never "purchase".',
    kind: 'rule', source: 'seed', command: '/pin', agentName: 'Iris', requestedBy: 'Iris', sessionId: S1,
  });

  // The decision that will get superseded — insist on a fact so the revision
  // chain demo always works.
  const payFactId = await ingestFactRequired({
    text: 'We decided that Maple will use PayPal as its only payment provider at checkout.',
    kind: 'decision', source: 'seed', command: '/remember', agentName: 'Dev', requestedBy: 'Dev', sessionId: S1,
  });

  console.log('\nSession 2 — build day:');
  await ingestFact({
    text: 'Our competitor scan found that most rivals hide shipping costs until the last step, so our edge is showing the all-in price up front.',
    kind: 'finding', source: 'seed', command: '/compete', agentName: 'Iris', requestedBy: 'Iris', sessionId: S2,
  });
  await ingestFact({
    text: 'We finished the cart and guest checkout; next we are wiring order-confirmation emails and inventory sync.',
    kind: 'handoff', source: 'seed', command: '/handoff', agentName: 'Forge', requestedBy: 'Forge', sessionId: S2,
  });

  // Supersede the PayPal-only decision → Stripe. Produces an XTrace revision chain.
  if (payFactId) {
    console.log('\nSuperseding the payments decision (PayPal-only → Stripe):');
    const updated = await supersedeFact(
      payFactId,
      'We switched from PayPal-only to Stripe, so we can accept cards, Apple Pay, and Google Pay in one checkout flow.',
    );
    console.log(`  ✓ superseded ${payFactId} → ${updated.id}`);
  } else {
    console.log('\n(skipping supersession — no fact id captured for the payments decision)');
  }

  console.log('\n✓ Seed complete. Open /maple/room and try: "Why did we switch our payment provider?"\n');
}

main().catch((err) => {
  console.error('\n✗ Seed failed:', err);
  process.exit(1);
});
