'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import './install.css';

type Shell = 'powershell' | 'bash';
type OsChoice = 'auto' | 'mac' | 'win' | 'linux' | 'wsl';
type ClientId =
  | 'codex'
  | 'claude-code'
  | 'claude-desktop'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'continue'
  | 'zed'
  | 'antigravity'
  | 'aider'
  | 'custom';

type ClientDef = {
  id: ClientId;
  glyph: string;
  name: string;
  runtime: string;
  meta: string;
  rulesFile: string;
  pasteTarget: string;
  note: string;
  recommended?: boolean;
};

type RegisteredAgent = {
  id: string;
  name: string;
  from: ClientId;
  apiKeyPrefix: string;
  workspace: string;
  orgSlug: string;
  status: 'pending' | 'connected' | 'revoked';
  createdAt: string;
  lastSeenAt: string | null;
  platform: {
    os?: 'mac' | 'win' | 'linux' | 'wsl' | null;
    runtime?: string;
    machine?: string;
  };
  metadata: Record<string, string>;
};

type Registration = {
  agent: RegisteredAgent;
  apiKey: string;
  installSnippet?: string;
};

const CLIENTS: ClientDef[] = [
  {
    id: 'codex',
    glyph: 'CX',
    name: 'Codex / GStack',
    runtime: 'codex',
    meta: 'CLI + desktop app',
    rulesFile: 'AGENTS.md',
    pasteTarget: 'Project AGENTS.md or Codex custom instructions',
    note: 'Best fit for this repo. Put the bootstrap prompt near the top of AGENTS.md.',
    recommended: true,
  },
  {
    id: 'claude-code',
    glyph: 'cc',
    name: 'Claude Code',
    runtime: 'claude-code',
    meta: 'terminal agent',
    rulesFile: 'CLAUDE.md',
    pasteTarget: 'Project CLAUDE.md',
    note: 'Use this when Claude Code opens the repository from a terminal.',
  },
  {
    id: 'claude-desktop',
    glyph: 'CD',
    name: 'Claude Desktop',
    runtime: 'claude-desktop',
    meta: 'desktop chat',
    rulesFile: 'project prompt',
    pasteTarget: 'Project instructions or the first chat message',
    note: 'Use the prompt as the first message or a saved project instruction.',
  },
  {
    id: 'cursor',
    glyph: 'Cu',
    name: 'Cursor',
    runtime: 'cursor',
    meta: 'editor agent',
    rulesFile: '.cursorrules',
    pasteTarget: '.cursorrules',
    note: 'Composer should fetch context before it starts planning or editing.',
  },
  {
    id: 'vscode',
    glyph: 'VS',
    name: 'VS Code',
    runtime: 'vscode',
    meta: 'editor agent',
    rulesFile: '.github/copilot-instructions.md',
    pasteTarget: '.github/copilot-instructions.md',
    note: 'Works for Copilot-style project instructions plus terminal curl smoke tests.',
  },
  {
    id: 'windsurf',
    glyph: 'WS',
    name: 'Windsurf',
    runtime: 'windsurf',
    meta: 'editor agent',
    rulesFile: '.windsurfrules',
    pasteTarget: '.windsurfrules',
    note: 'Keep the prompt short and mandatory so Cascade starts with the cloud context.',
  },
  {
    id: 'continue',
    glyph: 'Co',
    name: 'Continue.dev',
    runtime: 'continue',
    meta: 'IDE extension',
    rulesFile: 'continue prompt',
    pasteTarget: 'Continue custom instructions',
    note: 'Paste the prompt into the assistant instructions used for this workspace.',
  },
  {
    id: 'zed',
    glyph: 'Zd',
    name: 'Zed',
    runtime: 'zed',
    meta: 'editor agent',
    rulesFile: 'Zed assistant rules',
    pasteTarget: 'Zed assistant project context',
    note: 'Use the env block in the shell that launches the assistant bridge.',
  },
  {
    id: 'antigravity',
    glyph: 'AG',
    name: 'Antigravity',
    runtime: 'antigravity',
    meta: 'agent IDE',
    rulesFile: 'agent instruction file',
    pasteTarget: 'Antigravity workspace instructions',
    note: 'The differentiator is the runtime, machine, session id, and active task payload.',
  },
  {
    id: 'aider',
    glyph: 'ai',
    name: 'Aider',
    runtime: 'aider',
    meta: 'terminal agent',
    rulesFile: 'CONVENTIONS.md',
    pasteTarget: 'CONVENTIONS.md or the launch prompt',
    note: 'Run the smoke-test commands in the same shell before starting Aider.',
  },
  {
    id: 'custom',
    glyph: '{}',
    name: 'Custom runner',
    runtime: 'custom',
    meta: 'REST client',
    rulesFile: 'runner prompt',
    pasteTarget: 'System prompt for the custom runner',
    note: 'Any agent that can make HTTP calls can use the same protocol.',
  },
];

