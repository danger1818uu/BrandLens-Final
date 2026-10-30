import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

declare global {
  interface Window {
    __brandlensFx?: {
      gather: () => void;
      burst: () => void;
      drift: () => void;
      toAmbient: () => void;
      end?: () => void;
      tabSwitch?: () => void;
    };
    __fx?: any;
  }
}

interface AliveAtmosphereProps {
  isIntroActive?: boolean;
  activeTab?: string;
}

/**
 * BrandLens Professional Particle & Optical Atmosphere Engine:
 * - Subtle, refined constellation nodes (low opacity, zero messy glow artifacts)
 * - Coordinated circular motion orbital vortex on tab switch
 * - Precision hairline connection filaments with distance-faded alpha
 * - Zero-latency DOM optical cursor
 * - Sits at z-index 0 behind cards and UI for maximum clarity and executive polish
 */
export const AliveAtmosphere: React.FC<AliveAtmosphereProps> = ({
  isIntroActive = false,
  activeTab
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cursorContainerRef = useRef<HTMLDivElement | null>(null);
  const cursorDotRef = useRef<HTMLDivElement | null>(null);
  const cursorRingRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Keep mode in a ref so prop toggles never unmount canvas or reallocate arrays
  const modeRef = useRef<'gather' | 'drift' | 'tab-orbit'>(isIntroActive ? 'gather' : 'drift');
  const fxControllerRef = useRef<{
    gather: () => void;
    burst: () => void;
    drift: () => void;
    toAmbient: () => void;
    end?: () => void;
    tabSwitch: () => void;
  } | null>(null);

  const prevTabRef = useRef<string | undefined>(activeTab);

  useEffect(() => {
    modeRef.current = isIntroActive ? 'gather' : 'drift';
  }, [isIntroActive]);

  // Trigger circular motion vortex whenever active tab changes in React
  useEffect(() => {
    if (prevTabRef.current !== undefined && prevTabRef.current !== activeTab) {
      if (fxControllerRef.current?.tabSwitch) {
        fxControllerRef.current.tabSwitch();
      }
    }
    prevTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const finePointer =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(pointer:fine)').matches;

    const isLowEnd =
      typeof navigator !== 'undefined' &&
      ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        ((navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4));

    // ========================================================
    // 1. TOP VIEWPORT SCROLL PROGRESS BAR (RAF throttled)
    // ========================================================
    let scrollTicking = false;
    const handleScroll = () => {
      if (!scrollTicking) {
        requestAnimationFrame(() => {
          if (progressBarRef.current) {
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = scrollHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollHeight)) : 0;
            progressBarRef.current.style.transform = `scaleX(${progress})`;
          }
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    handleScroll();

    // ========================================================
    // 2. PROFESSIONAL CONSTELLATION & CIRCULAR MOTION ENGINE
    // ========================================================
    let animFrameId = 0;
    const canvas = canvasRef.current;

    // Listeners disposer list to guarantee zero listener leaks
    const cleanups: Array<() => void> = [];
    cleanups.push(() => window.removeEventListener('scroll', handleScroll));
    cleanups.push(() => window.removeEventListener('resize', handleScroll));

    if (canvas) {
      const ctx =
        canvas.getContext('2d', { alpha: true, desynchronized: true }) ||
        canvas.getContext('2d', { alpha: true });

      if (ctx) {
        let width = 0;
        let height = 0;
        let dpr = 1;
        let t = 0;

        interface Particle {
          x: number;
          y: number;
          vx: number;
          vy: number;
          r: number;
          c: string; // refined RGB color
          baseAlpha: number; // calm, professional opacity (0.28 - 0.48)
          tier: number; // concentric orbital ring tier (0, 1, 2)
          angle: number; // polar angle
          orbitSpeed: number; // angular speed for circular motion
          pulseOffset: number;
        }

        let particles: Particle[] = [];
        const mouse = { x: -9999, y: -9999 };
        let tabVortexStartTime = 0;
        const VORTEX_DURATION = 720; // 720ms of smooth circular motion
        let tabSwitchTimer: ReturnType<typeof setTimeout> | null = null;

        const resizeCanvas = () => {
          // On low-end laptops, cap DPR to 1 to reduce fill-rate by up to 75%
          dpr = Math.min(window.devicePixelRatio || 1, isLowEnd || reducedMotion ? 1 : 1.25);
          width = canvas.width = window.innerWidth * dpr;
          height = canvas.height = window.innerHeight * dpr;
          canvas.style.width = `${window.innerWidth}px`;
          canvas.style.height = `${window.innerHeight}px`;

          // Professional, uncluttered particle count (28 desktop, 16 low-end/mobile)
          if (particles.length === 0) {
            const count = isLowEnd || reducedMotion
              ? 18
              : Math.round(Math.min(30, Math.max(16, window.innerWidth / 48)));

            particles = Array.from({ length: count }, (_, i) => {
              // Refined corporate palette: soft slate-300, icy cyan, muted lavender
              const colorRoll = Math.random();
              const c =
                colorRoll < 0.45
                  ? '203, 213, 225' // slate-300
                  : colorRoll < 0.78
                  ? '147, 197, 253' // soft sky/cyan
                  : '196, 181, 253'; // lavender/violet

              const r = (Math.random() * 0.45 + 0.8) * dpr; // 0.8px - 1.25px crisp micro-nodes
              const tier = i % 3;

              return {
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * (reducedMotion ? 0.04 : 0.24) * dpr,
                vy: (Math.random() - 0.5) * (reducedMotion ? 0.04 : 0.24) * dpr,
                r,
                c,
                baseAlpha: Math.random() * 0.16 + 0.28,
                tier,
                angle: (i / count) * Math.PI * 2,
                orbitSpeed: 0.026 + Math.random() * 0.014,
                pulseOffset: Math.random() * Math.PI * 2
              };
            });
          }
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        cleanups.push(() => window.removeEventListener('resize', resizeCanvas));

        const onPointerMove = (e: PointerEvent) => {
          mouse.x = e.clientX * dpr;
          mouse.y = e.clientY * dpr;
        };
        window.addEventListener('pointermove', onPointerMove, { passive: true });
        cleanups.push(() => window.removeEventListener('pointermove', onPointerMove));

        const onPointerLeave = () => {
          mouse.x = -9999;
          mouse.y = -9999;
        };
        window.addEventListener('pointerleave', onPointerLeave);
        cleanups.push(() => window.removeEventListener('pointerleave', onPointerLeave));

        // Global controller for intro transitions and tab switches
        const fxController = {
          gather: () => {
            modeRef.current = 'gather';
          },
          burst: () => {
            modeRef.current = 'drift';
            if (reducedMotion) return;
            const cx = width / 2;
            const cy = height / 2;
            particles.forEach((p) => {
              const a = Math.atan2(p.y - cy, p.x - cx);
              const s = (2.2 + Math.random() * 2.2) * dpr;
              p.vx = Math.cos(a) * s;
              p.vy = Math.sin(a) * s;
            });
          },
          drift: () => {
            modeRef.current = 'drift';
          },
          toAmbient: () => {
            modeRef.current = 'drift';
          },
          end: () => {
            modeRef.current = 'drift';
          },
          tabSwitch: () => {
            if (reducedMotion) return;
            if (tabSwitchTimer) clearTimeout(tabSwitchTimer);

            // Activate circular motion orbital vortex
            modeRef.current = 'tab-orbit';
            tabVortexStartTime = performance.now();

            tabSwitchTimer = setTimeout(() => {
              modeRef.current = 'drift';
              // Damped tangential momentum into smooth ambient drift
              particles.forEach((p) => {
                p.vx *= 0.5;
                p.vy *= 0.5;
              });
            }, VORTEX_DURATION);
          }
        };

        window.__brandlensFx = fxController;
        window.__fx = fxController;
        fxControllerRef.current = fxController;

        // Frame Budgeting: Steady 60fps limit to eliminate CPU spikes on older machines (15fps on reduced motion)
        let lastFrameTime = performance.now();
        const FRAME_BUDGET = 1000 / 60; // 16.6ms frame budget

        // Main rendering loop (butter smooth, low-overhead, batched rendering)
        const render = (now: number) => {
          animFrameId = requestAnimationFrame(render);

          if (document.hidden) return; // Pause execution when tab is backgrounded
          const budget = reducedMotion ? (FRAME_BUDGET * 4) : FRAME_BUDGET;
          const elapsed = now - lastFrameTime;
          if (elapsed < budget - 1) return; // Maintain smooth steady frame pace
          lastFrameTime = now - (elapsed % budget);

          t += reducedMotion ? 0.001 : (modeRef.current === 'tab-orbit' ? 0.008 : 0.003);
          ctx.clearRect(0, 0, width, height);

          const cx = width / 2;
          const cy = height / 2;
          const isTabVortex = modeRef.current === 'tab-orbit';
          let vortexEase = 0;

          if (isTabVortex) {
            const progress = Math.min(1, Math.max(0, (now - tabVortexStartTime) / VORTEX_DURATION));
            // Mathematical sine envelope for seamless ease-in, peak swirl, and ease-out
            vortexEase = Math.sin(Math.PI * progress);
          }

          // 1. Concentric circular orbit guide rings during tab switch
          if (isTabVortex && vortexEase > 0.03 && !reducedMotion) {
            const baseR = Math.min(width, height) * 0.24;
            ctx.save();
            ctx.lineWidth = 0.5 * dpr;
            [0.65, 1.05, 1.45].forEach((mult, idx) => {
              const ringRadius = baseR * mult;
              ctx.beginPath();
              ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
              ctx.strokeStyle = idx === 1
                ? `rgba(147, 197, 253, ${0.11 * vortexEase})`
                : `rgba(196, 181, 253, ${0.07 * vortexEase})`;
              ctx.setLineDash([3 * dpr, 6 * dpr]);
              ctx.stroke();
            });
            ctx.restore();
          }

          // 2. Physics & Particle State Update
          const linkDist = (isTabVortex ? 95 : 75) * dpr;
          const linkDistSq = linkDist * linkDist;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (modeRef.current === 'gather' && !reducedMotion) {
              // Intro circular gather
              const a = p.angle + t * 1.2;
              const rx = Math.min(window.innerWidth * 0.34, 380) * dpr;
              const ry = Math.min(window.innerHeight * 0.24, 210) * dpr;
              p.vx += (cx + Math.cos(a) * rx - p.x) * 0.0028;
              p.vy += (cy + Math.sin(a) * ry - p.y) * 0.0028;
              p.vx *= 0.94;
              p.vy *= 0.94;
              p.x += p.vx;
              p.y += p.vy;
            } else if (isTabVortex && !reducedMotion) {
              // CIRCULAR MOTION ON TAB SWITCH:
              // Particles lock into concentric orbital circular tracks
              const dx = p.x - cx;
              const dy = p.y - cy;
              let currentR = Math.hypot(dx, dy);
              if (currentR < 20) currentR = 20;
              let currentAngle = Math.atan2(dy, dx);

              // Target concentric circular shell radius
              const baseR = Math.min(width, height) * 0.24;
              const targetR = baseR * (0.65 + p.tier * 0.4);

              // Converge radius towards the circular orbit path
              currentR += (targetR - currentR) * (0.06 + 0.05 * vortexEase);

              // Angular circular velocity (clockwise outer, counter-clockwise inner)
              const dir = p.tier % 2 === 0 ? 1 : -1;
              const omega = (0.028 + p.orbitSpeed * 0.02) * (0.6 + 1.2 * vortexEase) * dir;
              currentAngle += omega;

              // Update coordinates in circular motion
              p.x = cx + Math.cos(currentAngle) * currentR;
              p.y = cy + Math.sin(currentAngle) * currentR;

              // Preserved tangential momentum
              p.vx = -Math.sin(currentAngle) * (currentR * omega) * 0.25;
              p.vy = Math.cos(currentAngle) * (currentR * omega) * 0.25;
            } else {
              // Restrained, professional ambient drift
              if (!reducedMotion) {
                p.vx = p.vx * 0.992 + (Math.random() - 0.5) * 0.008 * dpr;
                p.vy = p.vy * 0.992 + (Math.random() - 0.5) * 0.008 * dpr;
                const speed = Math.hypot(p.vx, p.vy);
                const maxSpeed = 0.45 * dpr;
                if (speed > maxSpeed) {
                  p.vx = (p.vx / speed) * maxSpeed;
                  p.vy = (p.vy / speed) * maxSpeed;
                }
              }

              // Delicate cursor lens interaction
              if (mouse.x > -1000 && !reducedMotion) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < 10000 * dpr * dpr && distSq > 4) {
                  const dist = Math.sqrt(distSq);
                  p.vx += (dx / dist) * 0.16;
                  p.vy += (dy / dist) * 0.16;
                }
              }

              p.x += p.vx;
              p.y += p.vy;

              // Seamless boundary wrapping
              if (p.x < 0) p.x += width;
              else if (p.x > width) p.x -= width;
              if (p.y < 0) p.y += height;
              else if (p.y > height) p.y -= height;
            }
          }

          // 3. Hairline Constellation Filaments (Box pre-rejection + single batch stroke for zero GC overhead)
          ctx.beginPath();
          ctx.lineWidth = 0.5 * dpr;
          ctx.strokeStyle = isTabVortex ? 'rgba(166, 139, 255, 0.11)' : 'rgba(166, 139, 255, 0.045)';

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            for (let j = i + 1; j < particles.length; j++) {
              const q = particles[j];
              const dx = p.x - q.x;
              if (dx > linkDist || dx < -linkDist) continue;
              const dy = p.y - q.y;
              if (dy > linkDist || dy < -linkDist) continue;
              const distSq = dx * dx + dy * dy;
              if (distSq < linkDistSq) {
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
              }
            }
          }
          ctx.stroke();

          // 4. Razor-Sharp Micro Nodes (Batched passes for 10x canvas throughput on older GPUs)
          // Pass A: Outer soft halos (skipped on low-end hardware & reduced motion to halve draw calls)
          if (!isLowEnd && !reducedMotion) {
            ctx.beginPath();
            ctx.fillStyle = isTabVortex ? 'rgba(156, 236, 255, 0.09)' : 'rgba(166, 139, 255, 0.055)';
            for (let i = 0; i < particles.length; i++) {
              const p = particles[i];
              ctx.moveTo(p.x + p.r * 2.2, p.y);
              ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
            }
            ctx.fill();
          }

          // Pass B: Crisp inner cores
          ctx.beginPath();
          ctx.fillStyle = isTabVortex ? 'rgba(224, 242, 254, 0.85)' : 'rgba(203, 213, 225, 0.72)';
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            ctx.moveTo(p.x + p.r, p.y);
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          }
          ctx.fill();
        };

        animFrameId = requestAnimationFrame(render);

        // Safely pause loop when tab is hidden, resume when visible
        const handleVisibilityChange = () => {
          cancelAnimationFrame(animFrameId);
          if (!document.hidden) {
            lastFrameTime = performance.now();
            animFrameId = requestAnimationFrame(render);
          }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        cleanups.push(() => document.removeEventListener('visibilitychange', handleVisibilityChange));
      }
    }

    // ========================================================
    // 3. ZERO-LATENCY DIRECT DOM OPTICAL CURSOR (With Idle Sleep)
    // ========================================================
    let cursorRaf = 0;
    let targetX = -9999;
    let targetY = -9999;
    let currentRingX = -9999;
    let currentRingY = -9999;
    let ringActive = false;

    if (finePointer && !reducedMotion) {
      const containerEl = cursorContainerRef.current;
      const dotEl = cursorDotRef.current;
      const ringEl = cursorRingRef.current;

      const animateRing = () => {
        if (targetX !== -9999 && ringEl) {
          const dx = targetX - currentRingX;
          const dy = targetY - currentRingY;

          // Update both dot and ring within same rAF frame to prevent unthrottled DOM thrashing
          if (dotEl) {
            dotEl.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
          }

          // If moved, interpolate smoothly
          if (Math.abs(dx) > 0.15 || Math.abs(dy) > 0.15) {
            currentRingX += dx * 0.22;
            currentRingY += dy * 0.22;
            ringEl.style.transform = `translate3d(${currentRingX}px, ${currentRingY}px, 0) translate(-50%, -50%)`;
            cursorRaf = requestAnimationFrame(animateRing);
            return;
          } else {
            // Snapped to target: sleep the rAF to yield 100% idle CPU
            currentRingX = targetX;
            currentRingY = targetY;
            ringEl.style.transform = `translate3d(${currentRingX}px, ${currentRingY}px, 0) translate(-50%, -50%)`;
          }
        }
        ringActive = false;
      };

      const onPointerMoveCursor = (e: PointerEvent) => {
        targetX = e.clientX;
        targetY = e.clientY;

        if (currentRingX === -9999) {
          currentRingX = targetX;
          currentRingY = targetY;
        }

        // Wake up ring animation only when moving
        if (!ringActive) {
          ringActive = true;
          cursorRaf = requestAnimationFrame(animateRing);
        }
      };

      const onMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (!target || !ringEl || !dotEl) return;

        const isInteractive = Boolean(
          target.closest(
            'button, a, [role="button"], .cursor-pointer, .feature, .step, .ceo-kpi, .alive-spotlight, .primary-cta, .nav-enter, .brandlens-replay-btn, .intro-skip, .meta-skip'
          )
        );
        const isInput = Boolean(target.closest('input, textarea, [contenteditable="true"]'));

        ringEl.classList.toggle('hovering', isInteractive && !isInput);
        ringEl.classList.toggle('text-mode', isInput);
        dotEl.classList.toggle('hovering', isInteractive || isInput);
      };

      const onMouseDown = () => {
        if (ringEl) ringEl.classList.add('clicking');
      };

      const onMouseUp = () => {
        if (ringEl) ringEl.classList.remove('clicking');
      };

      const onDocLeave = () => {
        if (containerEl) containerEl.classList.add('hidden');
      };

      const onDocEnter = () => {
        if (containerEl) containerEl.classList.remove('hidden');
      };

      window.addEventListener('pointermove', onPointerMoveCursor, { passive: true });
      document.addEventListener('mouseover', onMouseOver, { passive: true });
      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      document.addEventListener('mouseleave', onDocLeave);
      document.addEventListener('mouseenter', onDocEnter);

      cleanups.push(() => {
        window.removeEventListener('pointermove', onPointerMoveCursor);
        document.removeEventListener('mouseover', onMouseOver);
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('mouseleave', onDocLeave);
        document.removeEventListener('mouseenter', onDocEnter);
      });
    }

    // Comprehensive Component Cleanup
    return () => {
      cancelAnimationFrame(animFrameId);
      cancelAnimationFrame(cursorRaf);
      cleanups.forEach((cleanup) => {
        try {
          cleanup();
        } catch {}
      });
    };
  }, []);

  return (
    <>
      {/* Scroll depth progress bar across the top of the viewport */}
      <div
        ref={progressBarRef}
        className="progress"
        id="progress"
        aria-hidden="true"
      />

      {/* Shared namespaced effects wrapper positioned at z-index 0 behind cards */}
      <div className="brandlens-effects-wrapper" aria-hidden="true">
        <canvas
          ref={canvasRef}
          className="brandlens-particles-canvas"
          aria-hidden="true"
        />
      </div>

      {/* Executive Optical Cursor mounted at document.body level above all portals & modals */}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={cursorContainerRef}
            className="custom-cursor-container"
            aria-hidden="true"
          >
            <div
              ref={cursorDotRef}
              className="custom-cursor-dot"
            />
            <div
              ref={cursorRingRef}
              className="custom-cursor-ring"
            />
          </div>,
          document.body
        )}
    </>
  );
};
