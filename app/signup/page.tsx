'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import './signup.css';

type AgentColorStyle = CSSProperties & { ['--agent-color']?: string };

export default function SignUpPage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(true);

  return (
    <div className="signup-root">
      <div className="auth">
        <div className="preview">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">Throughline<span className="sm">Cloud</span></span>
          </Link>

          <div className="eyebrow">IN 60 SECONDS</div>
          <h1>
            Give your team<br />
            <span className="muted">a persistent brain.</span>
          </h1>
          <p className="lede">
            After signup we&apos;ll help you build your <b>company brain</b> — the one document
            your agents read before doing anything. Plans, decisions, brand voice, codebase, all
            in one place. Edit it, your team adopts it, every agent obeys it.
          </p>

          <div className="preview-card">
            <div className="card-hd">
              <span className="d" /><span className="d" /><span className="d" />
              <span className="tab"><span className="live" />Acme Robotics — Company Brain</span>
            </div>
            <div className="body">
              <div className="doc-meta">3 humans · 5 agents · last updated 4m ago</div>
              <h3>Acme Robotics</h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 14px' }}>
                Industrial robotics for warehouses. Founded 2023. Series A by Sequoia · April 2026.
              </p>

              <div className="pv-evt">
                <span className="av" style={{ background: 'var(--bg-sunken)' }}>📌</span>
                <div className="body">
                  <div className="line">
                    <b>Brand voice:</b> Never &quot;AI assistant&quot;. Always &quot;agent&quot; or by name.
                  </div>
                  <div className="when">PINNED · read by 5 agents</div>
                </div>
              </div>
              <div className="pv-evt">
                <span className="av" style={{ background: 'var(--bg-sunken)' }}>📌</span>
                <div className="body">
                  <div className="line">
                    <b>Decisions:</b> Workspace tier ships with shared memory + agent SSO.
                  </div>
                  <div className="when">May 12 · referenced by Atlas, Iris, Loop</div>
                </div>
              </div>
              <div className="pv-evt" style={{ ['--agent-color']: 'var(--a-iris)' } as AgentColorStyle}>
                <span className="av" data-agent="1">IR</span>
                <div className="body">
                  <div className="line">
                    <b>Iris</b> just read the brain · ready for first task
                  </div>
                  <div className="when">14s ago</div>
                </div>
              </div>
            </div>
          </div>

          <div className="foot">
            <span className="item">⌗ <b>14-day</b> trial</span>
            <span className="item">⌗ <b>No</b> credit card</span>
            <span className="item">⌗ Cancel <b>anytime</b></span>
            <span className="item">⌗ Self-host available</span>
          </div>
        </div>

        <div className="form-side">
          <div className="form-top">
            <span />
            <span className="alt">
              Already have an account? <Link href="/signin">Sign in</Link>
            </span>
          </div>

          <div className="form-wrap">
            <div className="form-card">
              <div className="mark-mobile">
                <span className="logo" />
                <span className="name">Throughline</span>
              </div>

              <h2>Get early access.</h2>
              <p className="sub">
                200 teams in the closed beta. Your invite arrives instantly if your domain is on
                the list.
              </p>

              <div className="providers">
                <button className="provider-btn" type="button">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M15.5 8.2c0-.6 0-1.1-.1-1.7H8v3.2h4.2c-.2 1-.7 1.8-1.5 2.4v2h2.4c1.4-1.3 2.4-3.2 2.4-5.9Z" fill="#4285F4" />
                    <path d="M8 16c2 0 3.8-.7 5-1.8l-2.4-2c-.7.5-1.6.8-2.6.8-2 0-3.7-1.3-4.3-3.1H1.2v2c1.3 2.5 3.9 4.1 6.8 4.1Z" fill="#34A853" />
                    <path d="M3.7 9.9c-.2-.5-.2-1-.2-1.5s.1-1 .2-1.5v-2H1.2c-.5 1.1-.8 2.3-.8 3.5s.3 2.4.8 3.5l2.5-2Z" fill="#FBBC04" />
                    <path d="M8 3.4c1.1 0 2.1.4 2.9 1.1l2.1-2.1C11.8 1.2 10 .4 8 .4 5.1.4 2.5 2 1.2 4.5l2.5 2C4.3 4.6 6 3.4 8 3.4Z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
                <button className="provider-btn" type="button">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.6 0 0 3.6 0 8c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1.1-2.7-1.1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.2-.1-.2-.3-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3.7 0 1.4.1 2 .3 1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.2 0 3.1-1.9 3.7-3.6 3.9.3.3.6.8.6 1.5v2.3c0 .2.1.5.5.4 3.2-1.1 5.5-4.1 5.5-7.6 0-4.4-3.6-8-8-8Z" />
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              <div className="divider">or with email</div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push('/create-brain');
                }}
              >
                <div className="field-inline">
                  <div className="field">
                    <label>First name</label>
                    <input type="text" placeholder="Sam" required autoComplete="given-name" />
                  </div>
                  <div className="field">
                    <label>Last name</label>
                    <input type="text" placeholder="Aoki" required autoComplete="family-name" />
                  </div>
                </div>
                <div className="field">
                  <label>
                    Work email
                    <span className="hint">we&apos;ll verify your domain</span>
                  </label>
                  <input type="email" placeholder="you@acme.com" required autoComplete="email" />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder="At least 12 characters"
                    required
                    autoComplete="new-password"
                    minLength={12}
                  />
                </div>

                <div className="terms-row">
                  <span
                    className="cb"
                    data-on={agreed ? '1' : '0'}
                    onClick={() => setAgreed((v) => !v)}
                  />
                  <span>
                    I agree to the <a href="#">Terms</a> and <a href="#">Privacy</a>.
                    Send me product updates (≤ 1 / month).
                  </span>
                </div>

                <button type="submit" className="submit-btn">
                  Create account · build the brain <span className="arr">→</span>
                </button>
              </form>

              <div className="form-foot">
                Setting up takes about 90 seconds — and yes, an agent will help.
              </div>
            </div>
          </div>

          <div className="form-bottom">
            <span>© 2026 Throughline, Inc.</span>
            <div className="right">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Status</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
