'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import RegisterAgentModal from '@/app/install/_components/RegisterAgentModal';
import type { RegisteredAgent } from '@/app/install/_components/InstallContext';

type ClientId =
  | 'claude-desktop'
  | 'claude-code'
  | 'cursor'
  | 'vscode'
  | 'windsurf'
  | 'antigravity'
  | 'zed'
  | 'continue'
  | 'aider'
  | 'custom';

const CLIENTS: { id: ClientId; glyph: string; name: string; meta: string; recommended?: boolean }[] = [
  { id: 'claude-desktop', glyph: 'CD', name: 'Claude Desktop', meta: 'MCP · OFFICIAL', recommended: true },
  { id: 'claude-code',    glyph: 'cc', name: 'Claude Code',    meta: 'MCP · CLI' },
  { id: 'cursor',         glyph: '⌘',  name: 'Cursor',          meta: 'MCP' },
  { id: 'vscode',         glyph: 'VS', name: 'VS Code',         meta: 'EXTENSION' },
  { id: 'windsurf',       glyph: '~~', name: 'Windsurf',        meta: 'MCP' },
  { id: 'antigravity',    glyph: 'AG', name: 'Antigravity',     meta: 'MCP · BETA' },
  { id: 'zed',            glyph: 'Zd', name: 'Zed',             meta: 'CONTEXT SERVER' },
  { id: 'continue',       glyph: '→',  name: 'Continue.dev',    meta: 'MCP' },
  { id: 'aider',          glyph: 'ai', name: 'Aider',           meta: 'CLI · FLAG' },
  { id: 'custom',         glyph: '{}', name: 'Custom / REST',   meta: 'SDK · CURL' },
];

export interface RegisterPanelProps {
  orgSlug: string;
  orgName: string;
  domain: string;
}

export default function RegisterPanel({ orgSlug, orgName, domain }: RegisterPanelProps) {
  const router = useRouter();
  const params = useSearchParams();
  const fromBrain = params.get('from') === 'brain';

  const [client, setClient] = useState<ClientId>('claude-desktop');
  const [modalOpen, setModalOpen] = useState(false);
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [issuedAgent, setIssuedAgent] = useState<RegisteredAgent | null>(null);
  const [copied, setCopied] = useState(false);

  const defaultName =
    CLIENTS.find((c) => c.id === client)!.name + ' on this device';

  return (
    <div className="reg-panel-wrap">
      {fromBrain && (
        <div className="onboard-banner">
          <span className="num">✓</span>
          <div className="txt">
            <b>{orgName} workspace created.</b> Now connect your first agent. Pick a client, click
            <em> Generate API key</em>, and paste the snippets into your editor — each install
            gets its own scoped key.
          </div>
          <Link className="skip" href={`/${orgSlug}/workstation`}>skip → workstation</Link>
        </div>
      )}

      <section className="reg-panel">
        <div className="reg-head">
          <div className="reg-eyebrow">REGISTER AGENT · {domain.toUpperCase()}</div>
          <h2>
            Install Throughline in any agent.<br />
            <span className="muted">Each install gets its own API key.</span>
          </h2>
          <p className="reg-lede">
            Pick the client below. We mint a workspace-scoped key bound to this client and machine,
            then drop it into the right config snippet. Revoke any time from{' '}
            <Link href={`/${orgSlug}/agents`} className="link">/{orgSlug}/agents</Link>.
          </p>
        </div>

        <div className="reg-client-grid">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="reg-client"
              data-on={client === c.id ? '1' : '0'}
              onClick={() => {
                setClient(c.id);
                setIssuedKey(null);
                setIssuedAgent(null);
              }}
            >
              <span className="glyph">{c.glyph}</span>
              <span className="name">{c.name}</span>
              <span className="meta">{c.meta}</span>
              {c.recommended && <span className="badge">recommended</span>}
            </button>
          ))}
        </div>

        {!issuedKey ? (
          <div className="reg-cta-row">
            <button className="reg-primary" type="button" onClick={() => setModalOpen(true)}>
              Generate API key for {CLIENTS.find((c) => c.id === client)!.name} →
            </button>
            <div className="reg-cta-hint">
              We&apos;ll ask for a name + machine label, then return a one-time key.
            </div>
          </div>
        ) : (
          <div className="reg-issued">
            <div className="reg-issued-eyebrow">REGISTERED · agent {issuedAgent?.id}</div>
            <div className="reg-issued-name">
              <b>{issuedAgent?.name}</b>
              <span className="reg-issued-from">on {CLIENTS.find((c) => c.id === client)!.name}</span>
            </div>
            <div className="reg-key-box">
              <code>{issuedKey}</code>
              <button
                type="button"
                className={'reg-copy' + (copied ? ' ok' : '')}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(issuedKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1400);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {copied ? 'copied ✓' : 'copy'}
              </button>
            </div>
            <div className="reg-issued-hint">
              Paste this into your <code>{CLIENTS.find((c) => c.id === client)!.name}</code> config.
              You won&apos;t see the full key again — the prefix{' '}
              <code>{issuedAgent?.apiKeyPrefix}…</code> is all we&apos;ll show next time.
            </div>
            <div className="reg-issued-actions">
              <button
                type="button"
                className="reg-secondary"
                onClick={() => {
                  setIssuedKey(null);
                  setIssuedAgent(null);
                  setModalOpen(true);
                }}
              >
                Register another agent
              </button>
              <Link href={`/${orgSlug}/agents`} className="reg-secondary">
                View all agents →
              </Link>
              <button
                type="button"
                className="reg-secondary"
                onClick={() => router.push(`/${orgSlug}/brain`)}
              >
                Open company brain
              </button>
            </div>
          </div>
        )}
      </section>

      <RegisterAgentModal
        open={modalOpen}
        client={client}
        defaultName={defaultName}
        orgSlug={orgSlug}
        onClose={() => setModalOpen(false)}
        onRegistered={(agent, key) => {
          setIssuedAgent(agent);
          setIssuedKey(key);
          setModalOpen(false);
        }}
      />
    </div>
  );
}
