import { useEffect, useMemo, useState } from 'react';
import { PHASES, type PhaseId } from './lib/wbs-rollup';

interface ScheduleStream {
  stream_key: string;
  title: string;
  actual_start: string | null;
  last_touch: string | null;
  forecast_finish: string | null;
  remaining_days: number;
  capabilities: Array<{ verdict: string; remaining_days: number }>;
}

interface Schedule {
  T0: string;
  totals: {
    implemented: number;
    partial: number;
    planned: number;
    total_remaining_days: number;
    actual_start: string;
    last_touch: string;
    forecast_finish: string;
  };
  milestones: Array<{ id: string; name: string; forecast_date: string | null; met: boolean }>;
  streams: ScheduleStream[];
}

const MS_PER_DAY = 86400000;
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) : '—';
const diffDays = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY);

interface PhaseRow {
  id: PhaseId;
  name: string;
  earliestStart: string | null;
  latestForecast: string | null;
  builtCount: number;
  totalCount: number;
  remainingDays: number;
}

function rollupPhases(schedule: Schedule): PhaseRow[] {
  return PHASES.map(p => {
    const matched = schedule.streams.filter(s => p.streams.some(ps => ps.key === s.stream_key));
    const starts = matched.map(s => s.actual_start).filter(Boolean) as string[];
    const finishes = matched.map(s => s.forecast_finish).filter(Boolean) as string[];
    let built = 0, total = 0;
    matched.forEach(s => s.capabilities.forEach(c => {
      total++; if (c.verdict === 'implemented') built++;
    }));
    return {
      id: p.id,
      name: p.name,
      earliestStart: starts.sort()[0] ?? null,
      latestForecast: finishes.sort().slice(-1)[0] ?? null,
      builtCount: built,
      totalCount: total,
      remainingDays: matched.reduce((s, x) => s + (x.remaining_days || 0), 0),
    };
  });
}

