import Link from 'next/link';
import { listAgents, type Agent } from '@/lib/agents';
import RevokeButton from './_components/RevokeButton';
import './agents.css';

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

export default async function AgentsPage() {
  const agents = await listAgents();
  const counts = {
    total: agents.length,
    connected: agents.filter((a) => a.status === 'connected').length,
    pending: agents.filter((a) => a.status === 'pending').length,
    revoked: agents.filter((a) => a.status === 'revoked').length,
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
            <span>Workspace</span>
            <span className="sep">›</span>
            <span className="cur">Agents</span>
          </div>
          <div className="nav-right">
            <Link className="txt" href="/install">+ Add agent</Link>
            <Link className="txt" href="/workstation">Workstation</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">WORKSPACE · AGENTS · acme</div>
        <h1>
          Your agents.<br />
          <span className="muted">One key per client, per machine.</span>
        </h1>
        <div className="stat-row">
          <span className="item"><b>{counts.total}</b> registered</span>
          <span className="item"><b>{counts.connected}</b> connected</span>
          <span className="item"><b>{counts.pending}</b> pending first call</span>
          <span className="item"><b>{counts.revoked}</b> revoked</span>
        </div>
      </section>

      <section className="list-wrap">
        {agents.length === 0 ? (
          <div className="empty">
            <h3>No agents yet.</h3>
            <p>
              Register your first one to start syncing the brain with your editor.{' '}
              <Link className="cta" href="/install">Open install →</Link>
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
                      <div className="sub">{a.platform.machine}{a.platform.os ? ` · ${a.platform.os}` : ''}</div>
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
                  <td>
                    <code className="key">{a.apiKeyPrefix}…</code>
                  </td>
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
