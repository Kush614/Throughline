'use client';

import Link from 'next/link';
import { useInstall, type RegisteredAgent } from './InstallContext';

const CLIENT_LABELS: Record<string, string> = {
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

export interface RegisterBannerProps {
  selectedClient: string;
  onOpenModal: () => void;
  onRotate: () => void;
}

export default function RegisterBanner({
  selectedClient,
  onOpenModal,
  onRotate,
}: RegisterBannerProps) {
  const { agent, apiKey } = useInstall();
  const clientLabel = CLIENT_LABELS[selectedClient] || selectedClient;

  if (!agent || !apiKey) {
    return (
      <div className="reg-banner">
        <div className="reg-body">
          <span className="reg-eyebrow">STEP 1 · KEY</span>
          <div className="reg-text">
            <b>Generate a workspace API key for {clientLabel}.</b> One click — we mint it, you
            paste it into the snippets below.
          </div>
        </div>
        <button className="reg-cta" onClick={onOpenModal} type="button">
          Generate API key →
        </button>
      </div>
    );
  }

  return (
    <div className="reg-banner ok">
      <div className="reg-body">
        <span className="reg-eyebrow ok">REGISTERED · {agent.name}</span>
        <div className="reg-text">
          <b>{agent.name}</b> · {CLIENT_LABELS[agent.from] || agent.from} ·{' '}
          <code className="reg-key">{apiKey}</code>
          <div className="reg-hint">
            Copy the full key now — when you leave this page, only the prefix{' '}
            <code>{agent.apiKeyPrefix}…</code> stays visible. Find it again in{' '}
            <Link href="/agents" className="reg-link">/agents</Link>.
          </div>
        </div>
      </div>
      <div className="reg-actions">
        <button className="reg-secondary" onClick={onRotate} type="button">
          Register another →
        </button>
      </div>
    </div>
  );
}
