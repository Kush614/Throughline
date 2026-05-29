export type Agent = {
  id: string;
  name: string;
  glyph: string;
  role: string;
  color: string;
  provider: string;
  model: string;
  state: 'working' | 'idle';
  statusShort: string;
  currentTask: string;
  tokensPerHr: string;
  costDay: string;
  skills: string[];
  memory: { read: string; write: string };
  handoffs: { to: string; when: string; what: string }[];
  attached: boolean;
  lastSeen: string;
};

export const MAX_VISIBLE_DOC_AGENTS = 5;

function minutesSinceLastSeen(label: string): number {
  const match = label.trim().match(/^(\d+(?:\.\d+)?)\s*([mhd])$/i);
  if (!match) return Number.POSITIVE_INFINITY;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === 'h') return amount * 60;
  if (unit === 'd') return amount * 60 * 24;
  return amount;
}

function isActiveDocAgent(agent: Agent): boolean {
  return agent.attached && (agent.state === 'working' || agent.statusShort.trim().length > 0 || agent.lastSeen.trim().length > 0);
}

function agentActivityScore(agent: Agent): number {
  const recentMinutes = minutesSinceLastSeen(agent.lastSeen);
  const recencyScore = Number.isFinite(recentMinutes) ? Math.max(0, 720 - recentMinutes) : 0;

  return (
    (agent.state === 'working' ? 10_000 : 0) +
    (agent.statusShort.trim() ? 500 : 0) +
    recencyScore
  );
}

export function getTopActiveAgents(agents: Agent[], limit = MAX_VISIBLE_DOC_AGENTS): Agent[] {
  return agents
    .map((agent, index) => ({ agent, index }))
    .filter(({ agent }) => isActiveDocAgent(agent))
    .sort((left, right) => {
      const scoreDelta = agentActivityScore(right.agent) - agentActivityScore(left.agent);
      if (scoreDelta !== 0) return scoreDelta;
      return left.index - right.index;
    })
    .map(({ agent }) => agent)
    .slice(0, Math.max(0, limit));
}

export function countWorkingAgents(agents: Agent[]): number {
  return agents.filter((agent) => agent.state === 'working').length;
}

export type Person = {
  id: string;
  name: string;
  initials: string;
  role: string;
  tone: string;
  online: boolean;
};

export type Skill = {
  name: string;
  group: 'Plan' | 'Research' | 'Build' | 'Review' | 'Memory';
  desc: string;
  by: string;
};

export type Event = {
  actor: string;
  verb: string;
  target?: string;
  live: boolean;
  when: string;
  note?: string;
  preview?: string;
};

export type Memory = { text: string; source: string; when: string };

export const AGENTS: Agent[] = [
  {
    id: 'iris', name: 'Iris', glyph: 'IR', role: 'research-agent',
    color: 'var(--a-iris)', provider: 'ZeroEntropy', model: 'ze-retriever-2',
    state: 'working', statusShort: 'reading 12 docs',
    currentTask:
      'Comparing onboarding patterns across 12 SaaS workspaces. Surfacing 3 contradictions in our spec.',
    tokensPerHr: '14.2K', costDay: '0.42',
    skills: ['research', 'cite', 'summarize', 'crawl'],
    memory: { read: 'project + workspace', write: 'project notes only' },
    handoffs: [
      { to: '→ Atlas', when: '11:48', what: 'Pricing comp matrix · ready for plan integration' },
      { to: '→ Loop', when: '10:02', what: '4 sources flagged for fact-check' },
    ],
    attached: true, lastSeen: '',
  },
  {
    id: 'forge', name: 'Forge', glyph: 'FG', role: 'build-agent',
    color: 'var(--a-forge)', provider: 'GStack', model: 'gs-coder-7b',
    state: 'working', statusShort: 'PR #284',
    currentTask:
      'Wiring the onboarding flow against the new auth provider. 14 files touched, 2 tests pending.',
    tokensPerHr: '38.6K', costDay: '1.20',
    skills: ['scaffold', 'refactor', 'test', 'deploy', 'lint'],
    memory: { read: 'codebase + project', write: 'PR drafts, branch notes' },
    handoffs: [
      { to: '→ Beam', when: '11:32', what: 'Build green · awaiting staging window' },
      { to: '→ Loop', when: '09:15', what: 'Diff ready for review' },
    ],
    attached: true, lastSeen: '',
  },
  {
    id: 'atlas', name: 'Atlas', glyph: 'AT', role: 'planning-agent',
    color: 'var(--a-atlas)', provider: 'GBrain', model: 'gb-planner-l',
    state: 'idle', lastSeen: '4m',
    statusShort: '', currentTask: '',
    tokensPerHr: '2.1K', costDay: '0.08',
    skills: ['plan', 'decompose', 'schedule', 'estimate'],
    memory: { read: 'project + decisions', write: 'plans, todos' },
    handoffs: [{ to: '← Iris', when: '11:48', what: 'Accepted pricing matrix · updated plan' }],
    attached: true,
  },
  {
    id: 'loop', name: 'Loop', glyph: 'LP', role: 'review-agent',
    color: 'var(--a-loop)', provider: 'The Hog', model: 'hog-judge-3',
    state: 'idle', lastSeen: '12m',
    statusShort: '', currentTask: '',
    tokensPerHr: '5.4K', costDay: '0.18',
    skills: ['review', 'critique', 'factcheck', 'redteam'],
    memory: { read: 'all reads', write: 'review notes' },
    handoffs: [{ to: '← Forge', when: '09:15', what: 'Reviewed diff · 3 nits, 1 blocker' }],
    attached: true,
  },
  {
    id: 'beam', name: 'Beam', glyph: 'BM', role: 'deploy-agent',
    color: 'var(--a-beam)', provider: 'Lightsprint', model: 'ls-runner-1',
    state: 'idle', lastSeen: '2h',
    statusShort: '', currentTask: '',
    tokensPerHr: '0.8K', costDay: '0.04',
    skills: ['deploy', 'rollback', 'monitor', 'staging'],
    memory: { read: 'deploy logs', write: 'release notes' },
    handoffs: [{ to: '← Forge', when: 'Yest.', what: 'Last green deploy · v2.18.3' }],
    attached: true,
  },
];

