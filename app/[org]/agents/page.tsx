import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listAgents, type Agent } from '@/lib/agents';
import { listAgentMessages } from '@/lib/agent-messages';
import { getOrg } from '@/lib/orgs';
import RevokeButton from '@/app/agents/_components/RevokeButton';
import '@/app/agents/agents.css';

export const dynamic = 'force-dynamic';

const CLIENT_LABELS: Record<string, string> = {
  codex: 'Codex / GStack',
  'claude-desktop': 'Claude Desktop',
  'claude-code': 'Claude Code',
  cursor: 'Cursor',
  vscode: 'VS Code',
  windsurf: 'Windsurf',
  antigravity: 'Antigravity',
  zed: 'Zed',
  continue: 'Continue.dev',
  aider: 'Aider',
  custom: 'Custom / REST',
};

function relative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return Math.max(0, Math.floor(ms / 1000)) + 's ago';
  if (ms < 3_600_000) return Math.floor(ms / 60_000) + 'm ago';
  if (ms < 86_400_000) return Math.floor(ms / 3_600_000) + 'h ago';
  return Math.floor(ms / 86_400_000) + 'd ago';
}

function StatusPill({ status }: { status: Agent['status'] }) {
  return (
    <span className={'pill status-' + status}>
      {status === 'connected' && <span className="dot" />}
      {status}
    </span>
  );
}

function meta(agent: Agent, key: string): string {
  return agent.metadata[key] ?? '';
}

function compact(value: string, fallback: string = 'not reported'): string {
  return value.trim() || fallback;
}

export default async function OrgAgentsPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org: slugParam } = await params;
  const slug = slugParam.toLowerCase();
  const org = await getOrg(slug);
  if (!org) notFound();

  const agents = await listAgents({ orgSlug: org.slug });
  const messages = listAgentMessages({ orgSlug: org.slug, limit: 8 });
  const registrationHistory = agents
    .slice()
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const counts = {
    total: agents.length,
    connected: agents.filter((a) => a.status === 'connected').length,
    pending: agents.filter((a) => a.status === 'pending').length,
    revoked: agents.filter((a) => a.status === 'revoked').length,
    messages: messages.length,
  };

  return (
    <div className="agents-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">Throughline<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-crumb">
            <Link href={`/${org.slug}`} style={{ color: 'var(--ink-soft)' }}>{org.name}</Link>
            <span className="sep">›</span>
            <span className="cur">Agents</span>
          </div>
          <div className="nav-right">
            <Link className="txt" href={`/${org.slug}/install`}>+ Add agent</Link>
            <Link className="txt" href={`/${org.slug}/workstation`}>Workstation</Link>
            <Link className="txt" href={`/${org.slug}/brain`}>Brain</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">{org.domain.toUpperCase()} · AGENTS</div>
        <h1>
          {org.name} agents.<br />
          <span className="muted">One key per client, per machine.</span>
        </h1>
        <div className="stat-row">
          <span className="item"><b>{counts.total}</b> registered</span>
          <span className="item"><b>{counts.connected}</b> connected</span>
          <span className="item"><b>{counts.pending}</b> pending</span>
          <span className="item"><b>{counts.revoked}</b> revoked</span>
          <span className="item"><b>{counts.messages}</b> peer packets</span>
        </div>
      </section>

      <section className="workspace-panels" aria-label="Workspace agent coordination">
        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Registration history</div>
              <h2>Every install record, oldest first.</h2>
            </div>
            <span className="panel-count">{registrationHistory.length}</span>
          </div>
          <div className="history-list">
            {registrationHistory.map((agent) => (
              <div className="history-row" key={agent.id}>
                <div>
                  <div className="history-name">{agent.name}</div>
                  <div className="history-meta">
                    {agent.platform.runtime || CLIENT_LABELS[agent.from] || agent.from}
                    {agent.platform.machine ? ` / ${agent.platform.machine}` : ''}
                  </div>
                </div>
                <div className="history-side">
                  <StatusPill status={agent.status} />
                  <time dateTime={agent.createdAt}>{new Date(agent.createdAt).toISOString().replace('.000Z', 'Z')}</time>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Agent-to-agent context</div>
              <h2>Live shared packets through Throughline.</h2>
            </div>
            <span className="panel-count">{messages.length}</span>
          </div>
          {messages.length === 0 ? (
            <div className="panel-empty">
              No peer packets yet. Agents can POST context, decisions, questions, and handoffs to{' '}
              <code>/api/orgs/{org.slug}/agent-messages</code>.
            </div>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <div className="message-row" key={message.id}>
                  <div className="flow-line">
                    <span>{message.fromAgentName}</span>
                    <span className="arrow">-&gt;</span>
                    <span>{message.toAgentName ?? 'workspace broadcast'}</span>
                    <span className="kind">{message.kind}</span>
                  </div>
                  <div className="message-summary">{message.summary}</div>
                  {message.context && <div className="message-context">{message.context}</div>}
                  <div className="message-meta">
                    <time dateTime={message.createdAt}>{relative(message.createdAt)}</time>
                    {message.refs.length > 0 && <span>{message.refs.join(' / ')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="list-wrap">
        {agents.length === 0 ? (
          <div className="empty">
            <h3>No agents yet.</h3>
            <p>
              Register your first one to start syncing the {org.name} brain.{' '}
              <Link className="cta" href={`/${org.slug}/install`}>Open install →</Link>
            </p>
          </div>
        ) : (
          <table className="agent-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Runtime / Machine</th>
                <th>Status</th>
                <th>Current task</th>
                <th>Session / Capabilities</th>
                <th>Key</th>
                <th>Last seen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} data-status={a.status}>
                  <td>
                    <div className="name">{a.name}</div>
                    <div className="sub">{a.id}</div>
                    {meta(a, 'parent_agent_id') && (
                      <div className="sub">parent {meta(a, 'parent_agent_id')}</div>
                    )}
                  </td>
                  <td>
                    <div className="from">{a.platform.runtime || CLIENT_LABELS[a.from] || a.from}</div>
                    {a.platform.machine && (
                      <div className="sub">
                        {a.platform.machine}{a.platform.os ? ` · ${a.platform.os}` : ''}
                      </div>
                    )}
                    <div className="sub">{CLIENT_LABELS[a.from] || a.from}</div>
                  </td>
                  <td><StatusPill status={a.status} /></td>
                  <td className="task">
                    <div>{compact(meta(a, 'current_task'))}</div>
                    <div className="sub">owner {a.ownedBy} · created {relative(a.createdAt)}</div>
                  </td>
                  <td className="task">
                    <div className="sub">session {compact(meta(a, 'session_id'), 'none yet')}</div>
                    <div>{compact(meta(a, 'capabilities'))}</div>
                  </td>
                  <td><code className="key">{a.apiKeyPrefix}…</code></td>
                  <td className="ts">{a.lastSeenAt ? relative(a.lastSeenAt) : '—'}</td>
                  <td className="actions">
                    {a.status !== 'revoked' && <RevokeButton id={a.id} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
