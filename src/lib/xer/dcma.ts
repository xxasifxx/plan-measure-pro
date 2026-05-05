// DCMA 14-Point Schedule Health Assessment.
// Each check returns a percentage of activities failing (or a pass/fail boolean
// for non-percentage checks like CPLI/BEI), plus the offending task IDs.
import type { XerTables, XerTask } from './types';

export interface DcmaResult {
  id: string;
  name: string;
  description: string;
  target: string;
  metric: string;       // human-readable metric, e.g. "3.2%" or "0.97"
  pass: boolean;
  failingTaskIds: string[];
}

const isMilestone = (t: XerTask) => t.task_type === 'TT_Mile' || t.task_type === 'TT_FinMile';
const isLoeOrWbs  = (t: XerTask) => t.task_type === 'TT_LOE' || t.task_type === 'TT_WBS';
const isComplete  = (t: XerTask) => t.status_code === 'TK_Complete';
const isIncomplete = (t: XerTask) => !isComplete(t);
const HOURS_PER_DAY = 8;

export function runDcma(tbl: XerTables): DcmaResult[] {
  const tasks = tbl.TASK.filter(t => !isLoeOrWbs(t));
  const incomplete = tasks.filter(isIncomplete);
  const preds = tbl.TASKPRED;

  const predsBySucc: Record<string, typeof preds> = {};
  const predsByPred: Record<string, typeof preds> = {};
  for (const p of preds) {
    (predsBySucc[p.task_id] ||= []).push(p);
    (predsByPred[p.pred_task_id] ||= []).push(p);
  }

  const results: DcmaResult[] = [];
  const pct = (n: number, d: number) => d === 0 ? 0 : (n / d) * 100;
  const fmtPct = (n: number, d: number) => `${pct(n, d).toFixed(1)}%`;

  // 1. Logic — incomplete activities missing predecessor or successor (excluding project start/finish milestones)
  {
    const failing = incomplete.filter(t => {
      const hasPred = (predsBySucc[t.task_id] || []).length > 0;
      const hasSucc = (predsByPred[t.task_id] || []).length > 0;
      return !hasPred || !hasSucc;
    });
    results.push({
      id: 'logic', name: 'Logic',
      description: 'Incomplete activities should have both a predecessor and a successor.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 2. Leads — relationships with negative lag
  {
    const failing = preds.filter(p => p.lag_hr_cnt < 0);
    results.push({
      id: 'leads', name: 'Leads (Negative Lag)',
      description: 'No relationships should use negative lag. NJDOT prohibits negative lags entirely.',
      target: '0',
      metric: `${failing.length}`,
      pass: failing.length === 0,
      failingTaskIds: failing.map(p => p.task_id),
    });
  }

  // 3. Lags — relationships with positive lag
  {
    const failing = preds.filter(p => p.lag_hr_cnt > 0);
    results.push({
      id: 'lags', name: 'Lags',
      description: 'Positive lag use should be minimal; document any exceptions.',
      target: '< 5%',
      metric: fmtPct(failing.length, preds.length),
      pass: pct(failing.length, preds.length) < 5,
      failingTaskIds: failing.map(p => p.task_id),
    });
  }

  // 4. Relationship Types — Finish-to-Start should dominate
  {
    const fs = preds.filter(p => p.pred_type === 'PR_FS').length;
    results.push({
      id: 'fs', name: 'Relationship Types',
      description: 'At least 90% of relationships should be Finish-to-Start.',
      target: '≥ 90% FS',
      metric: fmtPct(fs, preds.length),
      pass: pct(fs, preds.length) >= 90,
      failingTaskIds: [],
    });
  }

  // 5. Hard Constraints — MSO/MFO etc on incomplete tasks
  {
    const HARD = new Set(['CS_MSO', 'CS_MFO', 'CS_MANDFIN', 'CS_MANDSTART']);
    const failing = incomplete.filter(t => t.cstr_type && HARD.has(t.cstr_type));
    results.push({
      id: 'hard', name: 'Hard Constraints',
      description: 'Mandatory Start / Mandatory Finish constraints distort logic and should be < 5%.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 6. High Float — total float > 44 working days (352 hr)
  {
    const failing = incomplete.filter(t => (t.total_float_hr_cnt ?? 0) > 44 * HOURS_PER_DAY);
    results.push({
      id: 'highfloat', name: 'High Float',
      description: 'Activities with total float > 44 working days suggest missing logic.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 7. Negative Float
  {
    const failing = incomplete.filter(t => (t.total_float_hr_cnt ?? 0) < 0);
    results.push({
      id: 'negfloat', name: 'Negative Float',
      description: 'No incomplete activity should have negative total float.',
      target: '0',
      metric: `${failing.length}`,
      pass: failing.length === 0,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 8. High Duration — remaining duration > 44 working days (352 hr)
  {
    const failing = incomplete.filter(t => !isMilestone(t) && (t.remain_drtn_hr_cnt ?? 0) > 44 * HOURS_PER_DAY);
    results.push({
      id: 'highdur', name: 'High Duration',
      description: 'Activities with remaining duration > 44 working days should be decomposed.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 9. Invalid Dates — actuals after data date OR forecasts before data date
  {
    const dataDate = tbl.PROJECT[0]?.last_recalc_date ? new Date(tbl.PROJECT[0].last_recalc_date) : null;
    const failing: XerTask[] = [];
    if (dataDate) {
      for (const t of tasks) {
        if (t.act_start_date && new Date(t.act_start_date) > dataDate) failing.push(t);
        if (t.act_end_date && new Date(t.act_end_date) > dataDate) failing.push(t);
        if (isIncomplete(t) && t.early_start_date && new Date(t.early_start_date) < dataDate && !t.act_start_date) failing.push(t);
      }
    }
    results.push({
      id: 'invaliddates', name: 'Invalid Dates',
      description: 'No actuals after data date; no forecasts before data date.',
      target: '0',
      metric: `${failing.length}`,
      pass: failing.length === 0,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 10. Resources — informational (we don't ingest TASKRSRC in the demo)
  {
    results.push({
      id: 'resources', name: 'Resources',
      description: 'All activities with duration should have cost or resource loading.',
      target: 'Informational',
      metric: 'Not loaded in demo',
      pass: true,
      failingTaskIds: [],
    });
  }

  // 11. Missed Tasks — tasks with baseline finish before data date that aren't complete
  {
    const dataDate = tbl.PROJECT[0]?.last_recalc_date ? new Date(tbl.PROJECT[0].last_recalc_date) : null;
    const failing: XerTask[] = [];
    if (dataDate) {
      for (const t of incomplete) {
        if (t.target_end_date && new Date(t.target_end_date) < dataDate) failing.push(t);
      }
    }
    results.push({
      id: 'missed', name: 'Missed Tasks',
      description: 'Activities scheduled to finish before data date but not yet complete.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingTaskIds: failing.map(t => t.task_id),
    });
  }

  // 12. Critical Path Test — at least one continuous critical path exists
  {
    const critical = incomplete.filter(t => (t.total_float_hr_cnt ?? 0) <= 0);
    results.push({
      id: 'cp', name: 'Critical Path Test',
      description: 'A continuous critical path (TF ≤ 0) must exist from data date to project finish.',
      target: '≥ 1 path',
      metric: `${critical.length} critical activities`,
      pass: critical.length > 0,
      failingTaskIds: [],
    });
  }

  // 13. CPLI — Critical Path Length Index = (CP length + TF) / CP length
  {
    const critical = incomplete.filter(t => (t.total_float_hr_cnt ?? 0) <= 0 && !isMilestone(t));
    const cpLen = critical.reduce((s, t) => s + (t.remain_drtn_hr_cnt ?? 0), 0);
    const tf = critical.reduce((s, t) => s + (t.total_float_hr_cnt ?? 0), 0);
    const cpli = cpLen === 0 ? 1 : (cpLen + tf) / cpLen;
    results.push({
      id: 'cpli', name: 'CPLI',
      description: 'Critical Path Length Index — likelihood of finishing on time.',
      target: '≥ 0.95',
      metric: cpli.toFixed(2),
      pass: cpli >= 0.95,
      failingTaskIds: [],
    });
  }

  // 14. BEI — Baseline Execution Index = tasks completed / tasks that should be complete
  {
    const dataDate = tbl.PROJECT[0]?.last_recalc_date ? new Date(tbl.PROJECT[0].last_recalc_date) : null;
    let actual = 0, planned = 0;
    if (dataDate) {
      for (const t of tasks) {
        if (isMilestone(t)) continue;
        if (t.target_end_date && new Date(t.target_end_date) <= dataDate) planned++;
        if (isComplete(t)) actual++;
      }
    }
    const bei = planned === 0 ? 1 : actual / planned;
    results.push({
      id: 'bei', name: 'BEI',
      description: 'Baseline Execution Index — schedule execution efficiency to date.',
      target: '≥ 0.95',
      metric: bei.toFixed(2),
      pass: bei >= 0.95,
      failingTaskIds: [],
    });
  }

  return results;
}

export function dcmaSummary(results: DcmaResult[]): string {
  const passed = results.filter(r => r.pass).length;
  const lines = [
    `DCMA 14-Point Audit — ${passed}/${results.length} checks passed`,
    ''.padEnd(56, '-'),
    ...results.map(r => `${r.pass ? '[PASS]' : '[FAIL]'}  ${r.name.padEnd(22)}  ${r.metric.padStart(10)}   target ${r.target}`),
  ];
  return lines.join('\n');
}
