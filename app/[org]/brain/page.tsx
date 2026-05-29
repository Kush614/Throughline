import { notFound } from 'next/navigation';
import { getOrg, setOrgProviders, type OrgProviderId } from '@/lib/orgs';
import { listAgents } from '@/lib/agents';
import { ensureBrainRoot, listDocs } from '@/lib/docs';
import { listResearch } from '@/lib/research';
import { skillsForProviders, type ProviderId } from '@/lib/providers';
import { recallMemory } from '@/lib/adapters/xtrace';
import '@/app/workstation/workstation.css';
import './_components/ws-cmd.css';
import './_components/live-ask.css';
import BrainWorkstation, {
  type BrainAgent, type BrainData, type BrainPerson, type BrainSkill,
  type BrainResearch, type BrainSubfile, type BrainOrgData,
} from './_components/BrainWorkstation';
import LiveAskDock from './_components/LiveAskDock';

export const dynamic = 'force-dynamic';

const AGENT_COLORS_VARS: Record<string, string> = {
  iris: 'var(--a-iris)', forge: 'var(--a-forge)', 'atlas-agent': 'var(--a-atlas)',
  loop: 'var(--a-loop)', beam: 'var(--a-beam)',
};
const DEFAULT_HUES = ['var(--a-iris)', 'var(--a-forge)', 'var(--a-atlas)', 'var(--a-loop)', 'var(--a-beam)'];
const DEFAULT_PROVIDERS: OrgProviderId[] = ['neverzero', 'gbrain', 'gstack', 'zeroentropy', 'the-hog'];

const PERSON_TONES = ['#5b6770', '#a55a3f', '#4f6a52', '#6a5a85', '#7a5f44'];

function glyphOf(s: string): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]![0] || '') + (parts[parts.length - 1]![0] || '')).toUpperCase();
}

function colorFor(name: string, idx: number): string {
  const norm = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(AGENT_COLORS_VARS)) if (norm.includes(k)) return v;
  return DEFAULT_HUES[idx % DEFAULT_HUES.length] ?? 'var(--a-iris)';
}

export default async function OrgBrainPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const providers: OrgProviderId[] = (org.providers && org.providers.length > 0)
    ? (org.providers as OrgProviderId[])
    : ((await setOrgProviders(org.slug, DEFAULT_PROVIDERS)) as OrgProviderId[] | undefined ?? DEFAULT_PROVIDERS);

  const rootDoc = await ensureBrainRoot(org.slug);

  const [registeredAgents, allDocs, allResearch, memories] = await Promise.all([
    listAgents({ orgSlug: org.slug }),
    listDocs({ orgSlug: org.slug }),
    listResearch({ orgSlug: org.slug }),
    recallMemory(org.slug, { limit: 50 }),
  ]);

  const subfiles: BrainSubfile[] = allDocs
    .filter((d) => d.kind === 'subfile')
    .map((d) => ({
      id: d.id,
      parentId: d.parentId,
      title: d.title,
      createdAt: d.createdAt,
      skillRun: d.skillRun
        ? {
            command: d.skillRun.command,
            skillId: d.skillRun.skillId,
            kind: d.skillRun.kind,
            task: d.skillRun.task,
            status: d.skillRun.status,
            mentionedAgents: d.skillRun.mentionedAgents,
            requestedBy: d.skillRun.requestedBy,
          }
        : undefined,
    }));

  const research: BrainResearch[] = allResearch.map((r) => ({
    id: r.id, topic: r.topic, status: r.status, summary: r.summary, createdAt: r.createdAt,
  }));

  const agents: BrainAgent[] = registeredAgents.map((a, i) => ({
    id: a.id, name: a.name, from: a.from, status: a.status, apiKeyPrefix: a.apiKeyPrefix,
    machine: a.platform.machine ?? null,
    os: a.platform.os ?? null,
    glyph: glyphOf(a.name),
    color: colorFor(a.name, i),
  }));

  const people: BrainPerson[] = (org.people ?? []).map((p, i) => ({
    name: p.name || '(unnamed)',
    role: p.role || '—',
    initials: glyphOf(p.name || '?'),
    tone: PERSON_TONES[i % PERSON_TONES.length] ?? '#5b6770',
  }));

  const skills: BrainSkill[] = skillsForProviders(providers as unknown as ProviderId[]).map((s) => ({
    id: s.id, name: s.name, command: s.command, provider: s.provider, description: s.description, kind: s.kind,
  }));

  const orgData: BrainOrgData = {
    slug: org.slug, name: org.name, domain: org.domain,
    brainDocId: rootDoc.id,
    tagline: org.tagline, mission: org.mission,
    industry: org.industry, stage: org.stage, founded: org.founded, hq: org.hq,
    createdAt: org.createdAt,
    providers, agentRoster: org.agentRoster,
    memories,
  };

  const data: BrainData = { org: orgData, agents, people, subfiles, skills, research };

  return (
    <>
      <BrainWorkstation initial={data} />
      <LiveAskDock slug={org.slug} />
    </>
  );
}
