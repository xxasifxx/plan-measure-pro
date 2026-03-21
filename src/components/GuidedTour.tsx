import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TourStep } from '@/hooks/useTour';

interface GuidedTourProps {
  steps: TourStep[];
  currentStep: number;
  isActive: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function GuidedTour({ steps, currentStep, isActive, onNext, onPrev, onSkip }: GuidedTourProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isActive || !step) return;

    const findTarget = () => {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        setTimeout(() => setRect(el.getBoundingClientRect()), 150);
      } else {
        setRect(null);
      }
    };

    findTarget();
    const timer = setInterval(findTarget, 500);
    return () => clearInterval(timer);
  }, [isActive, step, currentStep]);

  if (!isActive || !step || !rect) return null;

  const pad = 6;
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  // Position tooltip
  const pos = step.position || 'bottom';
  const tooltipStyle: React.CSSProperties = {};
  if (pos === 'bottom') {
    tooltipStyle.top = rect.bottom + pad + 8;
    tooltipStyle.left = Math.max(8, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 296));
  } else if (pos === 'top') {
    tooltipStyle.bottom = window.innerHeight - rect.top + pad + 8;
    tooltipStyle.left = Math.max(8, Math.min(rect.left + rect.width / 2 - 140, window.innerWidth - 296));
  } else if (pos === 'right') {
    tooltipStyle.top = rect.top + rect.height / 2 - 40;
    tooltipStyle.left = rect.right + pad + 8;
  } else {
    tooltipStyle.top = rect.top + rect.height / 2 - 40;
    tooltipStyle.right = window.innerWidth - rect.left + pad + 8;
  }

  return createPortal(
    <>
      {/* Backdrop overlay with cutout */}
      <div className="fixed inset-0 z-[9998]" onClick={onSkip}>
        <svg className="w-full h-full">
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - pad} y={rect.top - pad}
                width={rect.width + pad * 2} height={rect.height + pad * 2}
                rx="8" fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#tour-mask)" />
        </svg>
      </div>

      {/* Highlight ring */}
      <div
        className="fixed z-[9999] pointer-events-none rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-300"
        style={{
          top: rect.top - pad, left: rect.left - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
        }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-[280px] rounded-xl border border-border bg-card shadow-xl p-4 animate-in fade-in-0 zoom-in-95"
        style={tooltipStyle}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
          <button onClick={onSkip} className="p-0.5 rounded hover:bg-muted transition-colors">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground font-medium">
            {currentStep + 1} / {steps.length}
          </span>
          <div className="flex gap-1.5">
            {!isFirst && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onPrev}>
                <ChevronLeft className="h-3 w-3 mr-0.5" /> Back
              </Button>
            )}
            <Button size="sm" className="h-7 px-3 text-xs" onClick={onNext}>
              {isLast ? 'Done' : 'Next'} {!isLast && <ChevronRight className="h-3 w-3 ml-0.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
