// DCMA 14-Point audit panel. Runs the analyzer in-memory against the current
// schedule + relationships + data date — no file upload required, no XER.
// Clicking a failing row reveals the offending Activity IDs so the planner
// can jump into the table and fix them.
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { runDcma, dcmaSummary, type DcmaResult } from '@/lib/schedule/analysis/dcma';
import type { ActivityRelationship, ScheduleActivity, ScheduleMeta } from '@/lib/schedule/types';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  activities: ScheduleActivity[];
  relationships: ActivityRelationship[];
  meta?: ScheduleMeta;
}

export function DcmaPanel({ open, onOpenChange, activities, relationships, meta }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const results: DcmaResult[] = useMemo(
    () => runDcma({ activities, relationships, dataDate: meta?.data_date || null }),
    [activities, relationships, meta?.data_date],
  );
  const passed = results.filter(r => r.pass).length;

  const downloadReport = () => {
    const text = dcmaSummary(results);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dcma-audit-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const idLookup = useMemo(() => {
    const m = new Map<string, ScheduleActivity>();
    for (const a of activities) m.set(a.id, a);
    return m;
  }, [activities]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase tracking-wider text-sm">
            DCMA 14-Point Schedule Audit
          </DialogTitle>
          <DialogDescription className="text-xs">
            Live audit against the current in-memory schedule. Data date: {meta?.data_date || '— not set —'}.
            Click any check to inspect failing activities.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-y border-border py-2">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-muted-foreground">SCORE</span>
            <Badge variant={passed === results.length ? 'default' : passed >= 10 ? 'secondary' : 'destructive'}>
              {passed} / {results.length} checks passed
            </Badge>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={downloadReport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export .txt
          </Button>
        </div>

        <ScrollArea className="h-[420px] pr-2">
          <div className="divide-y divide-border">
            {results.map(r => {
              const isOpen = expanded === r.id;
              return (
                <div key={r.id} className="py-2">
                  <button
                    className="w-full flex items-start gap-2 text-left"
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                  >
                    <ChevronRight className={cn('h-3.5 w-3.5 mt-0.5 text-muted-foreground transition-transform', isOpen && 'rotate-90')} />
                    {r.pass
                      ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      : <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-mono font-semibold">{r.name}</span>
                        <span className={cn(
                          'text-[11px] font-mono shrink-0',
                          r.pass ? 'text-success' : 'text-destructive',
                        )}>
                          {r.metric} <span className="text-muted-foreground">/ target {r.target}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{r.description}</p>
                    </div>
                  </button>
                  {isOpen && r.failingActivityIds.length > 0 && (
                    <div className="ml-8 mt-2 border-l-2 border-destructive/40 pl-3 space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                        {r.failingActivityIds.length} failing
                      </div>
                      {r.failingActivityIds.slice(0, 50).map(id => {
                        const a = idLookup.get(id);
                        return (
                          <div key={id} className="text-[11px] font-mono">
                            <span className="text-destructive">{a?.activity_id || id.slice(0, 8)}</span>
                            {a?.name && <span className="text-muted-foreground"> — {a.name}</span>}
                          </div>
                        );
                      })}
                      {r.failingActivityIds.length > 50 && (
                        <div className="text-[10px] text-muted-foreground">+{r.failingActivityIds.length - 50} more…</div>
                      )}
                    </div>
                  )}
                  {isOpen && r.failingActivityIds.length === 0 && !r.pass && (
                    <div className="ml-8 mt-2 text-[11px] text-muted-foreground italic">
                      Aggregate metric — no per-activity flags.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
