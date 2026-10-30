import React, { useState, useEffect, useRef } from 'react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenAbout?: () => void;
  onReplayIntro?: () => void;
  phraseIndex?: number;
  onCyclePhrase?: (e: React.MouseEvent) => void;
  onSetPhraseIndex?: (index: number) => void;
  heroPhrases?: string[];
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenAbout,
  onReplayIntro,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('');

  // Live review card simulation states (Alive scanning loop)
  const [reviewRows, setReviewRows] = useState<
    Array<{ label: string; status: 'pass' | 'check' | 'scan'; text: string; isPop?: boolean }>
  >([
    { label: 'Company relevance', status: 'pass', text: 'PASS' },
    { label: 'Role permissions', status: 'check', text: 'CHECK' },
    { label: 'Brand voice', status: 'pass', text: 'PASS' },
  ]);

  const visualStageRef = useRef<HTMLDivElement>(null);
  const lensArtRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const workflowStepsRef = useRef<HTMLDivElement>(null);

  // Sticky topbar scroll listener & active scrollspy (RAF-throttled)
  useEffect(() => {
    let ticking = false;

    const updateScrollMetrics = () => {
      setIsScrolled(window.scrollY > 8);

      // Section spy
      const sections = ['overview', 'workflow', 'about'];
      let current = '';
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.45) {
            current = id;
          }
        }
      }
      setActiveSection(current);

      // Workflow progress bar line calculation
      if (workflowStepsRef.current) {
        const wf = workflowStepsRef.current;
        const rect = wf.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (window.innerHeight * 0.6 - rect.top) / rect.height));
        wf.style.setProperty('--p', p.toFixed(3));

        const stepEls = wf.querySelectorAll('.step');
        let activeIdx = -1;
        stepEls.forEach((step, idx) => {
          const sRect = step.getBoundingClientRect();
          const passed = sRect.top < window.innerHeight * 0.6;
          step.classList.toggle('passed', passed);
          if (passed) activeIdx = idx;
        });
        stepEls.forEach((step, idx) => {
          step.classList.toggle('active', idx === activeIdx);
        });
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScrollMetrics);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    updateScrollMetrics();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // IntersectionObserver for scroll-reveal animations (.reveal.in-view)
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const elements = containerRef.current?.querySelectorAll('.reveal');
    if (!elements || elements.length === 0) return;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('in-view'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -35px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // 3D Pointer tilt interaction on visual stage lens
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stage = visualStageRef.current;
    const lens = lensArtRef.current;
    if (!stage || !lens || reducedMotion || !window.matchMedia('(pointer:fine)').matches) {
      return;
    }

    let tiltRaf: number | null = null;
    let pendingEvent: PointerEvent | null = null;
    let cachedRect: DOMRect | null = null;

    const updateRect = () => {
      if (stage) cachedRect = stage.getBoundingClientRect();
    };

    const handlePointerMove = (e: PointerEvent) => {
      pendingEvent = e;
      if (!cachedRect) updateRect();
      if (!tiltRaf) {
        tiltRaf = requestAnimationFrame(() => {
          if (pendingEvent && stage && lens) {
            const rect = cachedRect || stage.getBoundingClientRect();
            const x = (pendingEvent.clientX - rect.left) / rect.width - 0.5;
            const y = (pendingEvent.clientY - rect.top) / rect.height - 0.5;
            lens.style.transform = `rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
          }
          tiltRaf = null;
        });
      }
    };

    const handlePointerLeave = () => {
      if (tiltRaf) {
        cancelAnimationFrame(tiltRaf);
        tiltRaf = null;
      }
      cachedRect = null;
      lens.style.transform = 'rotateX(0deg) rotateY(0deg)';
    };

    stage.addEventListener('pointerenter', updateRect, { passive: true });
    stage.addEventListener('pointermove', handlePointerMove, { passive: true });
    stage.addEventListener('pointerleave', handlePointerLeave);
    window.addEventListener('resize', updateRect, { passive: true });

    return () => {
      if (tiltRaf) cancelAnimationFrame(tiltRaf);
      stage.removeEventListener('pointerenter', updateRect);
      stage.removeEventListener('pointermove', handlePointerMove);
      stage.removeEventListener('pointerleave', handlePointerLeave);
      window.removeEventListener('resize', updateRect);
    };
  }, []);

  // Live scan cycle simulation on review card (Alive feature)
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const targetResults: Array<{ status: 'pass' | 'check'; text: string }> = [
      { status: 'pass', text: 'PASS' },
      { status: 'check', text: 'CHECK' },
      { status: 'pass', text: 'PASS' },
    ];

    const timeouts: number[] = [];

    const runScanCycle = () => {
      if (typeof document !== 'undefined' && document.hidden) return;

      // 1. Set all to SCANNING
      setReviewRows((prev) =>
        prev.map((row) => ({
          ...row,
          status: 'scan',
          text: 'SCANNING',
          isPop: false,
        }))
      );

      // 2. Resolve sequentially
      targetResults.forEach((target, i) => {
        const tid = window.setTimeout(() => {
          setReviewRows((prev) => {
            const next = [...prev];
            if (next[i]) {
              next[i] = {
                ...next[i],
                status: target.status,
                text: target.text,
                isPop: true,
              };
            }
            return next;
          });
        }, 1200 + i * 850);
        timeouts.push(tid);
      });
    };

    const interval = setInterval(runScanCycle, 7200);
    return () => {
      clearInterval(interval);
      timeouts.forEach((tid) => clearTimeout(tid));
    };
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div ref={containerRef} className="w-full relative z-10 selection:bg-[rgba(179,155,255,0.35)] selection:text-white">

      {/* ========================================================
          STICKY TOPBAR (RESTORED REFERENCE WITH ACTIVE SCROLLSPY)
          ======================================================== */}
      <header className={`landing-topbar ${isScrolled ? 'scrolled' : ''}`} id="topbar">
        <a
          href="#home"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('home');
          }}
          aria-label="BrandLens home"
        >
          <span className="brandmark" aria-hidden="true" />
          <span>BrandLens</span>
        </a>

        {/* Navigation items with alive underline indicators */}
        <nav className={`landing-nav ${mobileMenuOpen ? 'open' : ''}`} id="nav" aria-label="Main navigation">
          <button
            type="button"
            className={activeSection === 'overview' ? 'active' : ''}
            onClick={() => scrollToSection('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={activeSection === 'workflow' ? 'active' : ''}
            onClick={() => scrollToSection('workflow')}
          >
            How it works
          </button>
          <button
            type="button"
            className={activeSection === 'about' ? 'active' : ''}
            onClick={() => scrollToSection('about')}
          >
            About
          </button>
          {onOpenAbout && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAbout();
              }}
              className="text-[#c8bbff] font-mono text-[11px]"
            >
              Full Governance ↗
            </button>
          )}
        </nav>

        {/* Header Actions */}
        <div className="nav-actions">
          <button
            type="button"
            className="nav-enter"
            onClick={onOpenLogin}
          >
            <span>ENTER BRANDLENS</span>
            <span aria-hidden="true">↗</span>
          </button>
          <button
            type="button"
            className="menu-button"
            id="menuButton"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? '×' : '☰'}
          </button>
        </div>
      </header>

      {/* ========================================================
          HERO SECTION (ALIVE VERSION WITH SPLIT WORDS & ORBITS)
          ======================================================== */}
      <main id="home">
        {/* BrandLens Arrival Strip at Start of Landing Page */}
        <div className="brandlens-coming-strip" aria-label="BrandLens intelligence system active">
          <div className="brandlens-coming-card">
            <div className="brandlens-coming-mark" aria-hidden="true" />
            <div className="brandlens-coming-title">
              Brand<span>Lens</span>
            </div>
            <div className="brandlens-coming-divider" aria-hidden="true" />
            <span className="brandlens-coming-tag">CLARITY IN EVERY IMPRESSION</span>
          </div>

          {onReplayIntro && (
            <button
              type="button"
              className="brandlens-replay-btn"
              onClick={onReplayIntro}
              title="Replay BrandLens opening cinematic intro animation"
            >
              <span>↺</span>
              <span>REPLAY INTRO</span>
            </button>
          )}
        </div>

        <section className="ref-hero">
          {/* Hero Copy (Left Column) */}
          <div className="ref-hero-copy">
            <div className="eyebrow">AI-POWERED BRAND INTELLIGENCE</div>
            <h1 className="split">
              <span className="w" style={{ '--i': 0 } as any}>Your</span>{' '}
              <span className="w" style={{ '--i': 1 } as any}>brand.</span>
              <span className="dim">
                <span className="w" style={{ '--i': 2 } as any}>Without</span>{' '}
                <span className="w" style={{ '--i': 3 } as any}>the</span>{' '}
                <span className="w" style={{ '--i': 4 } as any}>noise.</span>
              </span>
            </h1>
            <p className="ref-hero-desc">
              An intelligent space where every message stays true to your identity — aligned with your company, your audience, and your team's role.
            </p>
            <div className="ref-hero-actions">
              <button
                type="button"
                className="primary-cta"
                onClick={onOpenLogin}
              >
                <span>ENTER BRANDLENS</span>
                <span className="arrow" aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                className="text-cta"
                onClick={() => scrollToSection('overview')}
              >
                <span>Explore the platform</span>
                <span aria-hidden="true">↓</span>
              </button>
            </div>
            <div className="hero-note">
              <span className="note-dot" />
              <span>CONTEXT-AWARE. ROLE-AWARE. READY WHEN YOU ARE.</span>
            </div>
          </div>

          {/* Visual Stage (Right Column with 3D Lens, Orbits, Ripples & Scanning Cards) */}
          <div
            className="visual-stage"
            id="visualStage"
            ref={visualStageRef}
            aria-label="Illustrative BrandLens review preview"
          >
            {/* Animated Optical Lens Art with Dual Planetary Orbits & Ripples */}
            <div className="lens-art" id="lensArt" ref={lensArtRef}>
              <div className="orbit o1">
                <i />
              </div>
              <div className="orbit o2">
                <i />
              </div>
              <div className="ripple" />
              <div className="ripple r2" />
              <div className="lens-inner" />
              <div className="lens-center" />
              <div className="lens-spark" />
              <div className="lens-label">SIGNAL OVER NOISE</div>
              <div className="lens-index">BL / 01 — CONTEXT</div>
            </div>

            {/* Floating Review Card with Live Beam Scan & Status Pop */}
            <div className="float-card review">
              <div className="card-kicker">
                <span>CONTENT REVIEW</span>
                <span className="live-pill">PREVIEW</span>
              </div>
              <div className="review-title">A clearer view of every post.</div>
              {reviewRows.map((row, idx) => (
                <div key={idx} className="review-row">
                  <span>{row.label}</span>
                  <span
                    className={`mini-status ${row.status} ${row.isPop ? 'pop' : ''}`}
                  >
                    {row.text}
                  </span>
                </div>
              ))}
            </div>

            {/* Floating Role Card */}
            <div className="float-card role">
              <div className="card-kicker">
                <span>WORKSPACE CONTEXT</span>
                <span>02 / 03</span>
              </div>
              <div className="role-big">
                Right message.
                <br />
                Right responsibility.
              </div>
              <div className="role-copy">
                Review content with the context of your company and your assigned role.
              </div>
              <div className="role-line">
                <span />
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            SEAMLESS ALIVE MARQUEE STRIP
            ======================================================== */}
        <div className="marquee" aria-hidden="true">
          <div className="track">
            <span>
              COMPANY RELEVANCE<b>✦</b>ROLE-AWARE REVIEW<b>✦</b>PRACTICAL FIXES<b>✦</b>HUMAN APPROVAL<b>✦</b>BRAND CONSISTENCY<b>✦</b>SIGNAL OVER NOISE<b>✦</b>
            </span>
            <span>
              COMPANY RELEVANCE<b>✦</b>ROLE-AWARE REVIEW<b>✦</b>PRACTICAL FIXES<b>✦</b>HUMAN APPROVAL<b>✦</b>BRAND CONSISTENCY<b>✦</b>SIGNAL OVER NOISE<b>✦</b>
            </span>
          </div>
        </div>

        {/* Section Divider with Cyan Light Sweep */}
        <div className="section-divider" />

        {/* ========================================================
            SECTION 1: OVERVIEW / THE DIFFERENCE
            ======================================================== */}
        <section className="ref-section" id="overview">
          <div className="section-top reveal">
            <div>
              <div className="section-tag">01 / THE DIFFERENCE</div>
              <h2>
                More than a spellcheck.
                <br />
                <span className="accent">A sense of context.</span>
              </h2>
            </div>
            <p className="section-intro">
              Good content is not just well written. It should belong to your brand, fit your team's responsibility, and make sense for the place it will appear.
            </p>
          </div>

          <div className="feature-grid">
            {/* Feature 01 */}
            <article className="feature reveal">
              <div className="feature-num">01 — CONTEXT</div>
              <div className="feature-symbol">
                <svg viewBox="0 0 24 24">
                  <circle cx="10.5" cy="10.5" r="6.8" />
                  <path d="m16 16 4.2 4.2M7.7 10.5h5.6M10.5 7.7v5.6" />
                </svg>
              </div>
              <h3>Company relevance</h3>
              <p>
                Check whether a post belongs to your company's real services, audience, and approved topics — not just whether it sounds convincing.
              </p>
            </article>

            {/* Feature 02 */}
            <article className="feature reveal">
              <div className="feature-num">02 — AUTHORITY</div>
              <div className="feature-symbol">
                <svg viewBox="0 0 24 24">
                  <path d="M12 3 19 6v5.2c0 4.4-2.9 7.7-7 9.8-4.1-2.1-7-5.4-7-9.8V6z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <h3>Role-aware governance</h3>
              <p>
                Help each person communicate within their responsibilities, permissions, and the approvals their role requires.
              </p>
            </article>

            {/* Feature 03 */}
            <article className="feature reveal">
              <div className="feature-num">03 — CLARITY</div>
              <div className="feature-symbol">
                <svg viewBox="0 0 24 24">
                  <path d="M5 4.5h14v11H9l-4 4z" />
                  <path d="M8.5 8.5h7M8.5 11.5h4.5" />
                </svg>
              </div>
              <h3>Practical improvements</h3>
              <p>
                Spot meaningful issues, understand why they matter, and make focused corrections before content is ready to publish.
              </p>
            </article>
          </div>
        </section>

        {/* Section Divider with Cyan Light Sweep */}
        <div className="section-divider" />

        {/* ========================================================
            SECTION 2: WORKFLOW / FROM DRAFT TO READY
            ======================================================== */}
        <section className="ref-section" id="workflow">
          <div className="workflow">
            <div className="workflow-aside reveal">
              <div className="section-tag">02 / THE WORKFLOW</div>
              <h2>
                From first draft
                <br />
                to <span className="accent">ready.</span>
              </h2>
              <p>
                One calm, connected workflow. Create your content, understand the feedback, make the changes that matter, and prepare the final version.
              </p>
            </div>

            <div className="workflow-steps" ref={workflowStepsRef}>
              <article className="step reveal">
                <div className="step-num">01</div>
                <div>
                  <h3>Draft</h3>
                  <p>Write a post and choose where it belongs.</p>
                </div>
                <div className="step-arrow">↗</div>
              </article>

              <article className="step reveal">
                <div className="step-num">02</div>
                <div>
                  <h3>Check</h3>
                  <p>Review company relevance, role scope, and content quality.</p>
                </div>
                <div className="step-arrow">↗</div>
              </article>

              <article className="step reveal">
                <div className="step-num">03</div>
                <div>
                  <h3>Improve</h3>
                  <p>Apply a useful correction, review the media, and recheck changes.</p>
                </div>
                <div className="step-arrow">↗</div>
              </article>

              <article className="step reveal">
                <div className="step-num">04</div>
                <div>
                  <h3>Prepare</h3>
                  <p>Save a reviewed version that is ready for the next step.</p>
                </div>
                <div className="step-arrow">↗</div>
              </article>

              <article className="step reveal">
                <div className="step-num">05</div>
                <div>
                  <h3>Publish with permission</h3>
                  <p>Publish through an authorized connected account when the required integration is configured.</p>
                </div>
                <div className="step-arrow">↗</div>
              </article>
            </div>
          </div>
        </section>

        {/* Section Divider with Cyan Light Sweep */}
        <div className="section-divider" />

        {/* ========================================================
            SECTION 3: BUILT WITH CONTEXT (ABOUT PREVIEW)
            ======================================================== */}
        <section className="ref-section" id="about">
          <div className="section-top reveal">
            <div>
              <div className="section-tag">03 / BUILT WITH CONTEXT</div>
              <h2>
                One workspace.
                <br />
                <span className="accent">Your company's rules.</span>
              </h2>
            </div>
            <p className="section-intro">
              BrandLens provides the review workspace. Each organization brings its own identity, verified facts, guidelines, and role permissions.
            </p>
          </div>

          <div className="about-strip">
            <article className="about-card reveal">
              <div className="tiny">THE PRODUCT / 01</div>
              <h3>Meet BrandLens.</h3>
              <p>
                An AI-powered brand governance workspace designed to help teams create relevant, responsible, and consistent content. AI helps surface issues and suggestions; people remain responsible for review and approval.
              </p>
              <button
                type="button"
                className="detail-link"
                onClick={() => scrollToSection('workflow')}
              >
                <span>EXPLORE THE WORKFLOW</span>
                <span aria-hidden="true">↗</span>
              </button>
            </article>

            <article className="about-card reveal">
              <div className="tiny">CURRENT WORKSPACE / 02</div>
              <h3>Configured for Nova Unlimited.</h3>
              <p>
                For this workspace, BrandLens checks content against Nova Unlimited's server and hosting business context, available company facts, and the author's assigned role. The configuration can be adapted for another organization.
              </p>
              {onOpenAbout ? (
                <button
                  type="button"
                  className="detail-link"
                  onClick={onOpenAbout}
                >
                  <span>VIEW FULL GOVERNANCE & ROLES</span>
                  <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="detail-link"
                  onClick={() => scrollToSection('overview')}
                >
                  <span>HOW CONTEXT IS USED</span>
                  <span aria-hidden="true">↗</span>
                </button>
              )}
            </article>
          </div>
        </section>

        {/* ========================================================
            FINAL CALL TO ACTION WITH DUAL AURORA WAVES
            ======================================================== */}
        <section className="final-cta reveal">
          <div className="section-tag">A CLEARER WAY TO CREATE</div>
          <h2>
            Make every
            <br />
            post count.
          </h2>
          <p>
            Review with context. Improve with confidence. Keep every message aligned with your brand.
          </p>
          <button
            type="button"
            className="primary-cta"
            onClick={onOpenLogin}
          >
            <span>ENTER BRANDLENS</span>
            <span className="arrow" aria-hidden="true">↗</span>
          </button>
        </section>
      </main>

      {/* ========================================================
          UNDERSTATED FOOTER
          ======================================================== */}
      <footer className="landing-footer">
        <a
          href="#home"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('home');
          }}
        >
          <span className="brandmark" aria-hidden="true" />
          <span>BrandLens</span>
        </a>
        <span>BUILT FOR CLARITY. DESIGNED FOR TRUST.</span>
        <div className="footer-links">
          <button
            type="button"
            onClick={() => scrollToSection('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('workflow')}
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('about')}
          >
            About
          </button>
          <button
            type="button"
            onClick={onOpenLogin}
            className="text-[#c9beff]"
          >
            Enter ↗
          </button>
        </div>
      </footer>
    </div>
  );
};
