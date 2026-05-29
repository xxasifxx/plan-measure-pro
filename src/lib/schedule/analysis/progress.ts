// Baseline-vs-current variance for the project's schedule. Replaces the
// XER-pair comparison with an in-app comparison between a captured baseline
// snapshot (BaselineActivity[]) and the current live schedule (ScheduleActivity[]).
import type { BaselineActivity, ScheduleActivity } from '@/lib/schedule/types';

export interface ActivityVariance {
  id: string;
  code: string;
  name: string;
  baselineFinish: string | null;
  forecastFinish: string | null;
  finishVarianceDays: number; // positive = slipping
  baselineDurDays: number;
  remainDurDays: number;
  pctComplete: number;
  isCritical: boolean;
}

export interface ProgressReport {
  spi: number;            // earned / planned-to-date
  cpi: number;            // proxied via duration since cost is optional
  pctComplete: number;    // overall by duration
  baselineFinish: string | null;
  forecastFinish: string | null;
  forecastVarianceDays: number;
  variances: ActivityVariance[];
  topSlipping: ActivityVariance[];
}

const dayDiff = (a?: string | null, b?: string | null) => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / 86_400_000);
};

export interface ProgressInput {
  baseline: BaselineActivity[];
  current: ScheduleActivity[];
  dataDate: string | null;
}

export function compareProgress({ baseline, current, dataDate }: ProgressInput): ProgressReport {
  // Match by activity_code (stable, human-readable); fall back to wbs_code.
  const baseByKey = new Map<string, BaselineActivity>();
  for (const b of baseline) {
    const key = b.activity_code || b.wbs_code;
    if (key) baseByKey.set(key, b);
  }

  const variances: ActivityVariance[] = [];
  const dd = dataDate ? new Date(dataDate) : null;
  let plannedToDate = 0, earnedToDate = 0;
  let totalBaseDays = 0;
  let bcwp = 0;

  for (const a of current) {
    if (a.activity_type === 'wbs' || a.activity_type === 'loe') continue;
    const key = a.activity_id || a.wbs_code;
    const b = key ? baseByKey.get(key) : undefined;
    const baseDur = Number(b?.duration_days ?? a.duration_days ?? 0);
    const pct = Math.min(100, Math.max(0, Number(a.percent_complete || 0)));
    const earned = baseDur * (pct / 100);
    const remain = Math.max(0, baseDur - earned);

    totalBaseDays += baseDur;
    bcwp += earned;

    if (dd && b?.baseline_end && new Date(b.baseline_end) <= dd) {
      plannedToDate += baseDur;
      earnedToDate += earned;
    }

    const baselineFinish = b?.baseline_end || null;
    const forecastFinish = a.early_finish || a.baseline_end || null;
    variances.push({
      id: a.id,
      code: a.activity_id || a.wbs_code,
      name: a.name,
      baselineFinish,
      forecastFinish,
      finishVarianceDays: dayDiff(baselineFinish, forecastFinish),
      baselineDurDays: baseDur,
      remainDurDays: remain,
      pctComplete: pct,
      isCritical: !!a.is_critical,
    });
  }

  const pctComplete = totalBaseDays === 0 ? 0 : (bcwp / totalBaseDays) * 100;
  const spi = plannedToDate === 0 ? 1 : earnedToDate / plannedToDate;
  const cpi = spi; // honest proxy when cost is absent

  const baselineFinish = baseline
    .map(b => b.baseline_end).filter(Boolean).sort().pop() || null;
  const forecastFinish = current
    .map(a => a.early_finish || a.baseline_end).filter(Boolean).sort().pop() as string | null;

  const topSlipping = [...variances]
    .filter(v => v.finishVarianceDays > 0)
    .sort((a, b) => b.finishVarianceDays - a.finishVarianceDays)
    .slice(0, 10);

  return {
    spi, cpi, pctComplete,
    baselineFinish, forecastFinish,
    forecastVarianceDays: dayDiff(baselineFinish, forecastFinish),
    variances, topSlipping,
  };
}

export interface ChartRow {
  code: string;
  name: string;
  baselineOffset: number;
  forecastOffset: number;
  slip: number;
}

/** Top N rows by absolute slip, expressed as day offsets from an anchor date. */
export function chartRows(report: ProgressReport, anchor: string | null | undefined, n = 12): ChartRow[] {
  const anchorDate = anchor ? new Date(anchor) : null;
  const offset = (d?: string | null) => {
    if (!d || !anchorDate) return 0;
    return Math.round((new Date(d).getTime() - anchorDate.getTime()) / 86_400_000);
  };
  return [...report.variances]
    .filter(v => v.baselineFinish && v.forecastFinish)
    .sort((a, b) => Math.abs(b.finishVarianceDays) - Math.abs(a.finishVarianceDays))
    .slice(0, n)
    .map(v => ({
      code: v.code,
      name: v.name,
      baselineOffset: offset(v.baselineFinish),
      forecastOffset: offset(v.forecastFinish),
      slip: v.finishVarianceDays,
    }));
}
