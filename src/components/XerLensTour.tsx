import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export type TourStep = {
  target?: string; // primary CSS selector (gets the spotlight cutout)
  extraTargets?: string[]; // additional selectors to highlight with a pulse ring
  title: string;
  body: string;
  tab?: 'dcma' | 'progress' | 'tia' | 'wbs' | 'aace' | 'files';
  beforeShow?: () => void | Promise<void>;
  placement?: 'top' | 'bottom' | 'auto';
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

const measure = (sel: string): Rect | null => {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

export const XerLensTour = ({
  open,
  steps,
  onClose,
  onTabChange,
}: {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
  onTabChange?: (tab: NonNullable<TourStep['tab']>) => void;
}) => {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [extraRects, setExtraRects] = useState<Rect[]>([]);
  const [tabRect, setTabRect] = useState<Rect | null>(null);
  const [tick, setTick] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`xerlens-tour-title-${Math.random().toString(36).slice(2, 8)}`).current;
  const bodyId = useRef(`xerlens-tour-body-${Math.random().toString(36).slice(2, 8)}`).current;
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const step = steps[idx];

  useEffect(() => {
    if (!open) setIdx(0);
  }, [open]);

  // Run beforeShow + tab change when step changes
  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    (async () => {
      if (step.tab) onTabChange?.(step.tab);
      if (step.beforeShow) await step.beforeShow();
      requestAnimationFrame(() => !cancelled && setTick(t => t + 1));
    })();
    return () => { cancelled = true; };
  }, [idx, open, step, onTabChange]);

  // Recompute rects
  useLayoutEffect(() => {
    if (!open || !step) return;
    const compute = () => {
      // Primary target
      if (step.target) {
        const el = document.querySelector(step.target) as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        setRect(step.target ? measure(step.target) : null);
        setExtraRects((step.extraTargets || []).map(measure).filter((r): r is Rect => r !== null));
        setTabRect(step.tab ? measure(`[data-tour="tab-${step.tab}"]`) : null);
      }, 240);
    };
    compute();
    const onR = () => {
      setRect(step.target ? measure(step.target) : null);
      setExtraRects((step.extraTargets || []).map(measure).filter((r): r is Rect => r !== null));
      setTabRect(step.tab ? measure(`[data-tour="tab-${step.tab}"]`) : null);
    };
    window.addEventListener('resize', onR);
    window.addEventListener('scroll', onR, true);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('scroll', onR, true);
    };
  }, [idx, open, step, tick]);

  // Save/restore focus + move initial focus into the tooltip when opened
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Move focus to the tooltip after it mounts
    requestAnimationFrame(() => {
      tooltipRef.current?.focus();
    });
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  // Keyboard: Escape closes; arrows/Enter navigate (when focus is not in a text field);
  // Tab is trapped within the tooltip
  useEffect(() => {
    if (!open) return;
    const getFocusable = (): HTMLElement[] => {
      const root = tooltipRef.current;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => !el.hasAttribute('aria-hidden'));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusables = getFocusable();
        if (focusables.length === 0) {
          e.preventDefault();
          tooltipRef.current?.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const inside = tooltipRef.current?.contains(active ?? null);
        if (!inside) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }
      // Avoid hijacking arrows/Enter while user is typing in a field
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const isField = tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (isField) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open || !step) return null;

  const next = () => (idx >= steps.length - 1 ? onClose() : setIdx(i => i + 1));
  const prev = () => setIdx(i => Math.max(0, i - 1));

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  let tipStyle: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 16;
    const placeBelow = below + 220 < vh || rect.top < 240;
    const top = placeBelow ? rect.top + rect.height + 12 : Math.max(16, rect.top - 12 - 220);
    const left = Math.min(Math.max(16, rect.left), vw - 380 - 16);
    tipStyle = { top, left, width: 380 };
  } else {
    tipStyle = { top: vh / 2 - 110, left: vw / 2 - 190, width: 380 };
  }

  const padBox = (r: Rect, p = PAD): React.CSSProperties => ({
    top: r.top - p,
    left: r.left - p,
    width: r.width + p * 2,
    height: r.height + p * 2,
  });

  // Avoid double-highlighting: skip tabRect if it equals primary or extras
  const sameRect = (a: Rect | null, b: Rect | null) =>
    !!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
  const showTabRing = tabRect && !sameRect(tabRect, rect) && !extraRects.some(r => sameRect(r, tabRect));

  return createPortal(
    <div
      className="fixed inset-0 z-[100]"
      aria-modal="true"
      role="dialog"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      {/* Dim layer */}
      {rect ? (
        <>
          {/* Spotlight cutout */}
          <div
            aria-hidden="true"
            className="fixed pointer-events-none rounded-md ring-2 ring-cyan-400 transition-all duration-300"
            style={{
              ...padBox(rect),
              boxShadow: '0 0 0 9999px hsl(var(--background) / 0.82), 0 0 32px 4px hsl(190 95% 55% / 0.55)',
            }}
          />
          {/* Animated dashed outer ring for extra emphasis */}
          <div
            aria-hidden="true"
            className="fixed pointer-events-none rounded-md border-2 border-dashed border-cyan-300/70 animate-pulse transition-all duration-300"
            style={padBox(rect, PAD + 6)}
          />
        </>
      ) : (
        <div
          aria-hidden="true"
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Active tab highlight */}
      {showTabRing && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none rounded-md ring-2 ring-cyan-400 animate-pulse transition-all duration-300"
          style={{
            ...padBox(tabRect!, 4),
            boxShadow: '0 0 24px 2px hsl(190 95% 55% / 0.6)',
          }}
        />
      )}

      {/* Extra highlighted elements */}
      {extraRects.map((r, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="fixed pointer-events-none rounded-md ring-2 ring-cyan-300/80 animate-pulse transition-all duration-300"
          style={{
            ...padBox(r, 4),
            boxShadow: '0 0 18px 2px hsl(190 95% 55% / 0.45)',
          }}
        />
      ))}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        tabIndex={-1}
        className="fixed bg-card border border-cyan-500/40 rounded-md shadow-2xl p-5 font-mono outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        style={tipStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-cyan-400">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span aria-live="polite" aria-atomic="true">
              STEP {idx + 1} / {steps.length}
            </span>
            {step.tab && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
                MODULE {step.tab.toUpperCase()}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tour"
            className="text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <h2 id={titleId} className="text-base font-semibold text-foreground mb-1.5">{step.title}</h2>
        <p id={bodyId} className="text-xs text-muted-foreground leading-relaxed mb-4">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-muted-foreground hover:text-foreground tracking-wider rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={idx === 0} onClick={prev} aria-label="Previous step">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
            </Button>
            <Button size="sm" onClick={next} aria-label={idx === steps.length - 1 ? 'Finish tour' : 'Next step'}>
              {idx === steps.length - 1 ? 'Finish' : (<>Next <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></>)}
            </Button>
          </div>
        </div>
        <div className="flex gap-1 mt-3" aria-hidden="true">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= idx ? 'bg-cyan-400' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
};
