import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CeoGuideStep {
  /** CSS selector of the element to spotlight */
  targetSelector: string;
  /** Tooltip body text — supports <strong> HTML */
  description: string;
  /** Small icon shown in the card (emoji / symbol) */
  icon?: string;
  /**
   * Delay (ms) before this step appears:
   *  - Step 0: delay after component mounts (give workspace time to render)
   *  - Step N (N>0): delay after user clicks OK on step N-1
   */
  delay?: number;
  /** Optional metadata — ignored by the engine */
  tab?: string;
}

interface Rect { cx: number; cy: number; r: number }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function measure(selector: string, padding: number): Rect | null {
  try {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return null;
    return {
      cx: b.left + b.width  / 2,
      cy: b.top  + b.height / 2,
      r:  Math.ceil(Math.max(b.width, b.height) / 2) + padding,
    };
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// CeoTabGuide — Sequential auto-advancing spotlight tour
//
// Behaviour:
//   • Mount → wait step[0].delay → show step 0
//   • OK click → fade out → wait step[1].delay → show step 1
//   • ... sequentially through all steps regardless of which content tab is active
//   • Last OK → mark session complete, never show again this session
//   • Escape / Skip → dismiss entire tour immediately
//   • Tab navigation by the user has NO effect on this sequence
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Still accepted so call-site doesn't need changing; not used in logic. */
  activeTab?: string;
  steps: CeoGuideStep[];
  storageKey?: string;
  onComplete?: () => void;
  padding?: number;
  active?: boolean;
}

const FADE_MS  = 340;  // fade-out duration before advancing
const BETWEEN_DELAY = 900; // extra pause between steps if step.delay is 0

export const CeoTabGuide: React.FC<Props> = ({
  steps,
  storageKey = 'brandlens_ceo_guide_v1',
  onComplete,
  padding = 22,
  active = true,
}) => {

  // ── Dismissed for this session ─────────────────────────────────────────────
  const [dismissed, setDismissed] = useState(
    () => Boolean(sessionStorage.getItem(storageKey))
  );

  // ── Which step index is scheduled / showing ────────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);

  // ── Visibility of the overlay ──────────────────────────────────────────────
  const [show, setShow] = useState(false);

  // ── Live DOM rect of the spotlight target ─────────────────────────────────
  const [rect, setRect] = useState<Rect | null>(null);

  // ── Whether the overlay is mounted (rect resolved) ─────────────────────────
  const [mounted, setMounted] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef   = useRef<number>(0);
  const showRef  = useRef(false); // mirrors `show` for use inside closures

  showRef.current = show;

  // ─── Cancel helpers ────────────────────────────────────────────────────────

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  };

  // ─── Show a specific step after `delay` ms ─────────────────────────────────

