// Forward + backward pass CPM. Workday-aware via project calendar.
// Honors actual_start / actual_finish and the project data_date.
import type { ActivityRelationship, CpmResult, ScheduleActivity, ScheduleMeta } from './types';
import { addWorkdays, diffWorkdays, todayISO, maxISO, minISO } from './date-utils';

export function runCpm(
  activities: ScheduleActivity[],
  relationships: ActivityRelationship[],
  meta?: ScheduleMeta | null,
): CpmResult {
  const workdays = new Set(meta?.calendar?.workdays ?? [1, 2, 3, 4, 5]);
  const dataDate = meta?.data_date || null;
  const leaves = activities.filter(a => a.activity_type !== 'wbs');
  const byId = new Map(leaves.map(a => [a.id, a]));

  const projectStart =
    leaves.map(a => a.actual_start || a.baseline_start).filter((x): x is string => !!x).sort()[0]
    ?? dataDate
    ?? todayISO();

  // adjacency
  const predsOf = new Map<string, ActivityRelationship[]>();
  const succsOf = new Map<string, ActivityRelationship[]>();
  for (const r of relationships) {
    if (!byId.has(r.pred_activity_id) || !byId.has(r.succ_activity_id)) continue;
    (predsOf.get(r.succ_activity_id) ?? predsOf.set(r.succ_activity_id, []).get(r.succ_activity_id)!).push(r);
    (succsOf.get(r.pred_activity_id) ?? succsOf.set(r.pred_activity_id, []).get(r.pred_activity_id)!).push(r);
  }

  // Kahn topo sort
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
  const cycled = new Set<string>();
  if (order.length < leaves.length) {
    const stuck = leaves.filter(a => !order.includes(a.id)).map(a => a.id);
    cycles.push(stuck);
    stuck.forEach(id => cycled.add(id));
  }

  const ES = new Map<string, string>();
  const EF = new Map<string, string>();
  const dur = (a: ScheduleActivity) => Math.max(0, Number(a.duration_days || 0));

  // Forward pass
  for (const id of order) {
    const a = byId.get(id)!;
    const preds = predsOf.get(id) ?? [];
    // seed: actual_start locks ES; otherwise baseline_start, snapped forward by data_date
    let es: string;
    if (a.actual_start) {
      es = a.actual_start;
    } else {
      es = a.baseline_start || projectStart;
      if (dataDate && es < dataDate) es = dataDate;
    }
    for (const r of preds) {
      const p = byId.get(r.pred_activity_id)!;
      const pES = ES.get(p.id);
      const pEF = EF.get(p.id);
      if (!pES || !pEF) continue;
      const lag = Number(r.lag_days || 0);
      let candidate: string;
      if (r.rel_type === 'FS') candidate = addWorkdays(pEF, lag, workdays);
      else if (r.rel_type === 'SS') candidate = addWorkdays(pES, lag, workdays);
      else if (r.rel_type === 'FF') candidate = addWorkdays(pEF, lag - dur(a), workdays);
      else candidate = addWorkdays(pES, lag - dur(a), workdays); // SF
      if (a.actual_start) continue; // actual_start is hard-locked, don't push
      if (candidate > es) es = candidate;
    }
    ES.set(id, es);

    // EF: actual_finish hard-locks; finish milestones EF = ES
    let ef: string;
    if (a.actual_finish) ef = a.actual_finish;
    else if (a.activity_type === 'finish_milestone' || a.activity_type === 'start_milestone') ef = es;
    else ef = addWorkdays(es, dur(a), workdays);
    EF.set(id, ef);
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
    // finished activities pin LF to actual_finish so they don't appear critical
    if (a.actual_finish) lf = maxISO(lf, a.actual_finish)!;
    LF.set(id, lf);
    const ls = a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone'
      ? lf
      : addWorkdays(lf, -dur(a), workdays);
    LS.set(id, ls);
  }

  const result: CpmResult = { byId: new Map(), projectStart, projectFinish, cycles };
  for (const a of leaves) {
    if (cycled.has(a.id)) {
      result.byId.set(a.id, {
        early_start: a.baseline_start || projectStart,
        early_finish: a.baseline_start || projectStart,
        late_start: a.baseline_start || projectStart,
        late_finish: a.baseline_start || projectStart,
        total_float_days: NaN,
        is_critical: false,
      });
      continue;
    }
    const es = ES.get(a.id) ?? a.baseline_start ?? projectStart;
    const ef = EF.get(a.id) ?? es;
    const ls = LS.get(a.id) ?? es;
    const lf = LF.get(a.id) ?? ef;
    let float = diffWorkdays(es, ls, workdays);
    // Completed activities aren't critical
    const finished = !!a.actual_finish;
    const isCritical = !finished && float <= 0;
    result.byId.set(a.id, {
      early_start: es,
      early_finish: ef,
      late_start: ls,
      late_finish: lf,
      total_float_days: finished ? 0 : float,
      is_critical: isCritical,
    });
  }
  return result;
}
