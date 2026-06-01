import { useEffect, useMemo, useState } from 'react';
import { PHASES, type PhaseId } from './lib/wbs-rollup';

interface ScheduleCap { verdict: string; remaining_days: number }
interface ScheduleStream {
  stream_key: string;
  title: string;
  actual_start: string | null;
  last_touch: string | null;
  forecast_finish: string | null;
  remaining_days: number;
  capabilities: ScheduleCap[];
}

interface Schedule {
  T0: string;
  defaults_days?: { implemented: number; partial: number; planned: number };
  totals: {
    capabilities: number;
    implemented: number;
    partial: number;
    planned: number;
    total_remaining_days: number;
    total_touches: number;
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
const fmtShort = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
const diffDays = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / MS_PER_DAY);
const addCalDays = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

interface PhaseRow {
  id: PhaseId;
  name: string;
  earliestStart: string | null;
  builtCount: number;
  totalCount: number;
  /** capabilities-equivalent remaining in this phase (planned + 0.5 * partial) */
  remainingCapsEq: number;
}

function rollupPhases(schedule: Schedule): PhaseRow[] {
  return PHASES.map(p => {
    const matched = schedule.streams.filter(s => p.streams.some(ps => ps.key === s.stream_key));
    const starts = matched.map(s => s.actual_start).filter(Boolean) as string[];
    let built = 0, total = 0, remainingEq = 0;
    matched.forEach(s => s.capabilities.forEach(c => {
      total++;
      if (c.verdict === 'implemented') built++;
      else if (c.verdict === 'partial') remainingEq += 0.5;
      else remainingEq += 1; // planned / missing
    }));
    return {
      id: p.id,
      name: p.name,
      earliestStart: starts.sort()[0] ?? null,
      builtCount: built,
      totalCount: total,
      remainingCapsEq: remainingEq,
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

  /* ----------------------------------------------------------------------
   * Velocity model: single developer, serial workflow.
   * Velocity (caps/day) = completed capabilities / elapsed calendar days.
   *   completed_caps  = implemented + 0.5 * partial
   *   remaining_caps  = planned     + 0.5 * partial
   * Each phase's forward calendar duration = phase remaining caps / velocity.
   * Phases are scheduled back-to-back starting TODAY (no parallelism).
   * -------------------------------------------------------------------- */
  const model = useMemo(() => {
    if (!schedule || phaseRows.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const fullStart = schedule.totals.actual_start;
    const elapsedCal = Math.max(1, diffDays(fullStart, today));
    const completedCapsEq = schedule.totals.implemented + 0.5 * schedule.totals.partial;
    const velocity = completedCapsEq > 0 ? completedCapsEq / elapsedCal : 0.2; // caps/day fallback
    let cursor = today;
    const forwardByPhase: Record<string, { start: string; end: string; calDays: number }> = {};
    let cumCalRemaining = 0;
    for (const r of phaseRows) {
      const calDays = Math.max(0, Math.ceil(r.remainingCapsEq / velocity));
      const end = addCalDays(cursor, calDays);
      forwardByPhase[r.id] = { start: cursor, end, calDays };
      cumCalRemaining += calDays;
      cursor = end;
    }
    const serialFinish = cursor;
    return { today, fullStart, velocity, elapsedCal, completedCapsEq, forwardByPhase, serialFinish, cumCalRemaining };
  }, [schedule, phaseRows]);

  const range = useMemo(() => {
    if (!schedule || !model) return null;
    const today = model.today;
    // Window: 90 days back from today, through serial finish + 14d pad.
    const cs = new Date(today); cs.setDate(cs.getDate() - 90);
    const clipStart = cs.toISOString().slice(0, 10);
    const start = clipStart > schedule.totals.actual_start ? clipStart : schedule.totals.actual_start;
    const padEnd = addCalDays(model.serialFinish, 14);
    return { start, end: padEnd, today, totalDays: Math.max(1, diffDays(start, padEnd)) };
  }, [schedule, model]);

  if (err) return <div className="text-xs font-mono text-destructive">Schedule unavailable: {err}</div>;
  if (!schedule || !range || !model) return <div className="text-xs font-mono text-muted-foreground">Loading schedule…</div>;

  // SVG layout
  const W = 1000, ROW_H = 44, LEFT = 220, RIGHT = 40, TOP = 30, BOTTOM = 30;
  const H = TOP + phaseRows.length * ROW_H + BOTTOM;
  const trackW = W - LEFT - RIGHT;
  const x = (dateStr: string) => {
    const d = Math.max(0, Math.min(range.totalDays, diffDays(range.start, dateStr)));
    return LEFT + (d / range.totalDays) * trackW;
  };
  const isBeforeWindow = (dateStr: string) => dateStr < range.start;

  const todayX = x(range.today);

  return (
    <div className="space-y-6">
      {/* Top numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Elapsed" value={`${model.elapsedCal}d`} sub={`since ${fmtDate(model.fullStart)}`} />
        <Stat
          label="Velocity"
          value={`${(model.velocity * 7).toFixed(1)} / wk`}
          sub={`${model.completedCapsEq.toFixed(0)} caps in ${model.elapsedCal}d`}
        />
        <Stat
          label="Remaining"
          value={`${model.cumCalRemaining}d`}
          sub={`serial · ${(schedule.totals.planned + 0.5 * schedule.totals.partial).toFixed(0)} caps left`}
          tone="amber"
        />
        <Stat label="Forecast finish" value={fmtDate(model.serialFinish)} sub="single workflow" tone="primary" />
      </div>

      {/* Gantt */}
      <div className="rounded-md border border-border bg-card/40 overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[700px]" style={{ height: H }}>
          {/* month grid */}
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
                <line x1={t.x} x2={t.x} y1={TOP - 8} y2={H - BOTTOM + 4}
                  stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="2 4" opacity={0.4} />
                <text x={t.x + 3} y={TOP - 14} className="fill-muted-foreground" style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {t.label}
                </text>
              </g>
            ));
          })()}

          {/* today line */}
          <line x1={todayX} x2={todayX} y1={TOP - 8} y2={H - BOTTOM + 4}
            stroke="hsl(var(--primary))" strokeWidth={1.5} />
          <text x={todayX + 3} y={TOP - 14} className="fill-primary" style={{ fontSize: 9, fontFamily: 'monospace' }}>
            TODAY
          </text>

          {/* phase rows — actual to today, then serial forecast bar */}
          {phaseRows.map((row, i) => {
            const y = TOP + i * ROW_H + 8;
            const xs = row.earliestStart ?? range.start;
            const actualStartX = x(xs);
            const fwd = model.forwardByPhase[row.id];
            const fwdStartX = x(fwd.start);
            const fwdEndX = x(fwd.end);
            const clippedLeft = !!row.earliestStart && isBeforeWindow(row.earliestStart);
            const pctBuilt = row.totalCount > 0 ? Math.round((row.builtCount / row.totalCount) * 100) : 0;
            return (
              <g key={row.id}>
                <text x={10} y={y + 16} className="fill-foreground"
                  style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>
                  {row.name}
                </text>
                <text x={10} y={y + 28} className="fill-muted-foreground"
                  style={{ fontSize: 9, fontFamily: 'monospace' }}>
                  {row.builtCount}/{row.totalCount} built · {pctBuilt}% · {fwd.calDays}d fwd
                </text>

                {/* actual progress: from earliest start to today */}
                {todayX > actualStartX && (
                  <rect x={actualStartX} y={y + 4} width={Math.max(2, todayX - actualStartX)} height={10}
                    fill="hsl(var(--primary))" opacity={0.85} rx={1} />
                )}

                {/* serial forecast (dashed) — only this phase's slice of forward work */}
                {fwd.calDays > 0 && fwdEndX > fwdStartX && (
                  <>
                    <rect x={fwdStartX} y={y + 16} width={Math.max(2, fwdEndX - fwdStartX)} height={10}
                      fill="hsl(var(--primary) / 0.18)" stroke="hsl(var(--primary))" strokeWidth={1}
                      strokeDasharray="3 2" rx={1} />
                    <text x={fwdEndX + 4} y={y + 24} className="fill-muted-foreground"
                      style={{ fontSize: 9, fontFamily: 'monospace' }}>
                      {fmtShort(fwd.end)}
                    </text>
                  </>
                )}

                {clippedLeft && (
                  <text x={actualStartX - 2} y={y + 13} textAnchor="end" className="fill-muted-foreground"
                    style={{ fontSize: 11, fontFamily: 'monospace' }}>‹‹</text>
                )}
              </g>
            );
          })}

          {/* serial finish marker */}
          {(() => {
            const fx = x(model.serialFinish);
            return (
              <g>
                <line x1={fx} x2={fx} y1={TOP - 4} y2={H - BOTTOM + 4}
                  stroke="hsl(var(--primary))" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
                <text x={fx + 4} y={H - BOTTOM + 16} className="fill-primary"
                  style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 600 }}>
                  FINISH · {fmtShort(model.serialFinish)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-[10px] font-mono text-muted-foreground">
        <span className="flex items-center gap-2"><span className="inline-block w-6 h-2 bg-primary/80" />Actual progress (start → today)</span>
        <span className="flex items-center gap-2"><span className="inline-block w-6 h-2 border border-primary border-dashed bg-primary/20" />Serial forecast (phase slice)</span>
        <span className="flex items-center gap-2">‹‹ baseline started before window</span>
      </div>

      {/* Milestone strip — clearer than clustered diamonds */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
          Milestones (forecast)
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {[...schedule.milestones]
            .sort((a, b) => (a.forecast_date ?? '').localeCompare(b.forecast_date ?? ''))
            .map(m => {
              const past = m.forecast_date && m.forecast_date < model.today;
              return (
                <div key={m.id}
                  className="flex items-center gap-3 rounded border border-border bg-card/30 px-3 py-2">
                  <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded
                    ${m.met ? 'bg-primary text-primary-foreground' : 'border border-primary text-primary'}`}>
                    {m.id}
                  </span>
                  <span className="flex-1 text-xs text-foreground/90 leading-tight">{m.name}</span>
                  <span className={`font-mono text-[10px] ${past && !m.met ? 'text-amber-400' : 'text-muted-foreground'}`}>
                    {fmtDate(m.forecast_date)}{past && !m.met ? ' · slipped' : ''}
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
        Forecast assumes a <strong className="text-foreground">single sequential workflow</strong> (one developer),
        not parallel streams. Velocity is derived from history: {model.completedCapsEq.toFixed(0)} capability-equivalents
        completed over {model.elapsedCal} calendar days = {(model.velocity * 7).toFixed(2)} caps/week.
        Remaining work ({(schedule.totals.planned + 0.5 * schedule.totals.partial).toFixed(0)} caps) is scheduled
        phase-after-phase starting today. Source: <code>.lovable/wbs/schedule.json</code>.
      </p>
    </div>
  );
}

function Stat({ label, value, sub, tone = 'default' }: { label: string; value: string; sub: string; tone?: 'default' | 'primary' | 'amber' }) {
  const valTone = tone === 'primary' ? 'text-primary' : tone === 'amber' ? 'text-amber-400' : 'text-foreground';
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] uppercase tracking-wider font-mono text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-xl font-semibold ${valTone}`}>{value}</div>
      <div className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate" title={sub}>{sub}</div>
    </div>
  );
}
