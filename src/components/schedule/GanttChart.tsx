import { useMemo, useRef, useState } from 'react';
import type { ActivityRelationship, CpmResult, ScheduleActivity } from '@/lib/schedule/types';
import { parseISO, addWorkdays, diffDays } from '@/lib/schedule/date-utils';
import { cn } from '@/lib/utils';

interface Props {
  activities: ScheduleActivity[]; // leaf activities (display order)
  relationships: ActivityRelationship[];
  cpm: CpmResult | null;
  pxPerDay: number;
  rowHeight: number;
  onMove: (id: string, newStart: string) => void;
  onResize: (id: string, newDuration: number) => void;
  onSelect: (id: string | null) => void;
  selectedId: string | null;
}

export function GanttChart({
  activities, relationships, cpm, pxPerDay, rowHeight, onMove, onResize, onSelect, selectedId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute the calendar window
  const window = useMemo(() => {
    const dates: string[] = [];
    for (const a of activities) {
      const c = cpm?.byId.get(a.id);
      if (c) { dates.push(c.early_start, c.early_finish); }
      else if (a.baseline_start) dates.push(a.baseline_start);
    }
    if (!dates.length) {
      const today = new Date().toISOString().slice(0, 10);
      return { start: today, end: addWorkdays(today, 30) };
    }
    dates.sort();
    const start = dates[0];
    let end = dates[dates.length - 1];
    // pad
    end = addWorkdays(end, 5);
    return { start, end };
  }, [activities, cpm]);

  const totalDays = Math.max(30, diffDays(window.start, window.end) + 1);
  const totalWidth = totalDays * pxPerDay;

  const xForDate = (iso: string) => Math.max(0, diffDays(window.start, iso)) * pxPerDay;

  // Month header
  const months = useMemo(() => {
    const out: { label: string; x: number; width: number }[] = [];
    const startD = parseISO(window.start);
    const endD = parseISO(window.end);
    let cur = new Date(Date.UTC(startD.getUTCFullYear(), startD.getUTCMonth(), 1));
    while (cur <= endD) {
      const next = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
      const x = diffDays(window.start, cur.toISOString().slice(0, 10)) * pxPerDay;
      const w = diffDays(cur.toISOString().slice(0, 10), next.toISOString().slice(0, 10)) * pxPerDay;
      out.push({
        label: cur.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
        x: Math.max(0, x),
        width: w,
      });
      cur = next;
    }
    return out;
  }, [window, pxPerDay]);

  // Drag handling
  const [drag, setDrag] = useState<{ id: string; mode: 'move' | 'resize'; startX: number; originalStart: string; originalDur: number } | null>(null);

  const onMouseDown = (e: React.MouseEvent, a: ScheduleActivity, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    onSelect(a.id);
    const start = cpm?.byId.get(a.id)?.early_start || a.baseline_start || window.start;
    setDrag({ id: a.id, mode, startX: e.clientX, originalStart: start, originalDur: Number(a.duration_days || 0) });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dDays = Math.round(dx / pxPerDay);
    if (drag.mode === 'move') {
      const newStart = addWorkdays(drag.originalStart, dDays);
      const a = activities.find(x => x.id === drag.id);
      if (a) {
        const c = cpm?.byId.get(a.id);
        if (c) c.early_start = newStart;
      }
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dDays = Math.round(dx / pxPerDay);
    if (drag.mode === 'move' && dDays !== 0) {
      onMove(drag.id, addWorkdays(drag.originalStart, dDays));
    } else if (drag.mode === 'resize' && dDays !== 0) {
      onResize(drag.id, Math.max(0, drag.originalDur + dDays));
    }
    setDrag(null);
  };

  // Arrows
  const arrows = useMemo(() => {
    const out: { d: string; critical: boolean; key: string }[] = [];
    const rowIndex = new Map(activities.map((a, i) => [a.id, i]));
    for (const r of relationships) {
      const pi = rowIndex.get(r.pred_activity_id);
      const si = rowIndex.get(r.succ_activity_id);
      if (pi == null || si == null) continue;
      const pAct = activities[pi];
      const sAct = activities[si];
      const pc = cpm?.byId.get(pAct.id);
      const sc = cpm?.byId.get(sAct.id);
      if (!pc || !sc) continue;
      const x1 = xForDate(r.rel_type.startsWith('S') ? pc.early_start : pc.early_finish);
      const x2 = xForDate(r.rel_type.endsWith('S') ? sc.early_start : sc.early_finish);
      const y1 = pi * rowHeight + rowHeight / 2;
      const y2 = si * rowHeight + rowHeight / 2;
      out.push({
        d: `M ${x1} ${y1} L ${x1 + 8} ${y1} L ${x1 + 8} ${y2} L ${x2} ${y2}`,
        critical: pc.is_critical && sc.is_critical,
        key: r.id,
      });
    }
    return out;
  }, [activities, relationships, cpm, pxPerDay, rowHeight]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-background relative select-none"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => setDrag(null)}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border" style={{ width: totalWidth }}>
        <div className="relative h-8">
          {months.map((m, i) => (
            <div
              key={i}
              className="absolute top-0 h-8 border-l border-border text-[10px] font-mono text-muted-foreground px-1 leading-8"
              style={{ left: m.x, width: m.width }}
            >
              {m.label}
            </div>
          ))}
        </div>
      </div>

      {/* Lanes */}
      <div className="relative" style={{ width: totalWidth, height: activities.length * rowHeight }}>
        {/* vertical week lines */}
        {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-border/40"
            style={{ left: i * 7 * pxPerDay }}
          />
        ))}
        {/* Today marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/70 z-20"
          style={{ left: xForDate(new Date().toISOString().slice(0, 10)) }}
        />

        {/* Bars */}
        {activities.map((a, i) => {
          const c = cpm?.byId.get(a.id);
          const start = c?.early_start || a.baseline_start || window.start;
          const dur = Math.max(0.5, Number(a.duration_days || 0));
          const x = xForDate(start);
          const w = Math.max(8, dur * pxPerDay);
          const y = i * rowHeight + 6;
          const isMilestone = a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone';
          const critical = c?.is_critical;
          return (
            <div key={a.id}>
              {/* row stripe */}
              <div
                className={cn(
                  'absolute left-0 right-0 border-b border-border/30',
                  selectedId === a.id && 'bg-primary/5',
                )}
                style={{ top: i * rowHeight, height: rowHeight }}
              />
              {isMilestone ? (
                <div
                  className={cn(
                    'absolute cursor-pointer',
                    critical ? 'text-destructive' : 'text-warning',
                  )}
                  style={{ left: x - 6, top: y, width: 12, height: 12, transform: 'rotate(45deg)', background: 'currentColor' }}
                  onClick={() => onSelect(a.id)}
                />
              ) : (
                <div
                  className={cn(
                    'absolute rounded-sm border cursor-move shadow-sm',
                    critical ? 'bg-destructive/80 border-destructive' : 'bg-primary/70 border-primary',
                    selectedId === a.id && 'ring-2 ring-primary',
                  )}
                  style={{ left: x, top: y, width: w, height: rowHeight - 12 }}
                  onMouseDown={e => onMouseDown(e, a, 'move')}
                  title={`${a.name} · ${start} · ${dur}d`}
                >
                  {/* progress overlay */}
                  <div
                    className="h-full bg-foreground/30 rounded-l-sm"
                    style={{ width: `${Math.min(100, Number(a.percent_complete || 0))}%` }}
                  />
                  {/* resize handle */}
                  <div
                    className="absolute top-0 right-0 h-full w-1.5 cursor-ew-resize hover:bg-foreground/40"
                    onMouseDown={e => onMouseDown(e, a, 'resize')}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Dependency arrows overlay */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={totalWidth}
          height={activities.length * rowHeight}
        >
          {arrows.map(a => (
            <path
              key={a.key}
              d={a.d}
              fill="none"
              stroke={a.critical ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))'}
              strokeWidth={1}
              markerEnd="url(#arrowhead)"
            />
          ))}
          <defs>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="hsl(var(--muted-foreground))" />
            </marker>
          </defs>
        </svg>
      </div>
    </div>
  );
}
