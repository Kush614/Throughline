import { NextResponse } from 'next/server';
import { getOrg } from '@/lib/orgs';
import { findSkill, skillsForProviders, type ProviderId } from '@/lib/providers';
import { runSkill } from '@/lib/skill-runner';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await getOrg(slug);
  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const skillId = typeof body.skill === 'string' ? body.skill
                : typeof body.command === 'string' ? body.command
                : '';
  const task = typeof body.task === 'string' ? body.task : '';
  const parentId = typeof body.parentId === 'string' ? body.parentId : null;
  const requestedBy = typeof body.requestedBy === 'string' ? body.requestedBy : 'user';
  const mentionedAgents = Array.isArray(body.mentionedAgents)
    ? (body.mentionedAgents as { id: string; name: string }[])
    : [];

  if (!skillId.trim()) return NextResponse.json({ error: 'Field "skill" or "command" is required.' }, { status: 400 });
  if (!task.trim()) return NextResponse.json({ error: 'Field "task" is required.' }, { status: 400 });

  // Check the skill is installed via one of the org's providers.
  const skill = findSkill(skillId);
  if (!skill) return NextResponse.json({ error: `Unknown skill: ${skillId}` }, { status: 404 });
  const installed = new Set((org.providers ?? []) as ProviderId[]);
  const allowed = skillsForProviders(Array.from(installed));
  if (!allowed.find((s) => s.id === skill.id)) {
    return NextResponse.json(
      { error: `Skill "${skill.command}" is not installed on this org. Install provider "${skill.provider}" first.` },
      { status: 403 },
    );
  }

  try {
    const doc = await runSkill({
      orgSlug: org.slug,
      skillIdOrCommand: skill.id,
      task,
      parentId,
      requestedBy,
      mentionedAgents,
    });
    return NextResponse.json({ doc }, { status: 202 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
