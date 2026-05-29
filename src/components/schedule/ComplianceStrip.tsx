import { useMemo } from 'react';
import type { ActivityRelationship, ScheduleActivity } from '@/lib/schedule/types';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Per NJDOT Construction Scheduling Standard Coding and Procedures Manual.
// These M-codes are required milestones on every NJDOT capital project schedule.
const NJDOT_REQUIRED_MILESTONES: { code: string; name: string }[] = [
  { code: 'M100', name: 'Advertisement Date' },
  { code: 'M200', name: 'Bid Opening' },
  { code: 'M300', name: 'Award Date' },
  { code: 'M400', name: 'Notice to Proceed' },
  { code: 'M500', name: 'Construction Start Date' },
  { code: 'M600', name: 'Substantial Completion' },
  { code: 'M700', name: 'Final Inspection' },
  { code: 'M800', name: 'Punch List Complete' },
  { code: 'M950', name: 'Project Completion (Final Acceptance)' },
];

interface Props {
  activities: ScheduleActivity[];
  relationships: ActivityRelationship[];
  cycles: string[][];
}

export function ComplianceStrip({ activities, relationships, cycles }: Props) {
  const stats = useMemo(() => {
    const negativeLags = relationships.filter(r => Number(r.lag_days) < 0).length;
    const leaves = activities.filter(a => a.activity_type !== 'wbs');
    const preds = new Set(relationships.map(r => r.succ_activity_id));
    const succs = new Set(relationships.map(r => r.pred_activity_id));
    const openEnded = leaves.filter(a => !preds.has(a.id) || !succs.has(a.id)).length;
    const milestones = NJDOT_REQUIRED_MILESTONES.map(m => ({
      ...m,
      present: leaves.some(a => (a.activity_id || a.wbs_code || '').toUpperCase().startsWith(m.code)),
    }));
    const missing = milestones.filter(m => !m.present).length;
    return { negativeLags, openEnded, milestones, missing, totalTasks: leaves.length };
  }, [activities, relationships]);

  return (
    <div className="border-t border-border bg-card px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider flex flex-wrap items-center gap-3">
      <span className="text-muted-foreground">NJDOT Compliance</span>
      <Pill ok={stats.negativeLags === 0} label={`Negative lags: ${stats.negativeLags}`} />
      <Pill ok={stats.openEnded === 0} label={`Open-ended: ${stats.openEnded}/${stats.totalTasks}`} />
      <Pill ok={cycles.length === 0} label={`Cycles: ${cycles.reduce((n, c) => n + c.length, 0)}`} />
      <Pill ok={stats.missing === 0} label={`Missing M-codes: ${stats.missing}/${stats.milestones.length}`} />
      <span className="ml-auto text-muted-foreground normal-case">
        {cycles.length > 0
          ? `Cycle: ${cycles[0].slice(0, 3).join(' ↔ ')}${cycles[0].length > 3 ? '…' : ''}`
          : stats.milestones.filter(m => !m.present).map(m => m.code).join(' · ') || 'All NJDOT milestones present'}
      </span>
    </div>
  );
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border',
      ok ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive',
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {label}
    </span>
  );
}
