import React, { useEffect, useState, useRef } from 'react';

interface TabParticleTransitionProps {
  tabKey: string;
  children: React.ReactNode;
}

// 16 Outer orbital particles in circular geometry (clockwise orbit)
const OUTER_ORBITAL_PARTICLES = Array.from({ length: 16 }, (_, idx) => {
  const angle = (idx / 16) * 360;
  const isCyan = idx % 2 === 0;
  const size = idx % 4 === 0 ? 3.5 : 2.5;
  return { id: `outer-${idx}`, angle, isCyan, size };
});

// 8 Inner orbital particles in circular geometry (counter-clockwise orbit)
const INNER_ORBITAL_PARTICLES = Array.from({ length: 8 }, (_, idx) => {
  const angle = (idx / 8) * 360;
  const isCyan = idx % 2 !== 0;
  const size = 2.2;
  return { id: `inner-${idx}`, angle, isCyan, size };
});

const TAB_DESCRIPTIONS: Record<string, string> = {
  'dashboard': 'WORKSPACE OVERVIEW',
  'new-post': 'COMPLIANCE & POST STUDIO',
  'enhancer': 'AI ENHANCER STUDIO',
  'pending': 'PENDING APPROVALS QUEUE',
  'history': 'PUBLISHING AUDIT LOG',
  'messages': 'TEAM MESSAGING DIRECTORY',
  'data-security': 'DATA SECURITY VAULT',
  'help': 'BRANDLENS AI ASSISTANT',
  'about': 'PLATFORM & GUIDELINES',
  'company': 'COMPANY PROFILE',
  'guidelines': 'ENTERPRISE GOVERNANCE',
  'connected-accounts': 'SOCIAL CHANNELS',
  'ceo-account': 'EXECUTIVE SECURITY'
};

/**
 * TabParticleTransition
 * On tab switch, presents a refined circular optical particle animation
 * synchronized with the background canvas vortex, smoothly revealing the tab content.
 */
export const TabParticleTransition: React.FC<TabParticleTransitionProps> = ({
  tabKey,
  children
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedTab, setDisplayedTab] = useState(tabKey);
  const prevTabRef = useRef(tabKey);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    // Immediate display on initial application mount
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevTabRef.current = tabKey;
      return;
    }

    // Only trigger circular motion animation when tab changes
    if (prevTabRef.current !== tabKey) {
      prevTabRef.current = tabKey;

      const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reducedMotion) {
        setDisplayedTab(tabKey);
        return;
      }

      // Trigger background canvas particles into orbital circular vortex
      if (window.__brandlensFx?.tabSwitch) {
        window.__brandlensFx.tabSwitch();
      } else if ((window as any).__fx?.tabSwitch) {
        (window as any).__fx.tabSwitch();
      }

      // Enter professional 580ms optical particle transition
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setDisplayedTab(tabKey);
        setIsTransitioning(false);
      }, 580);

      return () => clearTimeout(timer);
    }
  }, [tabKey]);

  const tabLabel = TAB_DESCRIPTIONS[tabKey] || 'WORKSPACE VIEW';

  return (
    <div className="relative w-full min-h-[460px]">
      {isTransitioning ? (
        <div
          className="brandlens-center-vortex-stage flex flex-col items-center justify-center min-h-[460px] h-[52vh] w-full select-none"
          aria-live="polite"
          aria-label={`Calibrating ${tabLabel}`}
        >
          {/* Circular Particle Optical Alignment Stage */}
          <div className="brandlens-tab-vortex-container relative flex items-center justify-center">
            {/* Subtle optical background gradient (restrained, non-messy) */}
            <div className="brandlens-tab-vortex-glow" />

            {/* Concentric Precision Hairline Orbit Rings */}
            <div className="brandlens-tab-ring-outer" />
            <div className="brandlens-tab-ring-dashed" />
            <div className="brandlens-tab-ring-inner" />

            {/* Central Optical Mark (BrandLens Focal Reticle) */}
            <div className="brandlens-tab-center-optic">
              <span className="brandlens-tab-center-orb" />
              <span className="brandlens-tab-center-ping" />
            </div>

            {/* Outer Circular Particle Orbit Track (Clockwise) */}
            <div className="brandlens-tab-particles-orbit-wheel outer-wheel">
              {OUTER_ORBITAL_PARTICLES.map((p) => (
                <div
                  key={p.id}
                  className="brandlens-tab-particle-spoke"
                  style={{
                    transform: `rotate(${p.angle}deg)`
                  }}
                >
                  <span
                    className={`brandlens-tab-orbit-dot ${
                      p.isCyan ? 'is-cyan' : 'is-violet'
                    }`}
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Inner Circular Particle Orbit Track (Counter-Clockwise) */}
            <div className="brandlens-tab-particles-orbit-wheel inner-wheel">
              {INNER_ORBITAL_PARTICLES.map((p) => (
                <div
                  key={p.id}
                  className="brandlens-tab-particle-spoke inner-spoke"
                  style={{
                    transform: `rotate(${p.angle}deg)`
                  }}
                >
                  <span
                    className={`brandlens-tab-orbit-dot ${
                      p.isCyan ? 'is-cyan' : 'is-violet'
                    }`}
                    style={{
                      width: `${p.size}px`,
                      height: `${p.size}px`
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Clean Executive Optical Alignment Caption */}
          <div className="mt-7 text-center space-y-1.5 brandlens-vortex-caption">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-violet-500/20 bg-violet-500/5 text-[10px] font-mono tracking-[0.2em] text-violet-300 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              OPTICAL ALIGNMENT
            </div>
            <div className="text-xs sm:text-[13px] font-mono tracking-[0.22em] text-zinc-200 uppercase font-semibold">
              {tabLabel}
            </div>
            <div className="text-[10px] font-mono tracking-[0.28em] text-zinc-500 uppercase">
              PRECISION IN EVERY IMPRESSION
            </div>
          </div>
        </div>
      ) : (
        /* Smooth, crisp content reveal */
        <div key={displayedTab} className="brandlens-tab-content-smooth-enter w-full">
          {children}
        </div>
      )}
    </div>
  );
};
