// Compute baseline-vs-update variance from two parsed XER files.
// Used by the "Progress vs Baseline" module to demonstrate the recurring
// progress-monitoring deliverable of the CPM Scheduler/Estimator role.
import type { XerTables, XerTask } from './types';

export interface ActivityVariance {
  task_id: string;
  task_code: string;
  task_name: string;
  baselineFinish?: string;
  updateFinish?: string;
  finishVarianceDays: number; // positive = slipping
  baselineDurHr: number;
  remainDurHr: number;
  pctComplete: number;
  status?: string;
}

export interface ProgressReport {
  spi: number;            // Schedule Performance Index (BCWP / BCWS) approx via duration
  cpi: number;            // Cost Performance Index — proxied via duration since XER cost is sparse
  pctComplete: number;    // overall by hours
  baselineFinish?: string;
  forecastFinish?: string;
  forecastVarianceDays: number;
  variances: ActivityVariance[];
  topSlipping: ActivityVariance[];
}

const HOURS_PER_DAY = 8;
const dayDiff = (a?: string, b?: string) => {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

export function compareProgress(baseline: XerTables, update: XerTables): ProgressReport {
  const baseTasks = new Map(baseline.TASK.map(t => [t.task_code, t]));
  const variances: ActivityVariance[] = [];

  let bcws = 0, bcwp = 0, totalBaseHr = 0, totalRemainHr = 0;

  for (const u of update.TASK) {
    if (u.task_type === 'TT_LOE' || u.task_type === 'TT_WBS') continue;
    const b = baseTasks.get(u.task_code);
    const baselineDur = b?.target_drtn_hr_cnt ?? u.target_drtn_hr_cnt ?? 0;
    const remain = u.remain_drtn_hr_cnt ?? 0;
    const done = Math.max(0, baselineDur - remain);
    const pct = baselineDur === 0 ? (u.status_code === 'TK_Complete' ? 100 : 0) : (done / baselineDur) * 100;

    totalBaseHr += baselineDur;
    totalRemainHr += remain;
    bcws += baselineDur; // planned value at completion
    bcwp += done;        // earned value (duration as proxy)

    variances.push({
      task_id: u.task_id,
      task_code: u.task_code,
      task_name: u.task_name,
      baselineFinish: b?.target_end_date,
      updateFinish: u.early_end_date || u.target_end_date,
      finishVarianceDays: dayDiff(b?.target_end_date, u.early_end_date || u.target_end_date),
      baselineDurHr: baselineDur,
      remainDurHr: remain,
      pctComplete: Math.min(100, Math.max(0, pct)),
      status: u.status_code,
    });
  }

  const pctComplete = totalBaseHr === 0 ? 0 : (bcwp / totalBaseHr) * 100;
  // SPI: earned / planned-to-date — for demo, planned-to-date = baseline duration of activities
  // whose baseline finish is on/before update data date.
  const updateDataDate = update.PROJECT[0]?.last_recalc_date ? new Date(update.PROJECT[0].last_recalc_date) : null;
  let plannedToDate = 0, earnedToDate = 0;
  if (updateDataDate) {
    for (const u of update.TASK) {
      if (u.task_type === 'TT_LOE' || u.task_type === 'TT_WBS') continue;
      const b = baseTasks.get(u.task_code);
      const baselineDur = b?.target_drtn_hr_cnt ?? 0;
      const baselineEnd = b?.target_end_date ? new Date(b.target_end_date) : null;
      if (baselineEnd && baselineEnd <= updateDataDate) {
        plannedToDate += baselineDur;
        const remain = u.remain_drtn_hr_cnt ?? 0;
        earnedToDate += Math.max(0, baselineDur - remain);
      }
    }
  }
  const spi = plannedToDate === 0 ? 1 : earnedToDate / plannedToDate;
  // CPI proxy: same ratio (no cost data) — we surface this honestly in the UI.
  const cpi = spi;

  const baselineFinish = baseline.PROJECT[0]?.plan_end_date;
  // Forecast finish = max early_end_date across remaining tasks
  const forecastFinish = update.TASK
    .filter(t => t.early_end_date)
    .map(t => t.early_end_date!)
    .sort()
    .pop();
  const forecastVarianceDays = dayDiff(baselineFinish, forecastFinish);

  const topSlipping = [...variances]
    .filter(v => v.finishVarianceDays > 0)
    .sort((a, b) => b.finishVarianceDays - a.finishVarianceDays)
    .slice(0, 10);

  return {
    spi, cpi, pctComplete,
    baselineFinish, forecastFinish,
    forecastVarianceDays,
    variances, topSlipping,
  };
}

export interface ChartRow {
  task_code: string;
  task_name: string;
  baselineOffset: number; // days from anchor date to baseline finish
  forecastOffset: number; // days from anchor date to forecast finish
  slip: number;           // forecastOffset - baselineOffset
}

/** Top N rows by absolute slip (late or early), expressed as day offsets
 * from an anchor date (typically the baseline data date / project start). */
export function chartRows(report: ProgressReport, anchor: string | undefined, n = 12): ChartRow[] {
  const anchorDate = anchor ? new Date(anchor) : null;
  const offset = (d?: string) => {
    if (!d || !anchorDate) return 0;
    return Math.round((new Date(d).getTime() - anchorDate.getTime()) / (1000 * 60 * 60 * 24));
  };
  return [...report.variances]
    .filter(v => v.baselineFinish && v.updateFinish)
    .sort((a, b) => Math.abs(b.finishVarianceDays) - Math.abs(a.finishVarianceDays))
    .slice(0, n)
    .map(v => ({
      task_code: v.task_code,
      task_name: v.task_name,
      baselineOffset: offset(v.baselineFinish),
      forecastOffset: offset(v.updateFinish),
      slip: v.finishVarianceDays,
    }));
}