export function PhaseSchedule() {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch('/wbs/schedule.json')
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then(setSchedule)
      .catch(e => setErr(String(e)));
  }, []);

  const phaseRows = useMemo(() => schedule ? rollupPhases(schedule) : [], [schedule]);

  const range = useMemo(() => {
    if (!schedule) return null;
    const fullStart = schedule.totals.actual_start;
    const end = schedule.totals.forecast_finish;
    const today = new Date().toISOString().slice(0, 10);
    // Clip visible window so the active 4–5 month span isn't dwarfed by
    // long-running streams that started in 2025. Window starts 90d before today
    // (or fullStart if later), ends 14d past forecast finish for breathing room.
    const cs = new Date(today); cs.setDate(cs.getDate() - 90);
    const clipStart = cs.toISOString().slice(0, 10);
    const start = clipStart > fullStart ? clipStart : fullStart;
    const pe = new Date(end); pe.setDate(pe.getDate() + 14);
    const endPadded = pe.toISOString().slice(0, 10);
    const totalDays = diffDays(start, endPadded);
    return { start, end: endPadded, today, totalDays, fullStart, clipped: start > fullStart };
  }, [schedule]);

  if (err) return <div className="text-xs font-mono text-destructive">Schedule unavailable: {err}</div>;
  if (!schedule || !range) return <div className="text-xs font-mono text-muted-foreground">Loading schedule…</div>;

  const elapsed = diffDays(range.fullStart, range.today);
  const remaining = Math.max(0, diffDays(range.today, range.end));
  const totalRemaining = schedule.totals.total_remaining_days;

  // SVG layout
  const W = 1000, ROW_H = 44, LEFT = 220, RIGHT = 40, TOP = 30;
  const MILESTONE_BAND = 70; // staggered milestone label band
  const H = TOP + phaseRows.length * ROW_H + MILESTONE_BAND;
  const trackW = W - LEFT - RIGHT;
  const x = (dateStr: string) => {
    const d = Math.max(0, Math.min(range.totalDays, diffDays(range.start, dateStr)));
    return LEFT + (d / range.totalDays) * trackW;
  };
  const isBeforeWindow = (dateStr: string) => dateStr < range.start;

  return (
    <div className="space-y-6">
      {/* Top numbers */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Elapsed" value={`${elapsed}d`} sub={`since ${fmtDate(range.fullStart)}`} />
        <Stat label="Remaining" value={`${totalRemaining}d`} sub="scope-weighted" tone="amber" />
        <Stat label="Forecast finish" value={fmtDate(schedule.totals.forecast_finish)} sub={`${remaining}d calendar`} tone="primary" />
      </div>

      {/* Gantt */}
      <div className="rounded-md border border-border bg-card/40 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[700px]" style={{ height: H }}>
          {/* time grid: month ticks */}
          {(() => {
            const ticks: { x: number; label: string }[] = [];
            const s = new Date(range.start); const e = new Date(range.end);
            const d = new Date(s.getFullYear(), s.getMonth(), 1);
            while (d <= e) {
              const iso = d.toISOString().slice(0, 10);
              ticks.push({ x: x(iso), label: d.toLocaleDateString('en-US', { month: 'short' }) });
              d.setMonth(d.getMonth() + 1);
            }
            return ticks.map((t, i) => (
              <g key={i}>
                <line x1={t.x} x2={t.x} y1={TOP - 8} y2={H - 30}
                  stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="2 4" opacity={0.4} />
                <text x={t.x + 3} y={TOP - 14} className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {t.label}
                </text>
              </g>
            ));
          })()}

          {/* today line */}
          <line x1={x(range.today)} x2={x(range.today)} y1={TOP - 8} y2={H - 30}
            stroke="hsl(var(--primary))" strokeWidth={1.5} />
          <text x={x(range.today) + 3} y={H - 32} className="fill-primary"
            style={{ fontSize: 9, fontFamily: 'monospace' }}>TODAY</text>

          {/* phase rows */}
          {phaseRows.map((row, i) => {
            const y = TOP + i * ROW_H + 8;
            const xs = row.earliestStart ?? range.start;
            const xe = row.latestForecast ?? range.end;
            const todayX = x(range.today);
            const startX = x(xs); const endX = x(xe);
            const actualEnd = Math.min(todayX, endX);
            return (
              <g key={row.id}>
                {/* label */}
                <text x={10} y={y + 16} className="fill-foreground" style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                  {row.name}
                </text>
                <text x={10} y={y + 28} className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {row.builtCount}/{row.totalCount} built · {row.remainingDays}d left
                </text>
                {/* baseline (gray) */}
                <rect x={startX} y={y} width={Math.max(2, endX - startX)} height={6}
                  fill="hsl(var(--muted))" opacity={0.5} rx={1} />
                {/* actual (solid) */}
                {actualEnd > startX && (
                  <rect x={startX} y={y + 8} width={Math.max(2, actualEnd - startX)} height={8}
                    fill="hsl(var(--primary))" opacity={0.85} rx={1} />
                )}
                {/* forecast (outline) */}
                {endX > actualEnd && (
                  <rect x={actualEnd} y={y + 8} width={Math.max(2, endX - actualEnd)} height={8}
                    fill="none" stroke="hsl(var(--primary))" strokeWidth={1.2} strokeDasharray="3 2" rx={1} />
                )}
              </g>
            );
          })}

          {/* milestone diamonds */}
          {schedule.milestones.filter(m => m.forecast_date).map((m, i) => {
            const mx = x(m.forecast_date!);
            const my = H - 18;
            const fill = m.met ? 'hsl(var(--primary))' : 'hsl(var(--card))';
            return (
              <g key={m.id}>
                <polygon points={`${mx},${my - 6} ${mx + 6},${my} ${mx},${my + 6} ${mx - 6},${my}`}
                  fill={fill} stroke="hsl(var(--primary))" strokeWidth={1.5} />
                <text x={mx} y={my + 18} textAnchor="middle" className="fill-foreground"
                  style={{ fontSize: 8, fontFamily: 'monospace' }}>{m.id}</text>
                <title>{m.id} — {m.name} ({fmtDate(m.forecast_date)})</title>
              </g>
            );
          })}
        </svg>
      </div>

      {/* legend + milestone list */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-2"><span className="inline-block w-6 h-1.5 bg-muted/50" />Baseline</span>
        <span className="flex items-center gap-2"><span className="inline-block w-6 h-2 bg-primary/80" />Actual</span>
        <span className="flex items-center gap-2"><span className="inline-block w-6 h-2 border border-primary border-dashed" />Forecast</span>
        <span className="flex items-center gap-2"><span className="inline-block w-2 h-2 border border-primary rotate-45" />Milestone</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-[10px] font-mono">
        {schedule.milestones.map(m => (
          <div key={m.id} className="flex items-center justify-between border-b border-border/40 py-1">
            <span className="text-foreground/80"><span className="text-primary">{m.id}</span> · {m.name}</span>
            <span className="text-muted-foreground">{fmtDate(m.forecast_date)}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] font-mono text-muted-foreground">
        Forecasts derived from remaining-scope + current build velocity. T0 = {fmtDate(range.start)}.
        Source: <code>.lovable/wbs/schedule.json</code>, regenerated on every build.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default' }: { label: string; value: string; sub: string; tone?: 'default' | 'primary' | 'amber' }) {
  const valTone = tone === 'primary' ? 'text-primary' : tone === 'amber' ? 'text-amber-400' : 'text-foreground';
  return (
    <div className="rounded-md border border-border bg-card/40 p-4">
      <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold ${valTone}`}>{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}
