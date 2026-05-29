import Link from 'next/link';
import HeroDemo from './_components/HeroDemo';
import EarlyAccessForm from './_components/EarlyAccessForm';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="landing-root">
      <nav className="nav">
        <div className="nav-inner">
          <Link className="brand" href="/">
            <span className="logo" />
            <span className="name">Throughline<span className="sm">Cloud</span></span>
          </Link>
          <div className="nav-links">
            <a href="#product">Product</a>
            <a href="#agents">Agents</a>
            <a href="#anywhere">Anywhere</a>
            <a href="#memory">Memory</a>
            <a href="#pricing">Pricing</a>
            <Link href="/install">Install</Link>
            <a href="#changelog">Changelog</a>
          </div>
          <div className="nav-right">
            <Link className="signin" href="/signin">Sign in</Link>
            <a className="cta" href="#cta">Get early access <span className="arr">→</span></a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow"><span className="dot" />NEVERZERO WORKSTATION · MAY 2026</div>
          <h1>
            Stop starting<br />
            over.<span className="second">Every time.</span>
          </h1>
          <p className="lede">
            Every AI conversation forgets. <b>Throughline remembers.</b> One living document where humans and five
            named agents share plans, memory, and decisions — and pick up exactly where any of you stopped.
            Laptop, phone, teammate, timezone.
          </p>
          <div className="hero-ctas">
            <a className="btn primary" href="#cta">Get early access <span className="arr">→</span></a>
            <Link className="btn ghost" href="/workstation">Open a working prototype ↗</Link>
          </div>
          <div className="hero-foot">
            <span className="check">⌗ No credit card</span>
            <span className="check">⌗ 14-day workspace trial</span>
            <span className="check">⌗ Self-host available</span>
          </div>

          <HeroDemo />
        </div>
      </section>

      <div className="providers">
        <div className="wrap">
          <span className="lbl">Powered by</span>
          <div className="prov-list">
            <div className="prov">GStack<span className="role">build</span></div>
            <div className="prov">GBrain<span className="role">plan</span></div>
            <div className="prov">ZeroEntropy<span className="role">retrieve</span></div>
            <div className="prov">The Hog<span className="role">judge</span></div>
            <div className="prov">Lightsprint<span className="role">deploy</span></div>
          </div>
        </div>
      </div>

      <section id="product">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">PRODUCT</div>
            <h2>Not a chatbot.<br /><span className="muted">An operating layer.</span></h2>
            <p className="desc">
              Throughline Workstation is one persistent project document. Agents read it, write it, and hand off
              through it — so context never lives in a chat window, and work doesn&apos;t die when a tab closes.
            </p>
          </div>

          <div className="pillars">
            <div className="pillar">
              <div className="num">01 / DOC</div>
              <h3>The doc is the source of truth.</h3>
              <p>
                Plans, decisions, memory, and code reviews all live in one structured document. Agents edit
                alongside you — citations, todos, decision logs, all version-tracked.
              </p>
            </div>
            <div className="pillar">
              <div className="num">02 / AGENTS</div>
              <h3>Five named collaborators.</h3>
              <p>
                Iris researches. Forge builds. Atlas plans. Loop reviews. Beam deploys. Each one has a
                provider, a scope, a budget, and a memory ceiling you control.
              </p>
            </div>
            <div className="pillar">
              <div className="num">03 / MEMORY</div>
              <h3>Context that compounds.</h3>
              <p>
                Long threads compress automatically. Pinned facts survive forever. ZeroEntropy retrieval
                surfaces the right snippet at the right time — across every project.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="agents" className="tone-soft">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">MEET THE TEAM</div>
            <h2>Five agents.<br /><span className="muted">All on payroll.</span></h2>
            <p className="desc">
              Generic AI assistants forget you between sessions. Throughline agents have names, providers, and
              persistent roles — so you delegate the way you would to teammates.
            </p>
          </div>

          <div className="agents-grid">
            {AGENT_CARDS.map((a) => (
              <div key={a.glyph} className="agent" style={{ ['--agent-color' as never]: a.color }}>
                <span className="av">{a.glyph}</span>
                <div className="name">{a.name}</div>
                <div className="role">{a.role}</div>
                <div className="does">{a.does}</div>
                <div className="skills">
                  {a.skills.map((s) => (
                    <span key={s} className="skill">/{s}</span>
                  ))}
                </div>
                <div className="by">By <b>{a.provider}</b> · {a.model}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="anywhere">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">CONTINUITY</div>
            <h2>One mind across<br /><span className="muted">every surface.</span></h2>
            <p className="desc">
              Open the doc on your laptop. Hand off to Iris on the way home. Approve her work from your
              phone before bed. The agents don&apos;t reset between devices — and neither does the plan.
            </p>
          </div>

          <div className="anywhere-stage">
            <div className="laptop">
              <div className="topbar">
                <span className="d" /><span className="d" /><span className="d" />
                <span className="url">neverzero.cloud/acme/atlas/q3-launch</span>
              </div>
              <div className="body">
                <div className="side">
                  <div className="h">Workspace</div>
                  <div className="r"><span className="dot" />README</div>
                  <div className="r active"><span className="dot" />Launch plan</div>
                  <div className="r"><span className="dot" />Research notes</div>
                  <div className="h" style={{ marginTop: 10 }}>Agents</div>
                  <div className="r live"><span className="dot" />Iris</div>
                  <div className="r live"><span className="dot" />Forge</div>
                  <div className="r"><span className="dot" />Atlas</div>
                </div>
                <div className="main">
                  <h4>Atlas — Q3 Launch</h4>
                  <div className="mt">Updated 14s ago · 2 agents working</div>
                  <div className="pill-row">
                    <span className="pill">7/12 done</span>
                    <span className="pill">18 decisions</span>
                    <span className="pill">Jul 14</span>
                  </div>
                  <div className="row" data-done="1"><span className="c" /><span>Lock pricing tiers</span></div>
                  <div className="row" data-done="1"><span className="c" /><span>Draft launch narrative</span></div>
                  <div className="row"><span className="c" /><span>Land onboarding flow — show one real agent in &lt;60s</span></div>
                  <div className="row"><span className="c" /><span>Wire OAuth + agent SSO</span></div>
                  <div className="agent-pill">
                    <span className="av">IR</span>
                    <div className="txt"><b>Iris</b> is reading 12 onboarding flows · 3 contradictions found</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="phone">
              <div className="screen">
                <div className="p-meta">ACME · ATLAS · LIVE</div>
                <div className="p-title">Q3 Launch</div>
                <div className="p-live">
                  <div className="row">
                    <span className="av">IR</span>
                    <span className="nm">Iris</span>
                    <span className="live"><span className="d" />live</span>
                  </div>
                  <div className="body">Cross-checking NPS comments. Hand off to Atlas next.</div>
                </div>
                <div className="p-todo" data-done="1"><span className="c" /><span>Lock pricing</span></div>
                <div className="p-todo" data-done="1"><span className="c" /><span>Draft narrative</span></div>
                <div className="p-todo"><span className="c" /><span>Onboarding flow</span></div>
                <div className="p-todo"><span className="c" /><span>Wire OAuth</span></div>
                <div className="p-todo"><span className="c" /><span>Benchmark vs. 3</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="memory" className="tone-soft">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">MEMORY</div>
            <h2>Context that<br /><span className="muted">compounds, not collapses.</span></h2>
            <p className="desc">
              Long threads collapse into recaps. Pinned facts outlive the project. Retrieval pulls the right
              detail across every workspace you&apos;ve ever touched.
            </p>
          </div>

          <div className="memory-cols">
            <div className="mem">
              <div className="num">/COMPRESS</div>
              <h4>Old turns, distilled.</h4>
              <p>
                When the agent&apos;s context fills up, Throughline collapses earlier back-and-forth into a
                structured recap. Original turns stay searchable.
              </p>
              <div className="compress-bar">
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>before</span>
                <div className="bar"><i style={{ width: '84%' }} /></div>
                <span className="v">84% · 142 turns</span>
              </div>
              <div className="compress-bar">
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>after</span>
                <div className="bar"><i style={{ width: '38%' }} /></div>
                <span className="v">38% · 16 turns</span>
              </div>
            </div>

            <div className="mem">
              <div className="num">/RECALL</div>
              <h4>Cross-project retrieval.</h4>
              <p>
                ZeroEntropy indexes every doc, decision, and pinned memory across your workspace. Ask once,
                get the answer with citations — no copy-paste.
              </p>
              <div className="demo">
                <div><span className="k">&gt; /recall</span> &quot;why workspace tier&quot;</div>
                <div className="out">Decision · May 12 · Sam</div>
                <div className="out">&quot;Workspace ships with shared memory + agent SSO. Validated by 8 of 12 partners.&quot;</div>
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>↗ atlas/decisions.md · score 0.91</div>
              </div>
            </div>

            <div className="mem">
              <div className="num">/REMEMBER</div>
              <h4>Pins that outlive projects.</h4>
              <p>
                Pin a fact, a constraint, a brand rule. Every agent reads it before doing anything. Update
                once, the whole team adopts it.
              </p>
              <div className="demo">
                <div><span className="k">PINNED · brand voice</span></div>
                <div className="out">Never use &quot;AI assistant&quot;. Always say &quot;agent&quot; or call it by name.</div>
                <div style={{ color: 'var(--muted)', marginTop: 4 }}>read by 5 agents · last enforced 12s ago</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">PRICING</div>
            <h2>Pay for the agents,<br /><span className="muted">not the seats.</span></h2>
            <p className="desc">
              Humans are free. Pricing scales with the agents you put on payroll and the memory you keep
              alive. Cancel anytime — your data exports as plain markdown.
            </p>
          </div>

          <div className="tiers">
            <div className="tier">
              <div className="ic">SOLO</div>
              <h3>Solo</h3>
              <div className="desc">For one human + a couple of agents on side projects.</div>
              <div className="price">$0<span className="per">/mo forever</span></div>
              <div className="price-sub">Up to 2 agents · 1 project</div>
              <ul>
                <li className="li">Iris + one other agent of choice</li>
                <li className="li">1 GB memory<span className="li-d">~30 long-running projects</span></li>
                <li className="li">Mobile + desktop apps</li>
                <li className="li">Markdown export</li>
                <li className="li">Community support</li>
              </ul>
              <a className="btn ghost" href="#cta" style={{ border: '1px solid var(--rule-strong)' }}>Start free <span className="arr">→</span></a>
            </div>

            <div className="tier feature">
              <div className="ic">TEAM · MOST POPULAR</div>
              <h3>Team</h3>
              <div className="desc">For small teams shipping with all five agents.</div>
              <div className="price">$48<span className="per">/agent/mo</span></div>
              <div className="price-sub">Annual · billed per active agent</div>
              <ul>
                <li className="li">All five agents (Iris · Forge · Atlas · Loop · Beam)</li>
                <li className="li">25 GB memory<span className="li-d">cross-project retrieval</span></li>
                <li className="li">Skill palette + custom skills</li>
                <li className="li">Decision log · audit trail</li>
                <li className="li">Slack · GitHub · Linear bridges</li>
              </ul>
              <a className="btn primary" href="#cta">Start 14-day trial <span className="arr">→</span></a>
            </div>

            <div className="tier">
              <div className="ic">WORKSPACE</div>
              <h3>Workspace</h3>
              <div className="desc">Shared memory + agent SSO across the whole org.</div>
              <div className="price">Custom<span className="per" /></div>
              <div className="price-sub">Annual contract · self-host optional</div>
              <ul>
                <li className="li">Everything in Team</li>
                <li className="li">Agent SSO + shared memory<span className="li-d">one identity across projects</span></li>
                <li className="li">Bring your own provider keys</li>
                <li className="li">SOC 2 · HIPAA · EU residency</li>
                <li className="li">Self-host on your own infra</li>
                <li className="li">Dedicated solutions engineer</li>
              </ul>
              <a className="btn ghost" href="#cta" style={{ border: '1px solid var(--rule-strong)' }}>Talk to us <span className="arr">→</span></a>
            </div>
          </div>
        </div>
      </section>

      <section id="cta" className="cta-final">
        <div className="wrap">
          <div className="eyebrow">EARLY ACCESS</div>
          <h2>The end of<br /><span className="muted">re-explaining yourself.</span></h2>
          <p>
            We&apos;re onboarding 200 teams to the public beta on June 6th. If you&apos;re shipping with AI
            agents and tired of context loss, we&apos;d like to talk.
          </p>
          <EarlyAccessForm />
          <div className="terms">By requesting access you agree to our terms. We&apos;ll only email you about the beta.</div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="brand-col">
            <Link className="brand" href="/">
              <span className="logo" />
              <span className="name">Throughline<span className="sm">Cloud</span></span>
            </Link>
            <p>
              The persistent layer for AI-native work. Made by a small team in Brooklyn and Lisbon. Powered
              by GStack, GBrain, ZeroEntropy, The Hog, and Lightsprint.
            </p>
          </div>
          <div className="col">
            <h5>PRODUCT</h5>
            <Link href="/workstation">Workstation</Link>
            <a href="#">Mobile</a>
            <a href="#">Skills marketplace</a>
            <a href="#">Self-host</a>
            <a href="#">Changelog</a>
          </div>
          <div className="col">
            <h5>AGENTS</h5>
            <a href="#">Iris</a>
            <a href="#">Forge</a>
            <a href="#">Atlas</a>
            <a href="#">Loop</a>
            <a href="#">Beam</a>
          </div>
          <div className="col">
            <h5>COMPANY</h5>
            <a href="#">About</a>
            <a href="#">Careers</a>
            <a href="#">Manifesto</a>
            <a href="#">Press kit</a>
            <a href="#">Contact</a>
          </div>
          <div className="col">
            <h5>LEGAL</h5>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Security</a>
            <a href="#">Data handling</a>
            <a href="#">DPA</a>
          </div>
        </div>
        <div className="meta">
          <span>© 2026 Throughline, Inc.</span>
          <span>v2.18.3 · all systems normal</span>
        </div>
      </footer>
    </div>
  );
}

const AGENT_CARDS = [
  {
    glyph: 'IR', name: 'Iris', role: 'research-agent', color: 'var(--a-iris)',
    does: 'Reads docs, gathers signal, cites everything. Surfaces contradictions in your spec before they ship.',
    skills: ['research', 'compete', 'cite'],
    provider: 'ZeroEntropy', model: 'ze-retriever-2',
  },
  {
    glyph: 'FG', name: 'Forge', role: 'build-agent', color: 'var(--a-forge)',
    does: "Scaffolds, refactors, opens PRs against your repo. Writes tests before you ask. Won't merge until Loop is happy.",
    skills: ['scaffold', 'refactor', 'test'],
    provider: 'GStack', model: 'gs-coder-7b',
  },
  {
    glyph: 'AT', name: 'Atlas', role: 'planning-agent', color: 'var(--a-atlas)',
    does: "Decomposes goals into dated work plans. Re-plans when reality shifts. Owns the todo list so the doc never lies about what's actually shipping.",
    skills: ['plan', 'decompose', 'estimate'],
    provider: 'GBrain', model: 'gb-planner-l',
  },
  {
    glyph: 'LP', name: 'Loop', role: 'review-agent', color: 'var(--a-loop)',
    does: 'Critiques drafts, fact-checks against pinned memory, red-teams launch plans. The cynic on the team. Always polite about it.',
    skills: ['review', 'factcheck', 'redteam'],
    provider: 'The Hog', model: 'hog-judge-3',
  },
  {
    glyph: 'BM', name: 'Beam', role: 'deploy-agent', color: 'var(--a-beam)',
    does: 'Ships to staging, runs canaries, rolls back when error budget burns. Writes release notes from the decision log automatically.',
    skills: ['deploy', 'rollback', 'monitor'],
    provider: 'Lightsprint', model: 'ls-runner-1',
  },
] as const;
