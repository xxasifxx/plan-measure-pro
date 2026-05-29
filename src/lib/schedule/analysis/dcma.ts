// DCMA 14-Point Schedule Health Assessment — rehomed onto the project's
// normalized ScheduleActivity / ActivityRelationship shape (days everywhere,
// no hours-per-day conversion). Consumes whatever the Schedule Management
// workspace already has in memory — XER ingest is no longer required.
import type { ActivityRelationship, ScheduleActivity } from '@/lib/schedule/types';

export interface DcmaResult {
  id: string;
  name: string;
  description: string;
  target: string;
  metric: string;       // human-readable metric, e.g. "3.2%" or "0.97"
  pass: boolean;
  failingActivityIds: string[];
}

export interface DcmaInput {
  activities: ScheduleActivity[];
  relationships: ActivityRelationship[];
  dataDate: string | null; // ISO YYYY-MM-DD
}

const isMilestone = (a: ScheduleActivity) =>
  a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone';
const isLoeOrWbs = (a: ScheduleActivity) => a.activity_type === 'loe' || a.activity_type === 'wbs';
const isComplete = (a: ScheduleActivity) => Number(a.percent_complete || 0) >= 100 || !!a.actual_finish;
const isIncomplete = (a: ScheduleActivity) => !isComplete(a);

const HIGH_DAYS = 44; // DCMA threshold: > 44 working days