function cleanSlug(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return slug || 'atlas';
}

function Inline({ children }: { children: ReactNode }) {
  return <code className="inline">{children}</code>;
}

function CodeBlock({
  path,
  code,
  id,
}: {
  path: string;
  code: string;
  id: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="code">
      <div className="code-hd">
        <span className="path">{path}</span>
        <button
          className={'copy' + (copied ? ' ok' : '')}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1400);
            } catch {
              /* Clipboard is best-effort in local browser contexts. */
            }
          }}
          type="button"
          data-copy={id}
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre id={id}>{code}</pre>
    </div>
  );
}

function Step({ num, children }: { num: number; children: ReactNode }) {
  return (
    <div className="step">
      <span className="num">{num}</span>
      <div className="body">{children}</div>
    </div>
  );
}

function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="os-tabs">
      {options.map((o) => (
        <button
          key={o.id}
          className="ot"
          data-on={o.id === value ? '1' : '0'}
          onClick={() => onChange(o.id)}
          type="button"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function envCode({
  registration,
  workspace,
  client,
  contextUrl,
  heartbeatUrl,
  handoffUrl,
  messagesUrl,
}: {
  registration: Registration | null;
  workspace: string;
  client: ClientDef;
  contextUrl: string;
  heartbeatUrl: string;
  handoffUrl: string;
  messagesUrl: string;
}): string {
  return [
    `NEVERZERO_API_KEY=${registration ? '<paste-the-one-time-key-shown-once-above>' : 'nz_live_<generated-by-the-bootstrap-prompt>'}`,
    `NEVERZERO_WORKSPACE=${workspace}`,
    `NEVERZERO_AGENT_ID=${registration?.agent.id ?? 'agt_<generated-agent-id>'}`,
    `NEVERZERO_AGENT_NAME=${registration?.agent.name ?? `${client.name} on this device`}`,
    `NEVERZERO_AGENT_RUNTIME=${client.runtime}`,
    `NEVERZERO_CONTEXT_URL=${contextUrl}`,
    `NEVERZERO_HEARTBEAT_URL=${heartbeatUrl}`,
    `NEVERZERO_HANDOFF_URL=${handoffUrl}`,
    `NEVERZERO_MESSAGES_URL=${messagesUrl}`,
    'NEVERZERO_HEARTBEAT_INTERVAL_SECONDS=60',
  ].join('\n');
}

function runtimePointer({ client }: { client: ClientDef }): string {
  if (client.id === 'codex') {
    return 'Codex and GStack load the repo AGENTS.md. Keep the Throughline protocol in AGENTS.md and keep secrets in environment/local ignored config.';
  }
  if (client.id === 'claude-code') {
    return 'Create or update CLAUDE.md with: "Read and follow ./AGENTS.md before doing any work. Throughline cold-start is mandatory."';
  }
  if (client.id === 'claude-desktop') {
    return 'Save the same instruction in the Claude project instructions: "Read and follow the repository AGENTS.md before doing any work."';
  }
  if (client.id === 'cursor') {
    return 'Create or update .cursorrules with: "Read and follow AGENTS.md first. Throughline cold-start is mandatory before planning or edits."';
  }
  if (client.id === 'vscode') {
    return 'Create or update .github/copilot-instructions.md with: "Read and follow AGENTS.md first. Throughline cold-start is mandatory."';
  }
  if (client.id === 'windsurf') {
    return 'Create or update .windsurfrules with: "Read and follow AGENTS.md first. Throughline cold-start is mandatory before Cascade works."';
  }
  if (client.id === 'aider') {
    return 'Create or update CONVENTIONS.md with a one-line pointer to AGENTS.md, then launch Aider from a shell that loads the Throughline env file.';
  }
  return `Store a durable project instruction for ${client.name}: "Read and follow AGENTS.md first. Throughline cold-start is mandatory."`;
}

function identityJson({
  registration,
  client,
  workspace,
  machine,
  os,
  capabilities,
  currentTask,
}: {
  registration: Registration | null;
  client: ClientDef;
  workspace: string;
  machine: string;
  os: OsChoice;
  capabilities: string;
  currentTask: string;
}): string {
  return JSON.stringify(
    {
      agent_id: registration?.agent.id ?? 'agt_<generated-agent-id>',
      agent_name: registration?.agent.name ?? `${client.name} on this device`,
      agent_from: client.id,
      workspace,
      runtime: client.runtime,
      machine: machine || '<machine-label>',
      os,
      session_id: '<generate-a-new-id-every-session>',
      capabilities: capabilities.split(',').map((item) => item.trim()).filter(Boolean),
      current_task: currentTask || '<current task>',
    },
    null,
    2,
  );
}

function bootstrapPrompt({
  registration,
  client,
  workspace,
  contextUrl,
  heartbeatUrl,
  handoffUrl,
  messagesUrl,
  machine,
  capabilities,
  currentTask,
}: {
  registration: Registration | null;
  client: ClientDef;
  workspace: string;
  contextUrl: string;
  heartbeatUrl: string;
  handoffUrl: string;
  messagesUrl: string;
  machine: string;
  capabilities: string;
  currentTask: string;
}): string {
  return [
    `You are ${registration?.agent.name ?? `${client.name} on this device`}, a registered Throughline agent in workspace "${workspace}".`,
    `Agent id: ${registration?.agent.id ?? 'agt_<generated-agent-id>'}. Runtime: ${client.runtime}. Machine: ${machine || '<machine-label>'}.`,
    '',
    'Required cold-start protocol:',
    '1. In every new session, before analysis, planning, code edits, shell commands, or answers, fetch Throughline context.',
    `2. GET ${contextUrl} with header: Authorization: Bearer $NEVERZERO_API_KEY.`,
    '3. Read coldStartSummary, workspace.pinnedMemories, activeAgents, openTasks, and protocol.',
    '4. Do not proceed from memory alone. If the context fetch fails, say "Throughline context fetch failed" and ask whether to continue degraded.',
    '5. This same protocol applies during first-time installation, resumed desktop sessions, CLI sessions, and IDE agent sessions.',
    '',
    'Heartbeat protocol:',
    `- POST ${heartbeatUrl} every 60 seconds while active.`,
    '- Include agent_id, runtime, machine, session_id, current_task, capabilities, project_path, and status.',
    '- Generate a fresh session_id for each new session so Throughline can separate this run from prior runs.',
    `- Before stopping, POST a handoff to ${handoffUrl} when the client has that capability.`,
    '',
    'Agent-to-agent relay:',
    `- GET ${messagesUrl}?agentId=${registration?.agent.id ?? 'agt_<generated-agent-id>'} with Authorization: Bearer $NEVERZERO_API_KEY to read peer packets addressed to this agent and workspace broadcasts.`,
    `- POST ${messagesUrl} with the same Authorization header plus fromAgentId, optional toAgentId, kind, summary, context, refs, and sessionId to share context with peers.`,
    '- Do not put secrets in relay messages.',
    '',
    'Identity payload to use:',
    identityJson({
      registration,
      client,
      workspace,
      machine,
      os: registration?.agent.platform.os ?? 'auto',
      capabilities,
      currentTask,
    }),
  ].join('\n');
}

function singleBootstrapPrompt({
  client,
  workspace,
  owner,
  agentName,
  contextUrl,
  heartbeatUrl,
  messagesUrl,
  machine,
  os,
  capabilities,
  currentTask,
}: {
  client: ClientDef;
  workspace: string;
  owner: string;
  agentName: string;
  contextUrl: string;
  heartbeatUrl: string;
  messagesUrl: string;
  machine: string;
  os: OsChoice;
  capabilities: string;
  currentTask: string;
}): string {
  const apiBase = contextUrl.replace(/\/api\/context$/, '');
  const capabilitiesList = capabilities.split(',').map((item) => item.trim()).filter(Boolean);
  const capabilityLines = capabilitiesList.length
    ? capabilitiesList.map((item, index) => (
      `    "${item}"${index === capabilitiesList.length - 1 ? '' : ','}`
    )).join('\n')
    : '    "read workspace context"';
  const osValue = os === 'auto' ? null : os;

  return [
    'You are installing Throughline for this repository. Complete the setup yourself instead of asking the user to follow separate manual steps.',
    '',
    'Install inputs:',
    `- Throughline API base URL: ${apiBase}`,
    `- Heartbeat URL template: ${heartbeatUrl}`,
    `- Agent messages URL: ${messagesUrl}`,
    `- Workspace slug: ${workspace}`,
    `- Owner: ${owner || 'sam'}`,
    `- Agent name: ${agentName || `${client.name} on this device`}`,
    `- Runtime: ${client.runtime}`,
    `- Agent source: ${client.id}`,
    `- Machine label: ${machine || '<detect machine label>'}`,
    `- OS: ${osValue ?? 'auto'}`,
    `- Current task: ${currentTask || '<current task>'}`,
    `- Capabilities: ${capabilitiesList.join(', ') || 'read workspace context'}`,
    '',
    'Do this in order:',
    '1. If NEVERZERO_API_KEY and NEVERZERO_AGENT_ID are already available in the shell or secure local config, reuse that stable install identity. Otherwise register this agent.',
    `2. Register by POSTing ${apiBase}/api/agents with Content-Type: application/json and this payload:`,
    '{',
    `  "name": "${agentName || `${client.name} on this device`}",`,
    `  "from": "${client.id}",`,
    `  "org": "${workspace}",`,
    `  "orgSlug": "${workspace}",`,
    `  "workspace": "${workspace}",`,
    `  "ownedBy": "${owner || 'sam'}",`,
    '  "platform": {',
    `    "os": ${osValue ? `"${osValue}"` : 'null'},`,
    `    "machine": "${machine || '<detect machine label>'}",`,
    `    "runtime": "${client.runtime}"`,
    '  },',
    '  "metadata": {',
    '    "installProtocol": "neverzero-single-prompt-bootstrap-v1",',
    '    "coldStart": "required",',
    '    "heartbeatIntervalSeconds": "60",',
    `    "rulesFile": "${client.rulesFile}",`,
    `    "pasteTarget": "${client.pasteTarget}",`,
    `    "contextUrl": "${contextUrl}",`,
    `    "messagesUrl": "${messagesUrl}",`,
    `    "currentTask": "${currentTask || '<current task>'}",`,
    `    "capabilities": "${capabilitiesList.join(', ')}"`,
    '  }',
    '}',
    '',
    '3. Capture response.agent.id as NEVERZERO_AGENT_ID and response.apiKey as NEVERZERO_API_KEY. The full key is shown only once; never write it to AGENTS.md, source files, memory docs, commits, logs, screenshots, or chat memory.',
    '4. Store secrets in a local secure config or an ignored env file such as .neverzero.local.env. Ensure .gitignore contains .neverzero.local.env and .env.neverzero.local before writing either file.',
    '5. The local env file should contain only local runtime config like this:',
    'NEVERZERO_API_KEY=<one-time-key-from-registration>',
    `NEVERZERO_WORKSPACE=${workspace}`,
    'NEVERZERO_AGENT_ID=<agent-id-from-registration>',
    `NEVERZERO_AGENT_NAME=${agentName || `${client.name} on this device`}`,
    `NEVERZERO_AGENT_RUNTIME=${client.runtime}`,
    `NEVERZERO_CONTEXT_URL=${contextUrl}`,
    'NEVERZERO_HEARTBEAT_URL=<api-base>/api/agents/<agent-id-from-registration>/heartbeat',
    'NEVERZERO_HANDOFF_URL=<api-base>/api/agents/<agent-id-from-registration>/handoff',
    `NEVERZERO_MESSAGES_URL=${messagesUrl}`,
    'NEVERZERO_HEARTBEAT_INTERVAL_SECONDS=60',
    '',
    '6. Create or update AGENTS.md with this secret-free protocol block. Preserve existing AGENTS.md instructions and put this near the top:',
    '```md',
    '## Throughline Cold Start Protocol',
    '',
    'This repository uses Throughline as the shared workspace memory. Do not start from chat memory alone.',
    '',
    'Required first action in every new agent session:',
    '1. Before analysis, planning, code edits, shell commands, or answers, fetch Throughline context.',
    '2. Read NEVERZERO_API_KEY and NEVERZERO_AGENT_ID from the shell, secure local config, or an ignored local env file. Never read the key from AGENTS.md.',
    '3. GET $NEVERZERO_CONTEXT_URL with header: Authorization: Bearer $NEVERZERO_API_KEY.',
    '4. Read coldStartSummary, workspace.pinnedMemories, activeAgents, openTasks, blockers, handoffs, decisions, ledger.recentEvents, and protocol.',
    '5. If the context fetch fails, stop and say: Throughline context fetch failed. Then ask whether to continue in degraded mode.',
    '',
    'Heartbeat while active:',
    '- Generate a fresh session_id for every new session.',
    '- POST $NEVERZERO_HEARTBEAT_URL every $NEVERZERO_HEARTBEAT_INTERVAL_SECONDS seconds while active.',
    '- Include agent_id, agent_name, agent_from, runtime, machine, os, session_id, current_task, capabilities, project_path, status, and parent_agent_id when applicable.',
    '- Register subagents separately and include parent_agent_id in their metadata or heartbeat.',
    '',
    'Agent-to-agent context relay:',
    '- Use $NEVERZERO_MESSAGES_URL for live peer context when a full cold-start fetch is unnecessary.',
    '- GET $NEVERZERO_MESSAGES_URL?agentId=$NEVERZERO_AGENT_ID with header Authorization: Bearer $NEVERZERO_API_KEY to read messages addressed to this agent plus workspace broadcasts.',
    '- POST $NEVERZERO_MESSAGES_URL with the same Authorization header plus fromAgentId, optional toAgentId, kind, summary, context, refs, and sessionId to share context, decisions, questions, or handoffs with peers.',
    '- Never include secrets in relay messages; share only context, blockers, decisions, file refs, and handoff pointers.',
    '',
    'Before exit:',
    '- POST $NEVERZERO_HANDOFF_URL when supported with Goal, Current state, Completed work, Open blockers, Files touched, Decisions made, and Next action.',
    '',
    'Security:',
    '- The full NEVERZERO_API_KEY must never be written to AGENTS.md, committed files, repo memory, or agent-visible shared docs.',
    '- Only the key prefix may appear in UI lists or shared summaries.',
    '```',
    '',
    `7. Add this runtime pointer if ${client.name} does not automatically load AGENTS.md: ${runtimePointer({ client })}`,
    '8. Generate a fresh session_id for this run. Then immediately cold-start by GETting $NEVERZERO_CONTEXT_URL with Authorization: Bearer $NEVERZERO_API_KEY.',
    '9. POST the first heartbeat to $NEVERZERO_HEARTBEAT_URL with this identity shape:',
    '{',
    '  "agent_id": "$NEVERZERO_AGENT_ID",',
    `  "agent_name": "${agentName || `${client.name} on this device`}",`,
    `  "agent_from": "${client.id}",`,
    `  "workspace": "${workspace}",`,
    `  "runtime": "${client.runtime}",`,
    `  "machine": "${machine || '<detect machine label>'}",`,
    `  "os": "${osValue ?? 'auto'}",`,
    '  "session_id": "<fresh-session-id>",',
    '  "capabilities": [',
    capabilityLines,
    '  ],',
    `  "current_task": "${currentTask || '<current task>'}",`,
    '  "project_path": "<absolute repo path>",',
    '  "status": "working"',
    '}',
    '',
    `10. Tell the user setup is complete and point them to ${apiBase}/${workspace}/agents to verify the active agent. If you generated a new key, show the full key once only after it has been saved locally.`,
  ].join('\n');
}

function smokeTestCode({
  shell,
  contextUrl,
  heartbeatUrl,
  messagesUrl,
  client,
  machine,
  capabilities,
  currentTask,
}: {
  shell: Shell;
  contextUrl: string;
  heartbeatUrl: string;
  messagesUrl: string;
  client: ClientDef;
  machine: string;
  capabilities: string;
  currentTask: string;
}): string {
  if (shell === 'powershell') {
    return [
      '$headers = @{ Authorization = "Bearer $env:NEVERZERO_API_KEY" }',
      `Invoke-RestMethod -Uri "${contextUrl}" -Headers $headers`,
      '',
      '$sessionId = [guid]::NewGuid().ToString()',
      '$body = @{',
      '  agent_id = $env:NEVERZERO_AGENT_ID',
      '  agent_name = $env:NEVERZERO_AGENT_NAME',
      `  agent_from = "${client.id}"`,
      '  sessionId = $sessionId',
      `  runtime = "${client.runtime}"`,
      `  machine = "${machine || 'this-device'}"`,
      `  currentTask = "${currentTask || 'connect Throughline'}"`,
      `  capabilities = @(${capabilities.split(',').map((item) => `"${item.trim()}"`).filter((item) => item !== '""').join(', ') || '"context"'})`,
      '  projectPath = (Get-Location).Path',
      '  status = "working"',
      '} | ConvertTo-Json',
      `Invoke-RestMethod -Method Post -Uri "${heartbeatUrl}" -Headers $headers -ContentType "application/json" -Body $body`,
      '',
      '$message = @{',
      '  fromAgentId = $env:NEVERZERO_AGENT_ID',
      '  kind = "context"',
      '  summary = "Smoke test peer context packet"',
      '  context = "This agent can share context through Throughline without refetching the full cold-start payload."',
      '  refs = @($env:NEVERZERO_CONTEXT_URL)',
      '  sessionId = $sessionId',
      '} | ConvertTo-Json',
      `Invoke-RestMethod -Method Post -Uri "${messagesUrl}" -Headers $headers -ContentType "application/json" -Body $message`,
    ].join('\n');
  }

  return [
    'SESSION_ID="$(date +%s)-$RANDOM"',
    `curl -sS "${contextUrl}" \\`,
    '  -H "Authorization: Bearer $NEVERZERO_API_KEY"',
    '',
    `curl -sS -X POST "${heartbeatUrl}" \\`,
    '  -H "Authorization: Bearer $NEVERZERO_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '{"agent_id":"'"$NEVERZERO_AGENT_ID"'","agent_name":"'"$NEVERZERO_AGENT_NAME"'","agent_from":"${client.id}","sessionId":"'"$SESSION_ID"'","runtime":"${client.runtime}","machine":"${machine || 'this-device'}","currentTask":"${currentTask || 'connect Throughline'}","capabilities":[${capabilities.split(',').map((item) => `"${item.trim()}"`).filter((item) => item !== '""').join(', ') || '"context"'}],"projectPath":"'"$PWD"'","status":"working"}'`,
    '',
    `curl -sS -X POST "${messagesUrl}" \\`,
    '  -H "Authorization: Bearer $NEVERZERO_API_KEY" \\',
    '  -H "Content-Type: application/json" \\',
    `  -d '{"fromAgentId":"'"$NEVERZERO_AGENT_ID"'","kind":"context","summary":"Smoke test peer context packet","context":"This agent can share context through Throughline without refetching the full cold-start payload.","refs":["'"$NEVERZERO_CONTEXT_URL"'"],"sessionId":"'"$SESSION_ID"'"}'`,
  ].join('\n');
}

export type InstallAppProps = {
  orgSlug?: string;
};

function InstallPageInner({ orgSlug }: InstallAppProps) {
  const params = useSearchParams();
  const fromBrain = params.get('from') === 'brain';
  const [origin, setOrigin] = useState('http://localhost:3000');
  const [shell, setShell] = useState<Shell>('powershell');
  const [clientId, setClientId] = useState<ClientId>('codex');
  const [workspace, setWorkspace] = useState(orgSlug ?? 'atlas');
  const [agentName, setAgentName] = useState('Codex / GStack on this device');
  const [machine, setMachine] = useState('');
  const [os, setOs] = useState<OsChoice>('auto');
  const [owner, setOwner] = useState('sam');
  const [capabilities, setCapabilities] = useState('read workspace context, edit code, run tests, write handoffs');
  const [currentTask, setCurrentTask] = useState('connect Throughline cold start and heartbeat');
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setMachine((existing) => existing || window.navigator.platform || 'this-device');
  }, []);

  useEffect(() => {
    if (orgSlug) setWorkspace(orgSlug);
  }, [orgSlug]);

  const selectedClient = useMemo(
    () => CLIENTS.find((c) => c.id === clientId) ?? CLIENTS[0],
    [clientId],
  );
  const workspaceSlug = cleanSlug(workspace);
  const basePath = orgSlug ? `/${orgSlug}` : '';
  const agentsHref = orgSlug ? `/${orgSlug}/agents` : '/agents';
  const workstationHref = orgSlug ? `/${orgSlug}/workstation` : '/workstation';
  const contextUrl = `${origin}/api/context`;
  const heartbeatUrl = `${origin}/api/agents/${registration?.agent.id ?? '<agent-id>'}/heartbeat`;
  const handoffUrl = `${origin}/api/agents/${registration?.agent.id ?? '<agent-id>'}/handoff`;
  const messagesUrl = `${origin}/api/orgs/${workspaceSlug}/agent-messages`;

  async function registerAgent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setRegistration(null);

    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName.trim(),
          from: selectedClient.id,
          org: workspaceSlug,
          orgSlug: workspaceSlug,
          workspace: workspaceSlug,
          ownedBy: owner.trim() || 'sam',
          platform: {
            os: os === 'auto' ? null : os,
            machine: machine.trim() || null,
            runtime: selectedClient.runtime,
          },
          metadata: {
            installProtocol: 'neverzero-single-prompt-bootstrap-v1',
            coldStart: 'required',
            heartbeatIntervalSeconds: '60',
            rulesFile: selectedClient.rulesFile,
            pasteTarget: selectedClient.pasteTarget,
            contextUrl,
            messagesUrl,
            currentTask,
            capabilities,
          },
        }),
      });
      const data = (await res.json()) as Registration | { error: string };
      if (!res.ok || !('agent' in data)) {
        setError('error' in data ? data.error : 'Failed to register agent.');
        return;
      }
      setRegistration(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error while registering agent.');
    } finally {
      setSubmitting(false);
    }
  }

  const configCode = envCode({
    registration,
    workspace: workspaceSlug,
    client: selectedClient,
    contextUrl,
    heartbeatUrl,
    handoffUrl,
    messagesUrl,
  });
  const promptCode = bootstrapPrompt({
    registration,
    client: selectedClient,
    workspace: workspaceSlug,
    contextUrl,
    heartbeatUrl,
    handoffUrl,
    messagesUrl,
    machine,
    capabilities,
    currentTask,
  });
  const identityCode = identityJson({
    registration,
    client: selectedClient,
    workspace: workspaceSlug,
    machine,
    os,
    capabilities,
    currentTask,
  });
  const singlePromptCode = singleBootstrapPrompt({
    client: selectedClient,
    workspace: workspaceSlug,
    owner,
    agentName,
    contextUrl,
    heartbeatUrl,
    messagesUrl,
    machine,
    os,
    capabilities,
    currentTask,
  }).replaceAll('<api-base>/api/agents/<agent-id-from-registration>/heartbeat', `${origin}/api/agents/<agent-id-from-registration>/heartbeat`)
    .replaceAll('<api-base>/api/agents/<agent-id-from-registration>/handoff', `${origin}/api/agents/<agent-id-from-registration>/handoff`);

  return (
    <div className="install-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href={basePath || '/'}>
            <span className="logo" />
            <span className="name">Throughline<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-crumb">
            <span>Docs</span>
            <span className="sep">{'>'}</span>
            <span className="cur">Install</span>
          </div>
          <div className="nav-right">
            <span className="ver">{workspaceSlug}</span>
            <Link className="txt" href={workstationHref}>Workstation</Link>
            <Link className="txt" href={agentsHref}>Agents</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">DOCS / INSTALL / NO-AMNESIA BOOTSTRAP</div>
        <h1>
          Install the prompt<br />
          <span className="muted">that makes agents remember.</span>
        </h1>
        <p className="lede">
          Paste one bootstrap prompt into the selected agent or IDE. It registers the runtime,
          stores the key locally, updates repo instructions, fetches cold-start context, and
          posts the first heartbeat without making the user walk through five separate steps.
        </p>
        <div className="hero-stat-row">
          <span className="item"><b>1</b> pasteable bootstrap prompt</span>
          <span className="item"><b>1</b> cold-start context fetch</span>
          <span className="item"><b>60s</b> heartbeat cadence</span>
          <span className="item">Works with <b>Codex, Claude, Cursor, VS Code, Windsurf</b></span>
        </div>
      </section>

      <section className="section">
        <h2>
          Pick your runtime
          <span className="count">/ prompt and identity adapt below</span>
        </h2>
        <div className="client-grid">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              className="client"
              data-on={clientId === c.id ? '1' : '0'}
              onClick={() => {
                setClientId(c.id);
                setAgentName(`${c.name} on this device`);
                setRegistration(null);
                setError(null);
              }}
              type="button"
            >
              <span className="glyph">{c.glyph}</span>
              <span className="name">{c.name}</span>
              <span className="meta">{c.meta}</span>
              {c.recommended && <span className="stat">recommended</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="steps-wrap">
        {fromBrain && (
          <div className="onboard-banner" style={{ marginBottom: 16 }}>
            <span className="num">1</span>
            <div className="txt">
              <b>Workspace created.</b> Paste the single bootstrap prompt into the first agent so
              future sessions start from Throughline context and can relay peer packets.
            </div>
            <Link className="skip" href={workstationHref}>open workspace</Link>
          </div>
        )}

        <Step num={1}>
          <h3>Copy the single bootstrap prompt</h3>
          <p className="lede">
            Paste this into {selectedClient.name}. The agent will register itself, save the key
            outside the repo, update AGENTS.md with the cold-start protocol, create any runtime
            pointer file it needs, fetch context, post the first heartbeat, and verify peer relay.
          </p>
          <CodeBlock
            path={`${selectedClient.name} one-prompt installer`}
            id="single-bootstrap-prompt"
            code={singlePromptCode}
          />
          <div className="identity-grid">
            <div><b>register</b><span>POST /api/agents if no stable install exists.</span></div>
            <div><b>secure config</b><span>Store the full key only in env or ignored local config.</span></div>
            <div><b>AGENTS.md</b><span>Add the secret-free cold-start and heartbeat protocol.</span></div>
            <div><b>verify</b><span>Fetch context, heartbeat, then appear active in the registry.</span></div>
          </div>
        </Step>

        <Step num={2}>
          <h3>Optional browser-generated key</h3>
          <p className="lede">
            Use this if you want the page to mint the key instead of letting the agent do it.
            The full key appears once in the green box; generated config below uses a placeholder.
          </p>
          <form className="bootstrap-form" onSubmit={registerAgent}>
            <div className="field-row">
              <label className="field">
                <span>Workspace slug</span>
                <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
              </label>
              <label className="field">
                <span>Owner</span>
                <input value={owner} onChange={(e) => setOwner(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Agent name</span>
              <input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                maxLength={80}
                required
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Machine label</span>
                <input value={machine} onChange={(e) => setMachine(e.target.value)} />
              </label>
              <label className="field">
                <span>OS</span>
                <select value={os} onChange={(e) => setOs(e.target.value as OsChoice)}>
                  <option value="auto">Auto</option>
                  <option value="mac">macOS</option>
                  <option value="win">Windows</option>
                  <option value="linux">Linux</option>
                  <option value="wsl">WSL</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>Capabilities</span>
              <textarea value={capabilities} onChange={(e) => setCapabilities(e.target.value)} rows={2} />
            </label>
            <label className="field">
              <span>Current task differentiator</span>
              <input value={currentTask} onChange={(e) => setCurrentTask(e.target.value)} />
            </label>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button className="primary-action" type="submit" disabled={submitting || !agentName.trim()}>
                {submitting ? 'Generating key...' : `Generate optional key for ${selectedClient.name}`}
              </button>
              <span className="action-hint">
                POST <Inline>/api/agents</Inline> with runtime, machine, workspace identity, and bootstrap metadata.
              </span>
            </div>
          </form>

          {registration && (
            <div className="key-card">
              <div>
                <div className="key-eyebrow">Key generated once / {registration.agent.id}</div>
                <h4>{registration.agent.name}</h4>
                <p>
                  Save the full key now in local secure config. Later screens only show prefix{' '}
                  <Inline>{registration.agent.apiKeyPrefix}</Inline>.
                </p>
              </div>
              <code>{registration.apiKey}</code>
            </div>
          )}

          <div className="artifact-stack">
            <CodeBlock path={`${selectedClient.name} secure env template`} id="neverzero-env" code={configCode} />
            <CodeBlock path={`${selectedClient.rulesFile} protocol preview`} id="bootstrap-prompt" code={promptCode} />
          </div>
          <CodeBlock path="heartbeat identity JSON" id="identity-json" code={identityCode} />
          <div className="note">
            {selectedClient.note} {runtimePointer({ client: selectedClient })}
          </div>
        </Step>

        <Step num={3}>
          <h3>Smoke test context, heartbeat, and relay</h3>
          <p className="lede">
            A working install fetches <Inline>/api/context</Inline> with the key, posts to the
            agent-specific heartbeat URL, sends one peer context packet, and records the events
            in the workspace ledger.
          </p>
          <Tabs
            value={shell}
            onChange={setShell}
            options={[
              { id: 'powershell', label: 'PowerShell' },
              { id: 'bash', label: 'macOS / Linux / WSL' },
            ]}
          />
          <CodeBlock
            path="terminal smoke test"
            id="smoke-test"
            code={smokeTestCode({
              shell,
              contextUrl,
              heartbeatUrl,
              messagesUrl,
              client: selectedClient,
              machine,
              capabilities,
              currentTask,
            })}
          />
        </Step>
      </section>

      <section className="capabilities">
        <h2>What the agent must do every time</h2>
        <div className="grid">
          <div className="cap">
            <div className="h">COLD START</div>
            <h4>Fetch context first.</h4>
            <p>
              New sessions call <Inline>/api/context</Inline> before analysis or edits, so they
              start with workspace memory instead of an empty chat.
            </p>
            <div className="tools">
              <span className="tool">Authorization header</span>
              <span className="tool">coldStartSummary</span>
              <span className="tool">pinned memories</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">HEARTBEAT</div>
            <h4>Stay visible while working.</h4>
            <p>
              Agents post identity, session id, current task, and capabilities every minute so
              peers can see who is active and what they are doing. Between cold starts, agents
              use the message relay to share context packets without reloading the full workspace.
            </p>
            <div className="tools">
              <span className="tool">session_id</span>
              <span className="tool">current_task</span>
              <span className="tool">lastSeenAt</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">HANDOFF</div>
            <h4>Leave resumable state.</h4>
            <p>
              Before stopping, the prompt tells each client to write decisions or handoffs when
              that runtime has a tool for it.
            </p>
            <div className="tools">
              <span className="tool">decisions</span>
              <span className="tool">handoff</span>
              <span className="tool">workspace memory</span>
            </div>
          </div>
          <div className="cap">
            <div className="h">RELAY</div>
            <h4>Share context between peers.</h4>
            <p>
              Agents post compact context packets to <Inline>/api/orgs/[slug]/agent-messages</Inline>
              so other agents can pick up decisions, blockers, and file refs while work is active.
            </p>
            <div className="tools">
              <span className="tool">agent messages</span>
              <span className="tool">workspace broadcast</span>
              <span className="tool">ledger event</span>
            </div>
          </div>
        </div>
      </section>

      <section className="tshoot" id="troubleshoot">
        <h2>Troubleshooting</h2>
        <details>
          <summary>The agent starts without context</summary>
          <div className="ds-body">
            Put the bootstrap prompt in the client&apos;s durable project instruction file, not only
            the current chat. For {selectedClient.name}, use <Inline>{selectedClient.pasteTarget}</Inline>.
          </div>
        </details>
        <details>
          <summary>The context request returns 401</summary>
          <div className="ds-body">
            Confirm the request includes <Inline>Authorization: Bearer $NEVERZERO_API_KEY</Inline>
            and that the full one-time key was saved before leaving this page.
          </div>
        </details>
        <details>
          <summary>The heartbeat returns 403</summary>
          <div className="ds-body">
            The key belongs to a different agent id. Generate a new key or use the heartbeat URL
            created for the same <Inline>NEVERZERO_AGENT_ID</Inline>.
          </div>
        </details>
        <details>
          <summary>How is this different from the old register modal?</summary>
          <div className="ds-body">
            The old modal only minted a key. This page gives the key plus the durable prompt,
            identity payload, context URL, heartbeat URL, and smoke test needed to prevent amnesia.
          </div>
        </details>
      </section>

      <section className="support">
        <div className="row">
          <span>Next surface</span>
          <span className="grow" />
          <Link href={agentsHref}>View registered agents</Link>
          <Link href={workstationHref}>Open workspace</Link>
          <Link href="/docs/install">Canonical docs URL</Link>
        </div>
      </section>
    </div>
  );
}

export function InstallApp({ orgSlug }: InstallAppProps) {
  return (
    <Suspense fallback={<div className="install-root" />}>
      <InstallPageInner orgSlug={orgSlug} />
    </Suspense>
  );
}

export default function InstallPage() {
  return <InstallApp />;
}
