import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { HardHat, FileText, PenTool, ArrowRight, Ruler, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'project_manager' | 'inspector';

interface WelcomeCarouselProps {
  open: boolean;
  onDismiss: () => void;
  userId: string;
  roles?: AppRole[];
}

const allSlides = [
  {
    icon: HardHat,
    title: 'Welcome to Quantity Takeoff',
    subtitle: 'Precision measurement for construction teams',
    description: 'Upload construction plans, measure quantities, and generate accurate takeoff reports — all from your browser or phone.',
    accent: true,
    showFor: ['admin', 'project_manager', 'inspector'] as AppRole[],
  },
  {
    icon: FileText,
    title: 'For Project Managers',
    subtitle: 'Configure projects for your team',
    description: 'Create projects, upload PDFs, set calibration scales, import pay items from specs, and assign inspectors to start measuring.',
    accent: false,
    showFor: ['admin', 'project_manager'] as AppRole[],
  },
  {
    icon: PenTool,
    title: 'For Inspectors',
    subtitle: 'Measure with pre-configured tools',
    description: 'Open assigned projects with pay items ready to go. Draw lines, areas, and counts directly on the plans — measurements calculate automatically.',
    accent: false,
    showFor: ['admin', 'inspector'] as AppRole[],
  },
  {
    icon: Ruler,
    title: 'The Workflow',
    subtitle: 'Upload → Calibrate → Annotate → Export',
    description: 'Calibrate the scale on each page, select a pay item, draw your measurement, and export your quantities as CSV or PDF.',
    accent: false,
    showFor: ['admin', 'project_manager', 'inspector'] as AppRole[],
  },
  {
    icon: Download,
    title: "You're All Set!",
    subtitle: 'Start your first project',
    description: 'Create a project or jump into one assigned to you. Need help later? Tap the ? button for a guided tour anytime.',
    accent: true,
    showFor: ['admin', 'project_manager', 'inspector'] as AppRole[],
  },
];

export function WelcomeCarousel({ open, onDismiss, userId, roles = [] }: WelcomeCarouselProps) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter slides based on user roles (show all if no roles yet)
  const slides = roles.length > 0
    ? allSlides.filter(s => s.showFor.some(r => roles.includes(r)))
    : allSlides;

  const goTo = (idx: number) => {
    setCurrent(idx);
    scrollRef.current?.children[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
  };

  const dismiss = async () => {
    await supabase.from('profiles').update({ has_seen_welcome: true } as any).eq('id', userId);
    onDismiss();
  };

  const isLast = current === slides.length - 1;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md p-0 gap-0 overflow-hidden border-border [&>button]:hidden"
        onPointerDownOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        {/* Slides */}
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory overflow-x-auto scrollbar-hide"
          onScroll={(e) => {
            const el = e.currentTarget;
            const idx = Math.round(el.scrollLeft / el.clientWidth);
            if (idx !== current) setCurrent(idx);
          }}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="flex-none w-full snap-center px-8 py-10 flex flex-col items-center text-center min-h-[340px] justify-center"
            >
              <div className={cn(
                'h-16 w-16 rounded-2xl flex items-center justify-center mb-5',
                slide.accent ? 'bg-primary/15' : 'bg-muted'
              )}>
                <slide.icon className={cn(
                  'h-8 w-8',
                  slide.accent ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">{slide.title}</h2>
              <p className="text-xs font-semibold text-primary mb-3">{slide.subtitle}</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{slide.description}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={dismiss}>
            Skip
          </Button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === current ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <Button size="sm" className="text-xs" onClick={dismiss}>
              Get Started <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          ) : (
            <div className="flex gap-1">
              {current > 0 && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goTo(current - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => goTo(current + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