export function runDcma({ activities, relationships, dataDate }: DcmaInput): DcmaResult[] {
  const leaves = activities.filter(a => !isLoeOrWbs(a));
  const incomplete = leaves.filter(isIncomplete);
  const dd = dataDate ? new Date(dataDate) : null;

  const predsBySucc: Record<string, ActivityRelationship[]> = {};
  const predsByPred: Record<string, ActivityRelationship[]> = {};
  for (const r of relationships) {
    (predsBySucc[r.succ_activity_id] ||= []).push(r);
    (predsByPred[r.pred_activity_id] ||= []).push(r);
  }

  const pct = (n: number, d: number) => d === 0 ? 0 : (n / d) * 100;
  const fmtPct = (n: number, d: number) => `${pct(n, d).toFixed(1)}%`;
  const results: DcmaResult[] = [];

  // 1. Logic — incomplete activities missing predecessor or successor
  {
    const failing = incomplete.filter(a => {
      const hasPred = (predsBySucc[a.id] || []).length > 0;
      const hasSucc = (predsByPred[a.id] || []).length > 0;
      return !hasPred || !hasSucc;
    });
    results.push({
      id: 'logic', name: 'Logic',
      description: 'Incomplete activities should have both a predecessor and a successor.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 2. Leads — relationships with negative lag (NJDOT prohibits)
  {
    const failing = relationships.filter(r => Number(r.lag_days) < 0);
    results.push({
      id: 'leads', name: 'Leads (Negative Lag)',
      description: 'No relationships should use negative lag. NJDOT prohibits negative lags entirely.',
      target: '0',
      metric: `${failing.length}`,
      pass: failing.length === 0,
      failingActivityIds: failing.map(r => r.succ_activity_id),
    });
  }

  // 3. Lags — relationships with positive lag
  {
    const failing = relationships.filter(r => Number(r.lag_days) > 0);
    results.push({
      id: 'lags', name: 'Lags',
      description: 'Positive lag use should be minimal; document any exceptions.',
      target: '< 5%',
      metric: fmtPct(failing.length, relationships.length),
      pass: pct(failing.length, relationships.length) < 5,
      failingActivityIds: failing.map(r => r.succ_activity_id),
    });
  }

  // 4. Relationship Types — FS should dominate
  {
    const fs = relationships.filter(r => r.rel_type === 'FS').length;
    results.push({
      id: 'fs', name: 'Relationship Types',
      description: 'At least 90% of relationships should be Finish-to-Start.',
      target: '≥ 90% FS',
      metric: fmtPct(fs, relationships.length),
      pass: pct(fs, relationships.length) >= 90,
      failingActivityIds: [],
    });
  }

  // 5. Hard Constraints — MSO/MFO on incomplete tasks
  {
    const HARD = new Set(['MSO', 'MFO']);
    const failing = incomplete.filter(a => a.constraint_type && HARD.has(a.constraint_type));
    results.push({
      id: 'hard', name: 'Hard Constraints',
      description: 'Must Start On / Must Finish On constraints distort logic and should be < 5%.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 6. High Float — total float > 44 working days
  {
    const failing = incomplete.filter(a => (a.total_float_days ?? 0) > HIGH_DAYS);
    results.push({
      id: 'highfloat', name: 'High Float',
      description: 'Activities with total float > 44 working days suggest missing logic.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 7. Negative Float
  {
    const failing = incomplete.filter(a => (a.total_float_days ?? 0) < 0);
    results.push({
      id: 'negfloat', name: 'Negative Float',
      description: 'No incomplete activity should have negative total float.',
      target: '0',
      metric: `${failing.length}`,
      pass: failing.length === 0,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 8. High Duration — remaining duration > 44 working days
  {
    const failing = incomplete.filter(a => !isMilestone(a) && Number(a.duration_days || 0) > HIGH_DAYS);
    results.push({
      id: 'highdur', name: 'High Duration',
      description: 'Activities with duration > 44 working days should be decomposed.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 9. Invalid Dates — actuals after data date, or forecasts before data date
  {
    const failing: ScheduleActivity[] = [];
    if (dd) {
      for (const a of leaves) {
        if (a.actual_start && new Date(a.actual_start) > dd) failing.push(a);
        if (a.actual_finish && new Date(a.actual_finish) > dd) failing.push(a);
        if (isIncomplete(a) && a.early_start && new Date(a.early_start) < dd && !a.actual_start) failing.push(a);
      }
    }
    results.push({
      id: 'invaliddates', name: 'Invalid Dates',
      description: 'No actuals after data date; no forecasts before data date.',
      target: '0',
      metric: `${failing.length}`,
      pass: failing.length === 0,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 10. Resources — informational
  {
    const withRes = leaves.filter(a => a.primary_resource_id).length;
    results.push({
      id: 'resources', name: 'Resources',
      description: 'All activities with duration should have cost or resource loading.',
      target: 'Informational',
      metric: leaves.length === 0 ? '—' : `${Math.round((withRes / leaves.length) * 100)}% loaded`,
      pass: true,
      failingActivityIds: [],
    });
  }

  // 11. Missed Tasks — baseline finish before data date but not complete
  {
    const failing: ScheduleActivity[] = [];
    if (dd) {
      for (const a of incomplete) {
        if (a.baseline_end && new Date(a.baseline_end) < dd) failing.push(a);
      }
    }
    results.push({
      id: 'missed', name: 'Missed Tasks',
      description: 'Activities scheduled to finish before data date but not yet complete.',
      target: '< 5%',
      metric: fmtPct(failing.length, incomplete.length),
      pass: pct(failing.length, incomplete.length) < 5,
      failingActivityIds: failing.map(a => a.id),
    });
  }

  // 12. Critical Path Test — at least one critical activity exists
  {
    const critical = incomplete.filter(a => a.is_critical);
    results.push({
      id: 'cp', name: 'Critical Path Test',
      description: 'A continuous critical path must exist from data date to project finish.',
      target: '≥ 1 path',
      metric: `${critical.length} critical activities`,
      pass: critical.length > 0,
      failingActivityIds: [],
    });
  }

  // 13. CPLI — Critical Path Length Index = (CP length + TF) / CP length
  {
    const critical = incomplete.filter(a => a.is_critical && !isMilestone(a));
    const cpLen = critical.reduce((s, a) => s + Number(a.duration_days || 0), 0);
    const tf = critical.reduce((s, a) => s + Number(a.total_float_days ?? 0), 0);
    const cpli = cpLen === 0 ? 1 : (cpLen + tf) / cpLen;
    results.push({
      id: 'cpli', name: 'CPLI',
      description: 'Critical Path Length Index — likelihood of finishing on time.',
      target: '≥ 0.95',
      metric: cpli.toFixed(2),
      pass: cpli >= 0.95,
      failingActivityIds: [],
    });
  }

  // 14. BEI — Baseline Execution Index = tasks completed / tasks that should be complete
  {
    let actual = 0, planned = 0;
    if (dd) {
      for (const a of leaves) {
        if (isMilestone(a)) continue;
        if (a.baseline_end && new Date(a.baseline_end) <= dd) planned++;
        if (isComplete(a)) actual++;
      }
    }
    const bei = planned === 0 ? 1 : actual / planned;
    results.push({
      id: 'bei', name: 'BEI',
      description: 'Baseline Execution Index — schedule execution efficiency to date.',
      target: '≥ 0.95',
      metric: bei.toFixed(2),
      pass: bei >= 0.95,
      failingActivityIds: [],
    });
  }

  return results;
}

export function dcmaSummary(results: DcmaResult[]): string {
  const passed = results.filter(r => r.pass).length;
  const lines = [
    `DCMA 14-Point Audit — ${passed}/${results.length} checks passed`,
    ''.padEnd(56, '-'),
    ...results.map(r =>
      `${r.pass ? '[PASS]' : '[FAIL]'}  ${r.name.padEnd(22)}  ${r.metric.padStart(14)}   target ${r.target}`,
    ),
  ];
  return lines.join('\n');
}