  const scheduleStep = (idx: number, delay: number) => {
    clearTimer();
    stopRaf();
    setShow(false);
    setMounted(false);

    timerRef.current = setTimeout(() => {
      const step = steps[idx];
      if (!step) return;

      const r = measure(step.targetSelector, padding);
      if (!r) {
        // Element not yet in DOM — retry after one more frame cycle
        timerRef.current = setTimeout(() => {
          const r2 = measure(step.targetSelector, padding);
          if (!r2) return; // give up silently
          setStepIndex(idx);
          setRect(r2);
          setMounted(true);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setShow(true))
          );
        }, 300);
        return;
      }

      setStepIndex(idx);
      setRect(r);
      setMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setShow(true))
      );
    }, delay);
  };

  // ─── Dismiss entire guide ─────────────────────────────────────────────────

  const dismiss = () => {
    clearTimer();
    stopRaf();
    setShow(false);
    timerRef.current = setTimeout(() => {
      setMounted(false);
      setRect(null);
      setDismissed(true);
      sessionStorage.setItem(storageKey, 'true');
      onComplete?.();
    }, FADE_MS);
  };

  // ─── OK button handler — advance to next step ─────────────────────────────

  const handleOk = () => {
    const nextIdx = stepIndex + 1;

    setShow(false); // start fade-out

    timerRef.current = setTimeout(() => {
      setMounted(false);
      setRect(null);

      if (nextIdx >= steps.length) {
        // All steps done
        setDismissed(true);
        sessionStorage.setItem(storageKey, 'true');
        onComplete?.();
        return;
      }

      const nextDelay = steps[nextIdx].delay ?? BETWEEN_DELAY;
      scheduleStep(nextIdx, Math.max(nextDelay, BETWEEN_DELAY));
    }, FADE_MS);
  };

  // ─── Boot sequence: schedule step 0 on mount ──────────────────────────────

  useEffect(() => {
    if (!active || dismissed || steps.length === 0) return;

    const firstDelay = steps[0].delay ?? 2000;
    scheduleStep(0, firstDelay);

    return () => {
      clearTimer();
      stopRaf();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dismissed]);

  // ─── Live re-measure while visible (keeps ring glued to element) ───────────

  useEffect(() => {
    if (!mounted || !show) { stopRaf(); return; }

    const step = steps[stepIndex];
    if (!step) return;

    const tick = () => {
      const r = measure(step.targetSelector, padding);
      if (r) setRect(r);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return stopRaf;
  }, [mounted, show, stepIndex, padding, steps]);

  // ─── Keyboard: Escape = dismiss ───────────────────────────────────────────

  useEffect(() => {
    if (!mounted) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ─── Render guard ─────────────────────────────────────────────────────────

  if (dismissed || !mounted || !rect) return null;

  const activeStep = steps[stepIndex];
  if (!activeStep) return null;

  // ─── Tooltip position (right of spotlight, vertically centred) ────────────

  const CARD_W   = 296;
  const RING_GAP = 26;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  let cardLeft = rect.cx + rect.r + RING_GAP;
  if (cardLeft + CARD_W > vpW - 12) {
    cardLeft = rect.cx - rect.r - RING_GAP - CARD_W;
  }
  cardLeft = Math.max(12, Math.min(cardLeft, vpW - CARD_W - 12));

  const cardTop = Math.max(12, Math.min(rect.cy - 72, vpH - 200));

  const arrowFromX = rect.cx + rect.r - 2;
  const arrowFromY = rect.cy;

  const EASE = 'cubic-bezier(0.16,1,0.3,1)';

  return createPortal(
    <div
      className="ceo-guide-root"
      role="dialog"
      aria-modal="true"
      aria-label="CEO workspace guide"
      style={{
        opacity: show ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ${EASE}`,
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      {/* ── SVG dark overlay with circular cut-out ─────────────────────── */}
      <svg className="ceo-guide-svg" aria-hidden="true">
        <defs>
          <mask id="ceo-guide-mask">
            <rect width="100%" height="100%" fill="white" />
            <circle cx={rect.cx} cy={rect.cy} r={rect.r} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(3,3,13,0.82)"
          mask="url(#ceo-guide-mask)"
        />
      </svg>

      {/* ── Glow ring ────────────────────────────────────────────────────── */}
      <div
        className="ceo-guide-ring"
        aria-hidden="true"
        style={{
          width:  rect.r * 2,
          height: rect.r * 2,
          left:   rect.cx - rect.r,
          top:    rect.cy - rect.r,
        }}
      >
        <span className="ceo-guide-halo" />
        <span className="ceo-guide-dashed" />
        <span className="ceo-guide-solid" />
        <span className="ceo-gtick ceo-gtick-tl" />
        <span className="ceo-gtick ceo-gtick-tr" />
        <span className="ceo-gtick ceo-gtick-bl" />
        <span className="ceo-gtick ceo-gtick-br" />
      </div>

      {/* ── Curved SVG arrow from ring to card ───────────────────────────── */}
      <svg
        className="ceo-guide-arrow-svg"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: arrowFromX,
          top:  arrowFromY - 20,
          width: RING_GAP + 20,
          height: 48,
          overflow: 'visible',
          opacity: show ? 1 : 0,
          transition: `opacity 0.3s ${EASE}`,
          pointerEvents: 'none',
        }}
      >
        <path
          d={`M 4 20 C 16 20 ${RING_GAP} 14 ${RING_GAP + 14} 14`}
          stroke="rgba(156,236,255,0.60)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <polygon
          points={`${RING_GAP + 14},10 ${RING_GAP + 20},14 ${RING_GAP + 14},18`}
          fill="rgba(156,236,255,0.60)"
        />
      </svg>

      {/* ── Step indicator dots ───────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: cardLeft,
          top: cardTop - 20,
          display: 'flex',
          gap: 5,
          alignItems: 'center',
        }}
      >
        {steps.map((_, i) => (
          <span
            key={i}
            style={{
              width:  i === stepIndex ? 16 : 5,
              height: 5,
              borderRadius: 999,
              background: i === stepIndex
                ? 'rgba(166,139,255,0.9)'
                : i < stepIndex
                  ? 'rgba(166,139,255,0.35)'
                  : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s ease',
              display: 'inline-block',
            }}
          />
        ))}
      </div>

      {/* ── Tooltip card ─────────────────────────────────────────────────── */}
      <div
        className="ceo-guide-tooltip"
        style={{
          position: 'fixed',
          top:   cardTop,
          left:  cardLeft,
          width: CARD_W,
          opacity: show ? 1 : 0,
          transform: show ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
          transition: `opacity 0.36s ${EASE}, transform 0.36s ${EASE}`,
          pointerEvents: 'auto',
        }}
      >
        <span className="ceo-guide-sweep" aria-hidden="true" />

        {/* Icon badge */}
        <div className="ceo-guide-icon-row">
          <span className="ceo-guide-icon-badge">
            {activeStep.icon ?? '✦'}
          </span>
          {/* Step counter */}
          <span style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 10,
            color: 'rgba(166,139,255,0.7)',
            letterSpacing: '0.06em',
          }}>
            {stepIndex + 1} / {steps.length}
          </span>
        </div>

        {/* Description */}
        <p className="ceo-guide-tooltip-text">
          <span dangerouslySetInnerHTML={{ __html: activeStep.description }} />
        </p>

        {/* OK */}
        <button
          type="button"
          className="ceo-guide-ok-btn"
          onClick={handleOk}
        >
          {stepIndex === steps.length - 1 ? 'Got it ✓' : 'OK →'}
        </button>

        {/* Skip */}
        <button
          type="button"
          className="ceo-guide-skip"
          onClick={dismiss}
        >
          Skip guide
        </button>
      </div>
    </div>,
    document.body
  );
};
