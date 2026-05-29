// Skill providers — gstack, gbrain, zeroentropy, the-hog, lightsprint, neverzero.
// Each provider ships a catalog of skills. An org installs providers to opt-in
// to their skills (gbrain comes pre-installed; the rest are explicit).

export type ProviderId = 'gstack' | 'gbrain' | 'zeroentropy' | 'the-hog' | 'lightsprint' | 'neverzero';

export type SkillKind =
  | 'plan' | 'decompose' | 'estimate' | 'schedule'
  | 'scaffold' | 'refactor' | 'test' | 'deploy' | 'lint'
  | 'research' | 'compete' | 'recall' | 'cite' | 'summarize'
  | 'review' | 'factcheck' | 'redteam' | 'critique'
  | 'remember' | 'compress' | 'pin'
  | 'rollback' | 'monitor' | 'release'
  | 'verify' | 'build' | 'spawn' | 'resume' | 'handoff';

export interface SkillDef {
  id: string;                  // unique, e.g. "gbrain.plan"
  name: string;                // command without slash, e.g. "plan"
  command: string;             // "/plan"
  provider: ProviderId;
  kind: SkillKind;
  description: string;
  /** What the subfile title should look like when this skill runs. */
  subfileTitleFor(task: string): string;
}

const titleSlice = (task: string, max = 64) => task.trim().slice(0, max) || 'untitled';

export const PROVIDER_LABELS: Record<ProviderId, { name: string; tagline: string }> = {
  gstack:      { name: 'GStack',      tagline: 'build · scaffold · ship' },
  gbrain:      { name: 'GBrain',      tagline: 'plan · decompose · estimate' },
  zeroentropy: { name: 'ZeroEntropy', tagline: 'research · recall · compress' },
  'the-hog':   { name: 'The Hog',     tagline: 'review · fact-check · red-team' },
  lightsprint: { name: 'Lightsprint', tagline: 'deploy · rollback · monitor' },
  neverzero:   { name: 'Throughline',   tagline: 'memory · pin · summarize' },
};