export const PEOPLE: Person[] = [
  { id: 'sam',   name: 'Sam Aoki',     initials: 'SA', role: 'PM',       tone: '#5b6770', online: true },
  { id: 'yuna',  name: 'Yuna Park',    initials: 'YP', role: 'Design',   tone: '#a55a3f', online: true },
  { id: 'diego', name: 'Diego Marín',  initials: 'DM', role: 'Eng lead', tone: '#4f6a52', online: true },
  { id: 'priya', name: 'Priya Shah',   initials: 'PS', role: 'GTM',      tone: '#6a5a85', online: false },
];

export const SKILLS: Skill[] = [
  { name: 'plan',       group: 'Plan',     desc: 'Decompose a goal into a dated work plan', by: 'GBrain' },
  { name: 'decompose',  group: 'Plan',     desc: 'Break a task into sub-tasks with deps',   by: 'GBrain' },
  { name: 'research',   group: 'Research', desc: 'Gather sources, summarize, cite',         by: 'ZeroEntropy' },
  { name: 'compete',    group: 'Research', desc: 'Build a competitor matrix from scratch',  by: 'ZeroEntropy' },
  { name: 'interview',  group: 'Research', desc: 'Draft user interview script + analyze',   by: 'ZeroEntropy' },
  { name: 'scaffold',   group: 'Build',    desc: 'Stand up a new feature scaffold + tests', by: 'GStack' },
  { name: 'refactor',   group: 'Build',    desc: 'Refactor with safety net + perf budget',  by: 'GStack' },
  { name: 'review',     group: 'Review',   desc: 'Critique a draft against the project goal', by: 'The Hog' },
  { name: 'factcheck',  group: 'Review',   desc: 'Verify claims against pinned memory',     by: 'The Hog' },
  { name: 'redteam',    group: 'Review',   desc: 'Stress test a plan or release',           by: 'The Hog' },
  { name: 'remember',   group: 'Memory',   desc: 'Pin a fact to project memory',            by: 'Throughline' },
  { name: 'recall',     group: 'Memory',   desc: 'Surface forgotten work from any project', by: 'ZeroEntropy' },
  { name: 'compress',   group: 'Memory',   desc: 'Collapse old turns into a recap',         by: 'Throughline' },
  { name: 'deploy',     group: 'Build',    desc: 'Ship to staging or prod',                 by: 'Lightsprint' },
];

export const EVENTS: Event[] = [
  {
    actor: 'iris', verb: 'cited 4 sources for', target: 'Onboarding flow', live: true,
    when: '12:02 · 14s ago',
    preview:
      '"Drop-off occurs at step 3 in 7 of 12 reviewed apps — the consent screen." — Pricing Page Patterns, 2025',
  },
  { actor: 'forge', verb: 'pushed', target: 'auth/oauth-rewrite', live: true,
    when: '11:58 · 4m ago', note: '14 files · 2 tests pending' },
  { actor: 'sam', verb: 'pinned', target: 'memory.pricing.tier-3', live: true, when: '11:51 · 11m ago' },
  { actor: 'iris', verb: 'handed off to', target: 'Atlas', live: false, when: '11:48' },
  { actor: 'yuna', verb: 'commented on', target: 'Onboarding step 3', live: false, when: '11:30' },
  { actor: 'loop', verb: 'flagged blocker on', target: 'PR #281', live: false, when: '09:15' },
  { actor: 'atlas', verb: 'replanned', target: 'Q3 milestones', live: false, when: '09:02' },
  { actor: 'diego', verb: 'merged', target: 'PR #280', live: false, when: '08:44' },
];

export const MEMORY: Memory[] = [
  {
    text:
      'Pricing has three tiers: Solo, Team, Workspace. Workspace gets agent SSO and shared memory — keep this distinction sharp in copy.',
    source: 'Decision · pinned by Sam', when: 'May 12',
  },
  {
    text:
      'Onboarding must show one real agent doing real work within 60 seconds of signup. No screencast, no preamble.',
    source: 'NPS survey · Iris recalled it', when: 'Apr 30',
  },
  {
    text: 'Never use "AI assistant". Always "agent" or by name (Iris, Forge, etc).',
    source: 'Brand voice · Yuna', when: 'Apr 14',
  },
];
