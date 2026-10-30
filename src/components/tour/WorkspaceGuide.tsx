import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 'auto'       → step appears automatically (after mount or after previous OK)
 * 'tab-switch' → step appears only after the user switches to ANY tab
 *               (guide doesn't care which tab, just that a tab change happened)
 */
export type StepTrigger = 'auto' | 'tab-switch';

export interface WorkspaceGuideStep {
  /** CSS selector of the sidebar element to spotlight */
  targetSelector: string;
  /** HTML string shown in tooltip */
  description: string;
  /** Emoji / symbol badge */
  icon?: string;
  /**
   * Delay before this step appears (ms).
   * 'auto' step 0     → delay after mount       (default 2400)
   * 'auto' step N     → delay after previous OK  (default 1200)
   * 'tab-switch' step → delay after tab change   (default 800)
   */
  delay?: number;
  /**
   * How this step is triggered.
   * Default: 'auto' for first two steps, 'tab-switch' for the rest.
   * Set explicitly in your steps array.
   */
  trigger?: StepTrigger;
}

interface Rect { cx: number; cy: number; r: number }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function measureEl(selector: string, padding: number): Rect | null {
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
// WorkspaceGuide
//
// Flow
// ────
//  Step 0  (trigger:'auto')       → fires automatically after `delay` ms on mount
//  Step 1  (trigger:'auto')       → fires automatically after step 0 OK + delay
//  Step 2+ (trigger:'tab-switch') → fires after user clicks OK AND then switches
//                                   to ANY tab (doesn't matter which)
//  Last step (trigger:'auto')     → fires automatically (logout button is always
//                                   in the sidebar, no tab switch needed)
//
//  The user's tab navigation has NO effect while a guide is visible.
//  Only after OK is clicked AND trigger is 'tab-switch' does the engine wait.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  /** Currently active tab — needed to detect tab switches for 'tab-switch' steps */
  activeTab: string;
  steps: WorkspaceGuideStep[];
  storageKey?: string;
  padding?: number;
  active?: boolean;
  onComplete?: () => void;
}

const FADE_MS = 320;
const EASE    = 'cubic-bezier(0.16,1,0.3,1)';

export const WorkspaceGuide: React.FC<Props> = ({
  activeTab,
  steps,
  storageKey = 'brandlens_workspace_guide',
  padding = 22,
  active = true,
  onComplete,
}) => {

  // ── Session dismiss ───────────────────────────────────────────────────────
  const [dismissed, setDismissed] = useState(
    () => Boolean(localStorage.getItem(storageKey))
  );

  // ── Current step being displayed ──────────────────────────────────────────
  const [stepIndex, setStepIndex] = useState(0);

  // ── Overlay visibility ────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);  // whether overlay is in the tree
  const [show,    setShow   ] = useState(false);  // fade-in flag

  // ── Live spotlight rect ───────────────────────────────────────────────────
  const [rect, setRect] = useState<Rect | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef                = useRef<number>(0);

  /**
   * When true, we are waiting for the user to switch to ANY tab before
   * showing the next guide step. Set to true after OK on a 'tab-switch' step.
   */
  const waitingForTabSwitchRef = useRef(false);
  /**
   * The step index to show when the next tab switch is detected.
   */
  const pendingStepIdxRef      = useRef(0);

  /**
   * The last activeTab value we saw — used to detect a tab change.
   * Initialised to the current activeTab so mount doesn't count as a switch.
   */
  const prevTabRef             = useRef(activeTab);

  // ─── Timer helpers ────────────────────────────────────────────────────────

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  }, []);

  // ─── Show a step at index `idx` after `delay` ms ──────────────────────────

  const scheduleStep = useCallback((idx: number, delay: number) => {
    clearTimer();
    stopRaf();
    setShow(false);
    setMounted(false);

    timerRef.current = setTimeout(() => {
      const step = steps[idx];
      if (!step) return;

      const tryMount = (attempt: number) => {
        const r = measureEl(step.targetSelector, padding);
        if (r) {
          setStepIndex(idx);
          setRect(r);
          setMounted(true);
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setShow(true))
          );
        } else if (attempt < 6) {
          timerRef.current = setTimeout(() => tryMount(attempt + 1), 300);
        }
      };
      tryMount(0);
    }, delay);
  }, [steps, padding, clearTimer, stopRaf]);

  // ─── Dismiss entire guide ─────────────────────────────────────────────────

  const dismiss = useCallback(() => {
    clearTimer();
    stopRaf();
    waitingForTabSwitchRef.current = false;
    setShow(false);
    timerRef.current = setTimeout(() => {
      setMounted(false);
      setRect(null);
      setDismissed(true);
      localStorage.setItem(storageKey, 'true');
      onComplete?.();
    }, FADE_MS);
  }, [clearTimer, stopRaf, storageKey, onComplete]);

  // ─── OK button handler ────────────────────────────────────────────────────

  const handleOk = useCallback(() => {
    clearTimer();
    stopRaf();

    const nextIdx  = stepIndex + 1;
    setShow(false);

    timerRef.current = setTimeout(() => {
      setMounted(false);
      setRect(null);

      if (nextIdx >= steps.length) {
        // All steps done
        setDismissed(true);
        localStorage.setItem(storageKey, 'true');
        onComplete?.();
        return;
      }

      const nextStep    = steps[nextIdx];
      const nextTrigger = nextStep.trigger ?? 'tab-switch';

      if (nextTrigger === 'auto') {
        // Fire automatically
        const delay = nextStep.delay ?? 1200;
        scheduleStep(nextIdx, delay);
      } else {
        // Wait for user to switch to ANY tab
        pendingStepIdxRef.current      = nextIdx;
        waitingForTabSwitchRef.current = true;
        // Update prevTab so we detect the NEXT switch from current tab
        prevTabRef.current = activeTab;
      }
    }, FADE_MS);
  }, [stepIndex, steps, storageKey, onComplete, clearTimer, stopRaf, scheduleStep, activeTab]);

  // ─── Boot: fire step 0 on mount ───────────────────────────────────────────

  useEffect(() => {
    if (!active || dismissed || steps.length === 0) return;
    const delay = steps[0].delay ?? 2400;
    scheduleStep(0, delay);
    return () => { clearTimer(); stopRaf(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, dismissed]);

  // ─── Tab-switch watcher ───────────────────────────────────────────────────
  // Runs whenever activeTab changes. If we're waiting for a tab switch, fires
  // the next pending step.

  useEffect(() => {
    // Ignore the very first render / same-tab "change"
    if (activeTab === prevTabRef.current) return;
    prevTabRef.current = activeTab;

    if (!waitingForTabSwitchRef.current) return;
    if (dismissed) return;

    // Tab switched while we were waiting — show the pending step
    waitingForTabSwitchRef.current = false;
    const idx   = pendingStepIdxRef.current;
    const step  = steps[idx];
    if (!step) return;

    const delay = step.delay ?? 800;
    scheduleStep(idx, delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // ─── Live re-measure while visible ───────────────────────────────────────

  useEffect(() => {
    if (!mounted || !show) { stopRaf(); return; }
    const sel = steps[stepIndex]?.targetSelector;
    if (!sel) return;
    const tick = () => {
      const r = measureEl(sel, padding);
      if (r) setRect(r);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stopRaf;
  }, [mounted, show, stepIndex, padding, stopRaf, steps]);

  // ─── Escape key dismisses ────────────────────────────────────────────────

  useEffect(() => {
    if (!mounted) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mounted, dismiss]);

  // ─── Render guard ─────────────────────────────────────────────────────────

  if (dismissed || !mounted || !rect) return null;

  const activeStep = steps[stepIndex];
  if (!activeStep) return null;

  // ─── Tooltip geometry (right of ring, flip left if near edge) ─────────────

  const CARD_W   = 296;
  const RING_GAP = 26;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  let cardLeft = rect.cx + rect.r + RING_GAP;
  if (cardLeft + CARD_W > vpW - 12)
    cardLeft = rect.cx - rect.r - RING_GAP - CARD_W;
  cardLeft = Math.max(12, Math.min(cardLeft, vpW - CARD_W - 12));

  const cardTop    = Math.max(12, Math.min(rect.cy - 72, vpH - 200));
  const arrowFromX = rect.cx + rect.r - 2;
  const arrowFromY = rect.cy;
  const isLast     = stepIndex === steps.length - 1;

  // Is the guide currently paused waiting for a tab switch?
  // (We're in 'wait-tab-switch' state but nothing is visible — just for the
  //  hint text inside the tooltip of the previous step, if needed.)

  return createPortal(
    <div
      className="ceo-guide-root"
      role="dialog"
      aria-modal="true"
      aria-label="Workspace guide"
      style={{
        opacity: show ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ${EASE}`,
        pointerEvents: show ? 'auto' : 'none',
      }}
    >
      {/* ── Dark overlay with circular spotlight cut-out ─────────────────── */}
      <svg className="ceo-guide-svg" aria-hidden="true">
        <defs>
          <mask id="ws-guide-mask">
            <rect width="100%" height="100%" fill="white" />
            <circle cx={rect.cx} cy={rect.cy} r={rect.r} fill="black" />
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(3,3,13,0.82)"
          mask="url(#ws-guide-mask)"
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

      {/* ── Curved arrow: ring → card ─────────────────────────────────────── */}
      <svg
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

      {/* ── Progress dots ─────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: cardLeft,
          top: cardTop - 22,
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
                ? 'rgba(166,139,255,0.95)'
                : i < stepIndex
                  ? 'rgba(166,139,255,0.35)'
                  : 'rgba(255,255,255,0.12)',
              transition: 'all 0.35s ease',
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

        {/* Icon + step counter */}
        <div className="ceo-guide-icon-row">
          <span className="ceo-guide-icon-badge">
            {activeStep.icon ?? '✦'}
          </span>
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

        {/* Hint for tab-switch steps */}
        {!isLast && (activeStep.trigger === 'tab-switch' || stepIndex >= 2) && (
          <p style={{
            fontFamily: 'DM Mono, monospace',
            fontSize: 10,
            color: 'rgba(156,236,255,0.55)',
            margin: '6px 0 0',
            lineHeight: 1.5,
          }}>
            ↪ Switch any tab to continue the tour
          </p>
        )}

        {/* OK / Got it */}
        <button
          type="button"
          className="ceo-guide-ok-btn"
          onClick={handleOk}
        >
          {isLast ? 'Got it ✓' : 'OK →'}
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