export const ALL_SKILLS: SkillDef[] = [
  // GBrain — planning
  { id: 'gbrain.plan', name: 'plan', command: '/plan', provider: 'gbrain', kind: 'plan',
    description: 'Decompose a goal into a dated work plan with owners.',
    subfileTitleFor: (t) => `Plan: ${titleSlice(t)}` },
  { id: 'gbrain.decompose', name: 'decompose', command: '/decompose', provider: 'gbrain', kind: 'decompose',
    description: 'Break a task into sub-tasks with dependencies.',
    subfileTitleFor: (t) => `Decomposition: ${titleSlice(t)}` },
  { id: 'gbrain.estimate', name: 'estimate', command: '/estimate', provider: 'gbrain', kind: 'estimate',
    description: 'Estimate effort + risk per sub-task.',
    subfileTitleFor: (t) => `Estimate: ${titleSlice(t)}` },
  { id: 'gbrain.schedule', name: 'schedule', command: '/schedule', provider: 'gbrain', kind: 'schedule',
    description: 'Generate a dated rollout schedule.',
    subfileTitleFor: (t) => `Schedule: ${titleSlice(t)}` },

  // GStack — build
  { id: 'gstack.scaffold', name: 'scaffold', command: '/scaffold', provider: 'gstack', kind: 'scaffold',
    description: 'Stand up a new feature scaffold with tests.',
    subfileTitleFor: (t) => `Scaffold: ${titleSlice(t)}` },
  { id: 'gstack.refactor', name: 'refactor', command: '/refactor', provider: 'gstack', kind: 'refactor',
    description: 'Plan a refactor with safety net + perf budget.',
    subfileTitleFor: (t) => `Refactor plan: ${titleSlice(t)}` },
  { id: 'gstack.test', name: 'test', command: '/test', provider: 'gstack', kind: 'test',
    description: 'Generate a test plan for the given target.',
    subfileTitleFor: (t) => `Test plan: ${titleSlice(t)}` },
  { id: 'gstack.lint', name: 'lint', command: '/lint', provider: 'gstack', kind: 'lint',
    description: 'Run quality + style checks on the target area.',
    subfileTitleFor: (t) => `Lint pass: ${titleSlice(t)}` },

  // ZeroEntropy — research
  { id: 'ze.research', name: 'research', command: '/research', provider: 'zeroentropy', kind: 'research',
    description: 'Gather sources via The Hog + public web, summarize, cite.',
    subfileTitleFor: (t) => `Research: ${titleSlice(t)}` },
  { id: 'ze.compete', name: 'compete', command: '/compete', provider: 'zeroentropy', kind: 'compete',
    description: 'Build a competitor matrix.',
    subfileTitleFor: (t) => `Competitor matrix: ${titleSlice(t)}` },
  { id: 'ze.recall', name: 'recall', command: '/recall', provider: 'zeroentropy', kind: 'recall',
    description: 'Surface relevant pins + decisions from the brain.',
    subfileTitleFor: (t) => `Recall: ${titleSlice(t)}` },
  { id: 'ze.cite', name: 'cite', command: '/cite', provider: 'zeroentropy', kind: 'cite',
    description: 'Find and format citations for a claim.',
    subfileTitleFor: (t) => `Citations: ${titleSlice(t)}` },
  { id: 'ze.summarize', name: 'summarize', command: '/summarize', provider: 'zeroentropy', kind: 'summarize',
    description: 'Compress a long doc into a TL;DR.',
    subfileTitleFor: (t) => `Summary: ${titleSlice(t)}` },

  // The Hog — review
  { id: 'hog.review', name: 'review', command: '/review', provider: 'the-hog', kind: 'review',
    description: 'Critique a draft against the project goal.',
    subfileTitleFor: (t) => `Review: ${titleSlice(t)}` },
  { id: 'hog.factcheck', name: 'factcheck', command: '/factcheck', provider: 'the-hog', kind: 'factcheck',
    description: 'Verify claims against pinned memory + public sources.',
    subfileTitleFor: (t) => `Fact-check: ${titleSlice(t)}` },
  { id: 'hog.redteam', name: 'redteam', command: '/redteam', provider: 'the-hog', kind: 'redteam',
    description: 'Stress-test a plan against failure modes.',
    subfileTitleFor: (t) => `Red-team: ${titleSlice(t)}` },

  // Lightsprint — deploy
  { id: 'ls.deploy', name: 'deploy', command: '/deploy', provider: 'lightsprint', kind: 'deploy',
    description: 'Ship to staging or prod with a canary policy.',
    subfileTitleFor: (t) => `Deploy plan: ${titleSlice(t)}` },
  { id: 'ls.rollback', name: 'rollback', command: '/rollback', provider: 'lightsprint', kind: 'rollback',
    description: 'Roll back to a previous green deploy.',
    subfileTitleFor: (t) => `Rollback: ${titleSlice(t)}` },
  { id: 'ls.monitor', name: 'monitor', command: '/monitor', provider: 'lightsprint', kind: 'monitor',
    description: 'Set up alerting on the target service.',
    subfileTitleFor: (t) => `Monitor: ${titleSlice(t)}` },

  // Throughline — memory
  { id: 'nz.remember', name: 'remember', command: '/remember', provider: 'neverzero', kind: 'remember',
    description: 'Pin a fact / rule to project memory.',
    subfileTitleFor: (t) => `Pinned: ${titleSlice(t)}` },
  { id: 'nz.compress', name: 'compress', command: '/compress', provider: 'neverzero', kind: 'compress',
    description: 'Collapse old turns into a recap.',
    subfileTitleFor: (t) => `Compressed recap: ${titleSlice(t)}` },

  // The Hog — verification (audits a research subfile against pinned memory)
  { id: 'hog.verify', name: 'verify', command: '/verify', provider: 'the-hog', kind: 'verify',
    description: 'Verify a research subfile — retain strong claims, drop weak ones.',
    subfileTitleFor: (t) => `Verification Report: ${titleSlice(t)}` },

  // GStack — build / spawn / handoff
  { id: 'gstack.build', name: 'build', command: '/build', provider: 'gstack', kind: 'build',
    description: 'Claim work + run the build agent; writes ledger rows on progress.',
    subfileTitleFor: (t) => `Build: ${titleSlice(t)}` },
  { id: 'gstack.spawn', name: 'spawn', command: '/spawn', provider: 'gstack', kind: 'spawn',
    description: 'Spawn a subagent with a sliced parent context.',
    subfileTitleFor: (t) => `Subagent: ${titleSlice(t)}` },

  // Throughline — resume / handoff (cross-session continuity)
  { id: 'nz.resume', name: 'resume', command: '/resume', provider: 'neverzero', kind: 'resume',
    description: 'Generate a Resume Packet for the next session/device.',
    subfileTitleFor: (t) => `Resume Packet: ${titleSlice(t)}` },
  { id: 'nz.handoff', name: 'handoff', command: '/handoff', provider: 'neverzero', kind: 'handoff',
    description: 'Hand work off to another agent with compressed context.',
    subfileTitleFor: (t) => `Handoff: ${titleSlice(t)}` },
];

export function skillsForProviders(providers: ProviderId[]): SkillDef[] {
  const set = new Set(providers);
  return ALL_SKILLS.filter((s) => set.has(s.provider));
}

export function findSkill(idOrCommand: string): SkillDef | undefined {
  const q = idOrCommand.trim();
  const command = q.startsWith('/') ? q : '/' + q;
  return ALL_SKILLS.find((s) => s.id === q || s.command === command || s.name === q.replace(/^\//, ''));
}

export const DEFAULT_PROVIDERS: ProviderId[] = ['gbrain', 'gstack', 'zeroentropy', 'the-hog', 'lightsprint', 'neverzero'];
