'use client';

import { useEffect, useRef, useState } from 'react';
import type { RegisteredAgent } from './InstallContext';

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

export interface RegisterAgentModalProps {
  open: boolean;
  client: string;
  defaultName: string;
  orgSlug: string;
  onClose: () => void;
  onRegistered: (agent: RegisteredAgent, apiKey: string) => void;
}

export default function RegisterAgentModal({
  open,
  client,
  defaultName,
  orgSlug,
  onClose,
  onRegistered,
}: RegisterAgentModalProps) {
  const [name, setName] = useState(defaultName);
  const [machine, setMachine] = useState('');
  const [os, setOs] = useState<'mac' | 'win' | 'linux' | 'wsl' | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(defaultName);
      setMachine('');
      setOs('');
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          from: client,
          org: orgSlug,
          platform: { os: os || null, machine: machine.trim() || null },
        }),
      });
      const data = (await res.json()) as
        | { agent: RegisteredAgent; apiKey: string }
        | { error: string };
      if (!res.ok || !('agent' in data)) {
        setError('error' in data ? data.error : 'Failed to register agent');
        return;
      }
      onRegistered(data.agent, data.apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="ram-backdrop" onClick={onClose} />
      <div className="ram-modal" role="dialog" aria-modal="true" aria-label="Register agent">
        <div className="ram-hd">
          <span className="ram-eyebrow">REGISTER · {CLIENT_LABELS[client] || client}</span>
          <button className="ram-close" onClick={onClose} type="button" aria-label="Close">
            ×
          </button>
        </div>
        <div className="ram-body">
          <h2>Register this agent</h2>
          <p className="ram-sub">
            We&apos;ll mint a workspace-scoped API key just for this client. You only see the
            full key once — paste it into your config and you&apos;re done.
          </p>
          <form onSubmit={submit}>
            <div className="ram-field">
              <label>
                Agent name <span className="hint">how it shows up in the workstation</span>
              </label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={defaultName}
                required
                maxLength={80}
              />
            </div>
            <div className="ram-row">
              <div className="ram-field">
                <label>Machine label <span className="hint">optional</span></label>
                <input
                  value={machine}
                  onChange={(e) => setMachine(e.target.value)}
                  placeholder="sam-mbp-m3"
                />
              </div>
              <div className="ram-field">
                <label>OS</label>
                <select value={os} onChange={(e) => setOs(e.target.value as typeof os)}>
                  <option value="">Auto</option>
                  <option value="mac">macOS</option>
                  <option value="win">Windows</option>
                  <option value="linux">Linux</option>
                  <option value="wsl">WSL</option>
                </select>
              </div>
            </div>

            {error && <div className="ram-error">{error}</div>}

            <div className="ram-actions">
              <button className="ram-cancel" type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button className="ram-submit" type="submit" disabled={submitting || !name.trim()}>
                {submitting ? 'Minting key…' : 'Generate API key →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
