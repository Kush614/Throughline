'use client';

import { useEffect, useRef } from 'react';

const QUOTES = [
  'Drop-off occurs at step 3 in 7 of 12 reviewed apps — the consent screen.',
  'Users hesitate when asked to grant memory access without seeing what the agent will read.',
  'Three hypotheses ready. Handing off cleaned summary to Atlas for replanning.',
];

export default function HeroDemo() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const steps = root.querySelectorAll<HTMLElement>('.demo-agent .step');
    const quoteEl = root.querySelector<HTMLElement>('#typed-quote');
    if (!steps.length || !quoteEl) return;

    let current = 2;
    let qi = 0;
    let cancelled = false;

    function setRunning(idx: number) {
      steps.forEach((s, i) => {
        if (i < idx) s.dataset.state = 'done';
        else if (i === idx) s.dataset.state = 'running';
        else s.dataset.state = 'pending';
      });
      const meta0 = steps[0].querySelector<HTMLElement>('.meta');
      const meta1 = steps[1].querySelector<HTMLElement>('.meta');
      const meta2 = steps[2].querySelector<HTMLElement>('.meta');
      const meta3 = steps[3].querySelector<HTMLElement>('.meta');
      if (meta0) meta0.textContent = '0.4s';
      if (meta1) meta1.textContent = '2.1s';
      if (meta2) meta2.textContent = idx > 2 ? '3.4s' : 'now';
      if (meta3) meta3.textContent = idx >= 3 ? 'now' : '—';
    }

    async function typeQuote(text: string) {
      if (!quoteEl) return;
      quoteEl.textContent = '';
      for (let i = 0; i < text.length; i++) {
        if (cancelled) return;
        quoteEl.textContent += text[i];
        await new Promise((r) => setTimeout(r, 14 + Math.random() * 24));
      }
    }

    (async function loop() {
      while (!cancelled) {
        await typeQuote(QUOTES[qi]);
        await new Promise((r) => setTimeout(r, 2400));
        if (cancelled) return;
        qi = (qi + 1) % QUOTES.length;
        current = current === 2 ? 3 : 2;
        setRunning(current);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="hero-demo" aria-hidden="true" ref={rootRef}>
      <div className="card">
        <div className="card-hd">
          <div className="dots">
            <span /><span /><span />
          </div>
          <span className="tab"><span className="live" />Atlas — Q3 Launch</span>
          <span className="url">neverzero.cloud/acme/atlas</span>
        </div>
        <div className="demo-doc">
          <div className="meta">Updated 14s ago · 2 agents working · 4 humans here</div>
          <h3>Atlas — Q3 Launch</h3>
          <p className="sub">The shared layer for AI-native work. Beta Jun 6.</p>
          <div className="sec-h">03 · Iris is researching</div>
          <div className="demo-agent">
            <div className="top">
              <span className="av">IR</span>
              <span className="nm">Iris</span>
              <span className="role">research-agent · ZeroEntropy</span>
              <span className="live"><span className="d" />0:42</span>
            </div>
            <div className="body">
              <div className="step" data-step="0" data-state="done">
                <span className="m" />
                <span>Pulled 12 workspace onboarding flows</span>
                <span className="meta">0.4s</span>
              </div>
              <div className="step" data-step="1" data-state="done">
                <span className="m" />
                <span>Ranked drop-off by severity</span>
                <span className="meta">2.1s</span>
              </div>
              <div className="step" data-step="2" data-state="running">
                <span className="m" />
                <span>Cross-checking against internal NPS</span>
                <span className="meta">now</span>
              </div>
              <div className="step" data-step="3" data-state="pending">
                <span className="m" />
                <span>Draft 3 hypotheses for step-3 friction</span>
                <span className="meta">—</span>
              </div>
              <div className="quote">
                <span className="typed" id="typed-quote">
                  Drop-off occurs at step 3 in 7 of 12 reviewed apps — the consent screen.
                </span>
                <span className="src">— Iris, synthesizing 12 sources</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
