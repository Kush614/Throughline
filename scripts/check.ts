// Verify what's actually stored + that the read paths work.
import { getXtrace } from '../lib/xtrace';
import { askWorkspace, sessionRecap, decisionTimeline, recallMemory } from '../lib/adapters/xtrace';

try { (process as any).loadEnvFile?.('.env.local'); } catch {}
const SLUG = 'atlas';

async function main() {
  const c = getXtrace()!;

  for (const t of [undefined, 'fact', 'episode'] as const) {
    const page = await c.memories.listPage({ user_id: SLUG, ...(t ? { type: t } : {}), limit: 100, order: 'created_at_desc' });
    console.log(`=== LIST type=${t ?? '(none)'} → ${page.data.length} ===`);
    for (const m of page.data) {
      const status = (m.details as { status?: string }).status ?? '-';
      console.log(`  [${m.type}/${status}] conv=${m.conv_id} kind=${m.metadata?.nz_kind ?? '-'} :: ${m.text.slice(0, 64)}`);
    }
  }

  console.log('\n=== recallMemory (facts, non-retracted) ===');
  const rec = await recallMemory(SLUG, { limit: 50 });
  console.log(`${rec.length} facts`);
  for (const r of rec) console.log(`  ${r.kind}${r.superseded ? ' (superseded)' : ''}: ${r.text.slice(0, 70)}`);

  console.log('\n=== askWorkspace "Why did we switch the database?" ===');
  const a = await askWorkspace(SLUG, 'Why did we switch the database?');
  console.log('answer:', a.answer);
  console.log('sources:', a.sources.length, '| usedContextPrompt:', a.usedContextPrompt);

  console.log('\n=== askWorkspace "What did we decide about onboarding?" ===');
  const a2 = await askWorkspace(SLUG, 'What did we decide about onboarding?');
  console.log('answer:', a2.answer);
  console.log('sources:', a2.sources.length);

  console.log('\n=== decisionTimeline ===');
  const t = await decisionTimeline(SLUG);
  console.log('active:', t.active.map((v) => v.text.slice(0, 50)));
  console.log('superseded:', t.superseded.map((v) => v.text.slice(0, 50)));

  console.log('\n=== sessionRecap atlas-2026-05-27 ===');
  const r = await sessionRecap(SLUG, 'atlas-2026-05-27');
  console.log('episode:', r.episode?.title, '|', r.episode?.summary?.slice(0, 80));
  console.log('contextPrompt:', r.contextPrompt?.slice(0, 160));
  console.log('facts:', r.facts.length);
}
main().catch((e) => { console.error(e); process.exit(1); });
