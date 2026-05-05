import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles, Play, Pause, MousePointer2 } from 'lucide-react';

export type TourDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';

export type TourCursorHandle = {
  flyTo: (selector: string, opts?: { offsetX?: number; offsetY?: number }) => Promise<void>;
  click: (selector: string, opts?: { offsetX?: number; offsetY?: number }) => Promise<void>;
  hide: () => void;
};

export type TourStep = {
  target?: string;
  extraTargets?: string[];
  title: string;
  body: string;
  tab?: 'dcma' | 'progress' | 'tia' | 'wbs' | 'aace' | 'files';
  day?: TourDay;
  beforeShow?: (cursor: TourCursorHandle) => void | Promise<void>;
  placement?: 'top' | 'bottom' | 'auto';
  dwellMs?: number;
  tightSelector?: string; // when set, the spotlight ring uses this selector instead of `target`
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

/* ──────────────────────────────────────────────────────────────────── */
/* Animated cursor sprite                                              */
/* ──────────────────────────────────────────────────────────────────── */
const TourCursor = forwardRef<TourCursorHandle>((_, ref) => {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [clicking, setClicking] = useState(false);
  const [visible, setVisible] = useState(false);

  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  useImperativeHandle(ref, () => ({
    flyTo: async (selector, opts) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(280);
      const r = el.getBoundingClientRect();
      const x = r.left + (opts?.offsetX ?? r.width / 2);
      const y = r.top + (opts?.offsetY ?? r.height / 2);
      setVisible(true);
      // If first move, place off-screen so it animates in
      setPos(prev => prev ?? { x: window.innerWidth - 80, y: window.innerHeight - 80 });
      // Allow React to commit prev position before animating
      await wait(20);
      setPos({ x, y });
      await wait(720);
    },
    click: async (selector, opts) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(280);
      const r = el.getBoundingClientRect();
      const x = r.left + (opts?.offsetX ?? r.width / 2);
      const y = r.top + (opts?.offsetY ?? r.height / 2);
      setVisible(true);
      setPos(prev => prev ?? { x: window.innerWidth - 80, y: window.innerHeight - 80 });
      await wait(20);
      setPos({ x, y });
      await wait(640);
      setClicking(true);
      await wait(180);
      el.click();
      await wait(220);
      setClicking(false);
    },
    hide: () => setVisible(false),
  }), []);

  if (!visible || !pos) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed pointer-events-none z-[110]"
      style={{
        left: pos.x,
        top: pos.y,
        transform: 'translate(-6px, -4px)',
        transition: 'left 700ms cubic-bezier(0.22, 1, 0.36, 1), top 700ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* click ring */}
      {clicking && (
        <span
          className="absolute rounded-full border-2 border-cyan-400"
          style={{
            left: -18, top: -18, width: 40, height: 40,
            animation: 'tour-cursor-ping 380ms ease-out forwards',
          }}
        />
      )}
      <div className={clicking ? 'scale-90 transition-transform' : 'transition-transform'}>
        <MousePointer2
          className="h-7 w-7 text-cyan-300 drop-shadow-[0_0_6px_hsl(190_95%_55%/0.85)]"
          fill="hsl(190 95% 55% / 0.45)"
          strokeWidth={1.5}
        />
      </div>
      <style>{`
        @keyframes tour-cursor-ping {
          0%   { transform: scale(0.4); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
});
TourCursor.displayName = 'TourCursor';

/* ──────────────────────────────────────────────────────────────────── */
/* Mon-Fri rail                                                        */
/* ──────────────────────────────────────────────────────────────────── */
const DAYS: TourDay[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_LABELS: Record<TourDay, string> = { mon: 'MON', tue: 'TUE', wed: 'WED', thu: 'THU', fri: 'FRI' };

const DayRail = ({ currentDay, completedDays }: { currentDay?: TourDay; completedDays: Set<TourDay> }) => (
  <div className="flex gap-1 mb-3" aria-hidden="true">
    {DAYS.map(d => {
      const isCurrent = d === currentDay;
      const isDone = completedDays.has(d) && !isCurrent;
      return (
        <div
          key={d}
          className={[
            'flex-1 text-center text-[9px] tracking-[0.2em] py-1 rounded-sm border transition-all',
            isCurrent ? 'bg-cyan-400/20 border-cyan-400 text-cyan-200 animate-pulse'
              : isDone ? 'bg-cyan-400/5 border-cyan-400/40 text-cyan-300/80'
                : 'bg-card border-border text-muted-foreground/40',
          ].join(' ')}
        >
          {DAY_LABELS[d]}
        </div>
      );
    })}
  </div>
);

/* ──────────────────────────────────────────────────────────────────── */
/* Tour                                                                */
/* ──────────────────────────────────────────────────────────────────── */
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
  const [playing, setPlaying] = useState(true);
  const [hovering, setHovering] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<TourCursorHandle>(null);
  const titleId = useRef(`xerlens-tour-title-${Math.random().toString(36).slice(2, 8)}`).current;
  const bodyId = useRef(`xerlens-tour-body-${Math.random().toString(36).slice(2, 8)}`).current;
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const step = steps[idx];
  const ringSelector = step?.tightSelector ?? step?.target;

  useEffect(() => {
    if (open) { setIdx(0); setPlaying(true); }
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    let cancelled = false;
    (async () => {
      if (step.tab) onTabChange?.(step.tab);
      cursorRef.current?.hide();
      if (step.beforeShow && cursorRef.current) await step.beforeShow(cursorRef.current);
      requestAnimationFrame(() => !cancelled && setTick(t => t + 1));
    })();
    return () => { cancelled = true; };
  }, [idx, open, step, onTabChange]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    const compute = () => {
      const sel = step.tightSelector ?? step.target;
      if (sel) {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => {
        setRect(sel ? measure(sel) : null);
        setExtraRects((step.extraTargets || []).map(measure).filter((r): r is Rect => r !== null));
        setTabRect(step.tab ? measure(`[data-tour="tab-${step.tab}"]`) : null);
      }, 240);
    };
    compute();
    const onR = () => {
      const sel = step.tightSelector ?? step.target;
      setRect(sel ? measure(sel) : null);
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

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => { tooltipRef.current?.focus(); });
    return () => { previouslyFocused.current?.focus?.(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const getFocusable = (): HTMLElement[] => {
      const root = tooltipRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(el => !el.hasAttribute('aria-hidden'));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'Tab') {
        const f = getFocusable();
        if (f.length === 0) { e.preventDefault(); tooltipRef.current?.focus(); return; }
        const first = f[0]; const last = f[f.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const inside = tooltipRef.current?.contains(active ?? null);
        if (!inside) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
        else if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
        return;
      }
      const tag = (document.activeElement?.tagName || '').toLowerCase();
      const isField = tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (document.activeElement as HTMLElement | null)?.isContentEditable;
      if (isField) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); setPlaying(false); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPlaying(false); prev(); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Auto-advance — paused while hovering
  useEffect(() => {
    if (!open || !step || !playing || hovering) return;
    const dwell = step.dwellMs ?? 6500;
    const t = setTimeout(() => {
      if (idx >= steps.length - 1) { setPlaying(false); onClose(); }
      else setIdx(i => i + 1);
    }, dwell);
    return () => clearTimeout(t);
  }, [idx, open, step, playing, hovering, steps.length, onClose]);

  if (!open || !step) return null;

  const next = () => (idx >= steps.length - 1 ? onClose() : setIdx(i => i + 1));
  const prev = () => setIdx(i => Math.max(0, i - 1));

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const TIP_W = 420;
  let tipStyle: React.CSSProperties;
  if (rect) {
    const placeBelow = rect.top + rect.height + 16 + 240 < vh || rect.top < 240;
    const top = placeBelow ? rect.top + rect.height + 12 : Math.max(16, rect.top - 12 - 260);
    const left = Math.min(Math.max(16, rect.left), vw - TIP_W - 16);
    tipStyle = { top, left, width: TIP_W };
  } else {
    tipStyle = { top: vh / 2 - 130, left: vw / 2 - TIP_W / 2, width: TIP_W };
  }

  const padBox = (r: Rect, p = PAD): React.CSSProperties => ({
    top: r.top - p, left: r.left - p, width: r.width + p * 2, height: r.height + p * 2,
  });

  const sameRect = (a: Rect | null, b: Rect | null) =>
    !!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height;
  const showTabRing = tabRect && !sameRect(tabRect, rect) && !extraRects.some(r => sameRect(r, tabRect));

  // Compute completed days from earlier steps
  const completedDays = new Set<TourDay>();
  for (let i = 0; i < idx; i++) { const d = steps[i].day; if (d) completedDays.add(d); }

  return createPortal(
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog" aria-labelledby={titleId} aria-describedby={bodyId}>
      {rect ? (
        <>
          <div
            aria-hidden="true"
            className="fixed pointer-events-auto rounded-md ring-2 ring-cyan-400 transition-all duration-300"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            style={{
              ...padBox(rect),
              boxShadow: '0 0 0 9999px hsl(var(--background) / 0.82), 0 0 32px 4px hsl(190 95% 55% / 0.55)',
            }}
          />
          <div
            aria-hidden="true"
            className="fixed pointer-events-none rounded-md border-2 border-dashed border-cyan-300/70 animate-pulse transition-all duration-300"
            style={padBox(rect, PAD + 6)}
          />
        </>
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      )}

      {showTabRing && (
        <div
          aria-hidden="true"
          className="fixed pointer-events-none rounded-md ring-2 ring-cyan-400 animate-pulse transition-all duration-300"
          style={{ ...padBox(tabRect!, 4), boxShadow: '0 0 24px 2px hsl(190 95% 55% / 0.6)' }}
        />
      )}

      {extraRects.map((r, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="fixed pointer-events-none rounded-md ring-2 ring-cyan-300/80 animate-pulse transition-all duration-300"
          style={{ ...padBox(r, 4), boxShadow: '0 0 18px 2px hsl(190 95% 55% / 0.45)' }}
        />
      ))}

      <TourCursor ref={cursorRef} />

      <div
        ref={tooltipRef}
        tabIndex={-1}
        className="fixed bg-card border border-cyan-500/40 rounded-md shadow-2xl p-5 font-mono outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-opacity"
        style={{ ...tipStyle, opacity: hovering ? 0.4 : 1 }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <DayRail currentDay={step.day} completedDays={completedDays} />

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.25em] text-cyan-400">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span aria-live="polite" aria-atomic="true">STEP {idx + 1} / {steps.length}</span>
            {step.tab && (
              <span className="ml-2 px-1.5 py-0.5 rounded bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
                MODULE {step.tab.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPlaying(p => !p)}
              aria-label={playing ? 'Pause autoplay' : 'Play autoplay'}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
              className="p-1 rounded text-cyan-300 hover:text-cyan-100 hover:bg-cyan-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close tour"
              className="p-1 text-muted-foreground hover:text-foreground rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
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
            <Button size="sm" variant="outline" disabled={idx === 0} onClick={() => { setPlaying(false); prev(); }} aria-label="Previous step">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
            </Button>
            <Button size="sm" onClick={() => { setPlaying(false); next(); }} aria-label={idx === steps.length - 1 ? 'Finish tour' : 'Next step'}>
              {idx === steps.length - 1 ? 'Finish' : (<>Next <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></>)}
            </Button>
          </div>
        </div>
        <div className="flex gap-1 mt-3" aria-hidden="true">
          {steps.map((_, i) => (
            <div key={i} className={`h-0.5 flex-1 rounded-full ${i <= idx ? 'bg-cyan-400' : 'bg-border'}`} />
          ))}
        </div>
        {ringSelector && (
          <div className="mt-2 text-[9px] tracking-widest text-muted-foreground/50 text-center">
            HOVER THE SPOTLIGHT TO PAUSE · SPACE TO PLAY/PAUSE
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
