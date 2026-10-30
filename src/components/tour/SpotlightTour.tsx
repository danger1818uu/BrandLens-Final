import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from 'react';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SpotlightStep {
  /** CSS selector OR a ref key registered with SpotlightTour.register() */
  target: string;
  /** Short badge label shown above the title */
  badge?: string;
  /** Step title */
  title: string;
  /** Longer description */
  description: string;
  /** Arrow direction relative to the tooltip card */
  arrowSide?: 'top' | 'bottom' | 'left' | 'right';
  /** Tooltip placement relative to the spotlight circle */
  tooltipPlacement?: 'right' | 'left' | 'below' | 'above';
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightTourProps {
  steps: SpotlightStep[];
  /** Key under sessionStorage to remember dismiss */
  storageKey?: string;
  /** Called when the whole tour finishes or is skipped */
  onComplete?: () => void;
  /** Extra padding around the spotlight circle (px) */
  padding?: number;
  /** Whether the tour should start immediately */
  active?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context – lets you imperatively start/stop from anywhere
// ─────────────────────────────────────────────────────────────────────────────

interface TourContextValue {
  startTour: () => void;
  stopTour: () => void;
  isRunning: boolean;
  currentStep: number;
  totalSteps: number;
  goNext: () => void;
  goPrev: () => void;
}

const TourContext = createContext<TourContextValue>({
  startTour: () => {},
  stopTour: () => {},
  isRunning: false,
  currentStep: 0,
  totalSteps: 0,
  goNext: () => {},
  goPrev: () => {},
});

export const useSpotlightTour = () => useContext(TourContext);

// ─────────────────────────────────────────────────────────────────────────────
// Utility: measure a DOM element by selector
// ─────────────────────────────────────────────────────────────────────────────

function getElementRect(selector: string): SpotlightRect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Arrow SVG helper
// ─────────────────────────────────────────────────────────────────────────────

const TooltipArrow: React.FC<{ side: 'top' | 'bottom' | 'left' | 'right' }> = ({ side }) => {
  const base =
    'absolute w-3 h-3 bg-[#12132a] border-[#a68bff]/40';

  const pos: Record<string, string> = {
    top:    'top-[-7px] left-1/2 -translate-x-1/2 border-l border-t rotate-45',
    bottom: 'bottom-[-7px] left-1/2 -translate-x-1/2 border-r border-b rotate-45',
    left:   'left-[-7px] top-1/2 -translate-y-1/2 border-l border-b rotate-45',
    right:  'right-[-7px] top-1/2 -translate-y-1/2 border-r border-t rotate-45',
  };

  return <span className={`${base} ${pos[side]}`} aria-hidden="true" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Core SpotlightTour component
// ─────────────────────────────────────────────────────────────────────────────

export const SpotlightTour: React.FC<SpotlightTourProps> = ({
  steps,
  storageKey = 'brandlens_spotlight_done',
  onComplete,
  padding = 18,
  active = true,
}) => {
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false); // fade-in gate
  const rafRef = useRef<number>(0);
  const measureRef = useRef<() => void>(() => {});

  // ── measure target element & sync spotlight position ──────────────────────
  const measureTarget = useCallback(() => {
    const step = steps[stepIdx];
    if (!step) return;
    const r = getElementRect(step.target);
    setRect(r);
  }, [steps, stepIdx]);

  measureRef.current = measureTarget;

  // ── start / stop ──────────────────────────────────────────────────────────
  const startTour = useCallback(() => {
    setStepIdx(0);
    setVisible(false);
    setRunning(true);
    // brief delay so the initial rect is measured after render
    setTimeout(() => {
      measureRef.current();
      requestAnimationFrame(() => setVisible(true));
    }, 80);
  }, []);

  const stopTour = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      setRunning(false);
      setRect(null);
    }, 380);
    sessionStorage.setItem(storageKey, 'true');
    onComplete?.();
  }, [storageKey, onComplete]);

  // ── auto-start if active & not previously seen ─────────────────────────────
  useEffect(() => {
    if (!active || steps.length === 0) return;
    const seen = sessionStorage.getItem(storageKey);
    if (!seen) {
      // small delay: let the page fully render first
      const t = setTimeout(startTour, 600);
      return () => clearTimeout(t);
    }
  }, [active, steps.length, storageKey, startTour]);

  // ── re-measure whenever step changes ──────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    setVisible(false);
    const t = setTimeout(() => {
      measureRef.current();
      requestAnimationFrame(() => setVisible(true));
    }, 120);
    return () => clearTimeout(t);
  }, [stepIdx, running]);

  // ── live position tracking (handles resizes & scrolls) ───────────────────
  useEffect(() => {
    if (!running) return;

    const tick = () => {
      measureRef.current();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [running]);

  // ── keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stopTour();
      if (e.key === 'ArrowRight' || e.key === 'Enter') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [running, stepIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = useCallback(() => {
    if (stepIdx < steps.length - 1) {
      setStepIdx((s) => s + 1);
    } else {
      stopTour();
    }
  }, [stepIdx, steps.length, stopTour]);

  const goPrev = useCallback(() => {
    if (stepIdx > 0) setStepIdx((s) => s - 1);
  }, [stepIdx]);

  // ── context value ─────────────────────────────────────────────────────────
  const ctxValue: TourContextValue = {
    startTour,
    stopTour,
    isRunning: running,
    currentStep: stepIdx,
    totalSteps: steps.length,
    goNext,
    goPrev,
  };

  // ── derived spotlight geometry ────────────────────────────────────────────
  const spotlightRadius = rect
    ? Math.ceil(Math.max(rect.width, rect.height) / 2) + padding
    : 0;

  const cx = rect ? rect.left + rect.width / 2 : -9999;
  const cy = rect ? rect.top + rect.height / 2 : -9999;

  const step = steps[stepIdx];
  const arrowSide = step?.arrowSide ?? 'left';
  const tooltipPlacement = step?.tooltipPlacement ?? 'right';

  // tooltip absolute position (in viewport px)
  const TOOLTIP_W = 320;
  const TOOLTIP_GAP = 24;
  let tooltipStyle: React.CSSProperties = {};

  if (rect) {
    switch (tooltipPlacement) {
      case 'right':
        tooltipStyle = {
          top: Math.max(16, cy - 90),
          left: cx + spotlightRadius + TOOLTIP_GAP,
        };
        break;
      case 'left':
        tooltipStyle = {
          top: Math.max(16, cy - 90),
          left: cx - spotlightRadius - TOOLTIP_GAP - TOOLTIP_W,
        };
        break;
      case 'below':
        tooltipStyle = {
          top: cy + spotlightRadius + TOOLTIP_GAP,
          left: Math.max(16, cx - TOOLTIP_W / 2),
        };
        break;
      case 'above':
        tooltipStyle = {
          top: cy - spotlightRadius - TOOLTIP_GAP - 200,
          left: Math.max(16, cx - TOOLTIP_W / 2),
        };
        break;
    }

    // clamp to viewport
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    if (tooltipStyle.left !== undefined) {
      const l = tooltipStyle.left as number;
      tooltipStyle.left = Math.min(Math.max(16, l), vpW - TOOLTIP_W - 16);
    }
    if (tooltipStyle.top !== undefined) {
      const t = tooltipStyle.top as number;
      tooltipStyle.top = Math.min(Math.max(16, t), vpH - 240);
    }
  }

  return (
    <TourContext.Provider value={ctxValue}>
      {running && (
        <div
          aria-modal="true"
          role="dialog"
          aria-label={`Onboarding tour step ${stepIdx + 1} of ${steps.length}`}
          className="spotlight-tour-root"
          style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.36s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* ── SVG Dark Overlay with circular cutout ───────────────────── */}
          <svg
            className="spotlight-tour-svg"
            aria-hidden="true"
          >
            <defs>
              <mask id="spotlight-mask">
                {/* white = show overlay; black = punch through */}
                <rect width="100%" height="100%" fill="white" />
                <circle
                  cx={cx}
                  cy={cy}
                  r={spotlightRadius}
                  fill="black"
                  style={{
                    transition: 'cx 0.42s cubic-bezier(0.16,1,0.3,1), cy 0.42s cubic-bezier(0.16,1,0.3,1), r 0.42s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              </mask>
            </defs>

            {/* Dimmed overlay */}
            <rect
              width="100%"
              height="100%"
              fill="rgba(5,5,14,0.82)"
              mask="url(#spotlight-mask)"
              style={{ backdropFilter: 'blur(2px)' }}
            />
          </svg>

          {/* ── Spotlight ring & glow ────────────────────────────────────── */}
          <div
            className="spotlight-tour-ring"
            style={{
              width: spotlightRadius * 2,
              height: spotlightRadius * 2,
              left: cx - spotlightRadius,
              top: cy - spotlightRadius,
              opacity: visible ? 1 : 0,
              transition:
                'left 0.42s cubic-bezier(0.16,1,0.3,1), top 0.42s cubic-bezier(0.16,1,0.3,1), width 0.42s cubic-bezier(0.16,1,0.3,1), height 0.42s cubic-bezier(0.16,1,0.3,1), opacity 0.36s ease',
            }}
            aria-hidden="true"
          >
            {/* Outer glow halo */}
            <span className="spotlight-tour-halo" />
            {/* Animated dashed ring */}
            <span className="spotlight-tour-dashed-ring" />
            {/* Static primary ring */}
            <span className="spotlight-tour-primary-ring" />
            {/* Corner tick marks at 4 cardinal points */}
            <span className="spotlight-tick spotlight-tick-tl" />
            <span className="spotlight-tick spotlight-tick-tr" />
            <span className="spotlight-tick spotlight-tick-bl" />
            <span className="spotlight-tick spotlight-tick-br" />
          </div>

          {/* ── Tooltip card ─────────────────────────────────────────────── */}
          {rect && step && (
            <div
              className="spotlight-tour-tooltip"
              style={{
                ...tooltipStyle,
                width: TOOLTIP_W,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
                transition:
                  'opacity 0.38s cubic-bezier(0.16,1,0.3,1), transform 0.38s cubic-bezier(0.16,1,0.3,1), top 0.42s cubic-bezier(0.16,1,0.3,1), left 0.42s cubic-bezier(0.16,1,0.3,1)',
              }}
            >
              {/* Arrow pointer */}
              <TooltipArrow side={arrowSide} />

              {/* Header row */}
              <div className="spotlight-tooltip-header">
                {step.badge && (
                  <span className="spotlight-tooltip-badge">
                    {step.badge}
                  </span>
                )}
                <span className="spotlight-tooltip-counter">
                  {stepIdx + 1} / {steps.length}
                </span>
                <button
                  type="button"
                  onClick={stopTour}
                  className="spotlight-tooltip-close"
                  aria-label="Skip tour"
                >
                  <X size={13} />
                </button>
              </div>

              {/* Body */}
              <div className="spotlight-tooltip-body">
                <h3 className="spotlight-tooltip-title">{step.title}</h3>
                <p className="spotlight-tooltip-desc">{step.description}</p>
              </div>

              {/* Progress dots */}
              <div className="spotlight-tooltip-dots">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to step ${i + 1}`}
                    onClick={() => setStepIdx(i)}
                    className={`spotlight-dot ${i === stepIdx ? 'active' : i < stepIdx ? 'done' : ''}`}
                  />
                ))}
              </div>

              {/* Navigation footer */}
              <div className="spotlight-tooltip-nav">
                <button
                  type="button"
                  onClick={goPrev}
                  disabled={stepIdx === 0}
                  className="spotlight-btn-secondary"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  className="spotlight-btn-primary"
                >
                  {stepIdx < steps.length - 1 ? (
                    <>
                      Next
                      <ChevronRight size={14} />
                    </>
                  ) : (
                    'Got it ✦'
                  )}
                </button>
              </div>

              {/* Subtle inner light sweep */}
              <span className="spotlight-tooltip-sweep" aria-hidden="true" />
            </div>
          )}
        </div>
      )}
    </TourContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Re-launch trigger button (shown after tour is dismissed)
// ─────────────────────────────────────────────────────────────────────────────

interface TourTriggerButtonProps {
  onClick: () => void;
  label?: string;
}

export const TourTriggerButton: React.FC<TourTriggerButtonProps> = ({
  onClick,
  label = 'Take a Tour',
}) => (
  <button
    type="button"
    onClick={onClick}
    className="tour-trigger-btn"
    aria-label="Start onboarding spotlight tour"
  >
    <span className="tour-trigger-dot" />
    <span>{label}</span>
  </button>
);
