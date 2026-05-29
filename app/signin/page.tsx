'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import './signin.css';

type AgentColorStyle = CSSProperties & { ['--agent-color']?: string };

export default function SignInPage() {
  const router = useRouter();
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  return (
    <div className="signin-root">
      <div className="auth">
        <div className="preview">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">Throughline<span className="sm">Cloud</span></span>
          </Link>

          <div className="eyebrow">WHILE YOU WERE AWAY</div>
          <h1>
            Your team&apos;s brain<br />
            <span className="muted">kept thinking.</span>
          </h1>
          <p className="lede">
            Sign in to <b>Acme Robotics</b>. Two agents shipped work overnight, one decision was
            pinned to memory, and Atlas reshuffled the plan for Friday.
          </p>

          <div className="preview-card">
            <div className="card-hd">
              <span className="d" /><span className="d" /><span className="d" />
              <span className="tab"><span className="live" />Atlas — Q3 Launch</span>
            </div>
            <div className="body">
              <div className="doc-meta">Activity since you last signed in · 7h 22m ago</div>
              <h3>4 things happened</h3>

              <div className="pv-evt" style={{ ['--agent-color']: 'var(--a-iris)' } as AgentColorStyle}>
                <span className="av" data-agent="1">IR</span>
                <div className="body">
                  <div className="line">
                    <b>Iris</b> cited 4 sources for <code>onboarding flow</code>
                  </div>
                  <div className="when">02:14</div>
                </div>
              </div>
              <div className="pv-evt" style={{ ['--agent-color']: 'var(--a-forge)' } as AgentColorStyle}>
                <span className="av" data-agent="1">FG</span>
                <div className="body">
                  <div className="line">
                    <b>Forge</b> opened <code>PR #284</code> · 14 files · tests green
                  </div>
                  <div className="when">04:51</div>
                </div>
              </div>
              <div className="pv-evt">
                <span className="av" style={{ background: '#6a5a85', color: '#fff' }}>PS</span>
                <div className="body">
                  <div className="line">
                    <b>Priya</b> pinned <code>memory.pricing.tier-3</code>
                  </div>
                  <div className="when">06:08</div>
                </div>
              </div>
              <div className="pv-evt" style={{ ['--agent-color']: 'var(--a-atlas)' } as AgentColorStyle}>
                <span className="av" data-agent="1">AT</span>
                <div className="body">
                  <div className="line">
                    <b>Atlas</b> replanned <code>Q3 milestones</code> · 3 todos moved
                  </div>
                  <div className="when">07:02</div>
                </div>
              </div>
            </div>
          </div>

          <div className="foot">
            <span className="item"><b>200</b> teams in beta</span>
            <span className="item"><b>5</b> agents</span>
            <span className="item"><b>SOC&nbsp;2</b> Type II</span>
            <span className="item">v2.18.3</span>
          </div>
        </div>

        <div className="form-side">
          <div className="form-top">
            <span />
            <span className="alt">
              New here? <Link href="/signup">Create an account</Link>
            </span>
          </div>

          <div className="form-wrap">
            <div className="form-card">
              <div className="mark-mobile">
                <span className="logo" />
                <span className="name">Throughline</span>
              </div>

              <h2>Welcome back.</h2>
              <p className="sub">Sign in to pick up exactly where your agents left off.</p>

              <div className="providers three">
                <button className="provider-btn" type="button">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M15.5 8.2c0-.6 0-1.1-.1-1.7H8v3.2h4.2c-.2 1-.7 1.8-1.5 2.4v2h2.4c1.4-1.3 2.4-3.2 2.4-5.9Z" fill="#4285F4" />
                    <path d="M8 16c2 0 3.8-.7 5-1.8l-2.4-2c-.7.5-1.6.8-2.6.8-2 0-3.7-1.3-4.3-3.1H1.2v2c1.3 2.5 3.9 4.1 6.8 4.1Z" fill="#34A853" />
                    <path d="M3.7 9.9c-.2-.5-.2-1-.2-1.5s.1-1 .2-1.5v-2H1.2c-.5 1.1-.8 2.3-.8 3.5s.3 2.4.8 3.5l2.5-2Z" fill="#FBBC04" />
                    <path d="M8 3.4c1.1 0 2.1.4 2.9 1.1l2.1-2.1C11.8 1.2 10 .4 8 .4 5.1.4 2.5 2 1.2 4.5l2.5 2C4.3 4.6 6 3.4 8 3.4Z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button className="provider-btn" type="button">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0C3.6 0 0 3.6 0 8c0 3.5 2.3 6.5 5.5 7.6.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1.1-2.7-1.1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.2-.1-.2-.3-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3.7 0 1.4.1 2 .3 1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.2 0 3.1-1.9 3.7-3.6 3.9.3.3.6.8.6 1.5v2.3c0 .2.1.5.5.4 3.2-1.1 5.5-4.1 5.5-7.6 0-4.4-3.6-8-8-8Z" />
                  </svg>
                  GitHub
                </button>
                <button className="provider-btn" type="button">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v-2c0-2.2 1.8-4 4-4h2c2.2 0 4 1.8 4 4v2" />
                    <rect x="2" y="7" width="12" height="8" rx="2" />
                    <circle cx="8" cy="11" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                  SSO
                </button>
              </div>

              <div className="divider">or with email</div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push('/workstation');
                }}
              >
                <div className="field">
                  <label>Work email</label>
                  <input type="email" placeholder="you@acme.com" required autoComplete="email" />
                </div>
                <div className="field">
                  <label>
                    Password
                    <span className="hint">
                      <a href="#">Forgot?</a>
                    </span>
                  </label>
                  <input type="password" placeholder="••••••••••" required autoComplete="current-password" />
                </div>

                <div className="terms-row" style={{ marginTop: 8 }}>
                  <span
                    className="cb"
                    data-on={keepSignedIn ? '1' : '0'}
                    onClick={() => setKeepSignedIn((v) => !v)}
                  />
                  <span>Keep me signed in for 30 days on this device</span>
                </div>

                <button type="submit" className="submit-btn">
                  Sign in <span className="arr">→</span>
                </button>
              </form>

              <div className="form-foot">
                Signing in to{' '}
                <b style={{ color: 'var(--ink)', fontWeight: 500 }}>acme.neverzero.cloud</b> ·{' '}
                <a href="#">Switch workspace</a>
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
