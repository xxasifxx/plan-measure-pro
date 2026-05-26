// Forward + backward pass CPM. Workday-aware via project calendar.
// Operates only on leaf activities (activity_type !== 'wbs').
// Relationships:
//   FS: succ.ES >= pred.EF + lag
//   SS: succ.ES >= pred.ES + lag
//   FF: succ.EF >= pred.EF + lag
//   SF: succ.EF >= pred.ES + lag

import type { ActivityRelationship, CpmResult, ScheduleActivity, ScheduleMeta } from './types';
import { addWorkdays, diffWorkdays, todayISO } from './date-utils';

export function runCpm(
  activities: ScheduleActivity[],
  relationships: ActivityRelationship[],
  meta?: ScheduleMeta | null,
): CpmResult {
  const workdays = new Set(meta?.calendar?.workdays ?? [1, 2, 3, 4, 5]);
  const leaves = activities.filter(a => a.activity_type !== 'wbs');
  const byId = new Map(leaves.map(a => [a.id, a]));

  const projectStart =
    leaves.map(a => a.baseline_start).filter((x): x is string => !!x).sort()[0] ?? todayISO();

  // Build adjacency
  const predsOf = new Map<string, ActivityRelationship[]>();
  const succsOf = new Map<string, ActivityRelationship[]>();
  for (const r of relationships) {
    if (!byId.has(r.pred_activity_id) || !byId.has(r.succ_activity_id)) continue;
    (predsOf.get(r.succ_activity_id) ?? predsOf.set(r.succ_activity_id, []).get(r.succ_activity_id)!).push(r);
    (succsOf.get(r.pred_activity_id) ?? succsOf.set(r.pred_activity_id, []).get(r.pred_activity_id)!).push(r);
  }

  // Topological order (Kahn). Detect cycles.
  const indeg = new Map<string, number>();
  for (const a of leaves) indeg.set(a.id, (predsOf.get(a.id) ?? []).length);
  const queue: string[] = [];
  for (const [id, n] of indeg) if (n === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const r of succsOf.get(id) ?? []) {
      const left = (indeg.get(r.succ_activity_id) ?? 0) - 1;
      indeg.set(r.succ_activity_id, left);
      if (left === 0) queue.push(r.succ_activity_id);
    }
  }
  const cycles: string[][] = [];
  if (order.length < leaves.length) {
    const stuck = leaves.filter(a => !order.includes(a.id)).map(a => a.id);
    cycles.push(stuck);
    // Still try to compute for the acyclic portion; stuck activities keep zero schedule.
  }

  const ES = new Map<string, string>();
  const EF = new Map<string, string>();
  const dur = (a: ScheduleActivity) => Math.max(0, Number(a.duration_days || 0));

  // Forward pass
  for (const id of order) {
    const a = byId.get(id)!;
    const preds = predsOf.get(id) ?? [];
    let es = a.baseline_start || projectStart;
    for (const r of preds) {
      const p = byId.get(r.pred_activity_id)!;
      const pES = ES.get(p.id)!;
      const pEF = EF.get(p.id)!;
      const lag = Number(r.lag_days || 0);
      const pDur = dur(p);
      let candidate: string;
      if (r.rel_type === 'FS') candidate = addWorkdays(pEF, lag, workdays);
      else if (r.rel_type === 'SS') candidate = addWorkdays(pES, lag, workdays);
      else if (r.rel_type === 'FF') candidate = addWorkdays(pEF, lag - dur(a), workdays);
      else candidate = addWorkdays(pES, lag - dur(a), workdays); // SF
      if (candidate > es) es = candidate;
    }
    ES.set(id, es);
    EF.set(id, addWorkdays(es, dur(a), workdays));
  }

  // Project finish
  let projectFinish = projectStart;
  for (const id of order) {
    const ef = EF.get(id)!;
    if (ef > projectFinish) projectFinish = ef;
  }

  // Backward pass
  const LF = new Map<string, string>();
  const LS = new Map<string, string>();
  for (const id of [...order].reverse()) {
    const a = byId.get(id)!;
    const succs = succsOf.get(id) ?? [];
    let lf = projectFinish;
    for (const r of succs) {
      const s = byId.get(r.succ_activity_id)!;
      const sLS = LS.get(s.id);
      const sLF = LF.get(s.id);
      if (!sLS || !sLF) continue;
      const lag = Number(r.lag_days || 0);
      let candidate: string;
      if (r.rel_type === 'FS') candidate = addWorkdays(sLS, -lag, workdays);
      else if (r.rel_type === 'FF') candidate = addWorkdays(sLF, -lag, workdays);
      else if (r.rel_type === 'SS') candidate = addWorkdays(sLS, -lag + dur(a), workdays);
      else candidate = addWorkdays(sLF, -lag + dur(a), workdays); // SF
      if (candidate < lf) lf = candidate;
    }
    LF.set(id, lf);
    LS.set(id, addWorkdays(lf, -dur(a), workdays));
  }

  // Compose result + critical path
  const result: CpmResult = {
    byId: new Map(),
    projectStart,
    projectFinish,
    cycles,
  };
  for (const a of leaves) {
    const es = ES.get(a.id) ?? a.baseline_start ?? projectStart;
    const ef = EF.get(a.id) ?? es;
    const ls = LS.get(a.id) ?? es;
    const lf = LF.get(a.id) ?? ef;
    const float = diffWorkdays(es, ls, workdays);
    result.byId.set(a.id, {
      early_start: es,
      early_finish: ef,
      late_start: ls,
      late_finish: lf,
      total_float_days: float,
      is_critical: float <= 0,
    });
  }
  return result;
}
