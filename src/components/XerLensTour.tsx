import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

export type TourStep = {
  target?: string; // CSS selector via data-tour="..."
  title: string;
  body: string;
  tab?: 'dcma' | 'tia' | 'files' | 'wbs';
  beforeShow?: () => void | Promise<void>;
  placement?: 'top' | 'bottom' | 'auto';
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;

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
  const [tick, setTick] = useState(0);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
      // wait a frame for DOM to settle
      requestAnimationFrame(() => !cancelled && setTick(t => t + 1));
    })();
    return () => { cancelled = true; };
  }, [idx, open, step, onTabChange]);

  // Recompute target rect
  useLayoutEffect(() => {
    if (!open || !step) return;
    const compute = () => {
      if (!step.target) { setRect(null); return; }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) { setRect(null); return; }
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // measure after slight delay for scroll
      setTimeout(() => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }, 220);
    };
    compute();
    const onR = () => compute();
    window.addEventListener('resize', onR);
    window.addEventListener('scroll', onR, true);
    return () => {
      window.removeEventListener('resize', onR);
      window.removeEventListener('scroll', onR, true);
    };
  }, [idx, open, step, tick]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!open || !step) return null;

  const next = () => (idx >= steps.length - 1 ? onClose() : setIdx(i => i + 1));
  const prev = () => setIdx(i => Math.max(0, i - 1));

  // Tooltip position
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

  const spotlightStyle: React.CSSProperties | undefined = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : undefined;

  return createPortal(
    <div className="fixed inset-0 z-[100]" aria-modal role="dialog">
      {/* Dim layer with spotlight cutout via box-shadow trick */}
      {rect ? (
        <div
          className="fixed pointer-events-none rounded-md ring-2 ring-cyan-400/80 transition-all duration-200"
          style={{
            ...spotlightStyle,
            boxShadow: '0 0 0 9999px hsl(var(--background) / 0.78)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed bg-card border border-cyan-500/40 rounded-md shadow-2xl p-5 font-mono"
        style={tipStyle}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-cyan-400">
            <Sparkles className="h-3 w-3" />
            STEP {idx + 1} / {steps.length}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="text-base font-semibold text-foreground mb-1.5">{step.title}</div>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">{step.body}</p>
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="text-[11px] text-muted-foreground hover:text-foreground tracking-wider"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={idx === 0} onClick={prev}>
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button size="sm" onClick={next}>
              {idx === steps.length - 1 ? 'Finish' : (<>Next <ArrowRight className="h-3.5 w-3.5" /></>)}
            </Button>
          </div>
        </div>
        {/* progress dots */}
        <div className="flex gap-1 mt-3">
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
