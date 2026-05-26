// Forward + backward pass CPM. Per-activity calendar-aware, constraint-aware.
import type {
  ActivityRelationship, CpmResult, ScheduleActivity, ScheduleMeta,
  ScheduleCalendar, ConstraintType,
} from './types';
import {
  addWorkdays, diffWorkdays, todayISO, maxISO, type WorkCalendar,
} from './date-utils';
import { workdaySet, exceptionMap } from './calendars';

export interface CpmInput {
  activities: ScheduleActivity[];
  relationships: ActivityRelationship[];
  meta?: ScheduleMeta | null;
  calendars?: ScheduleCalendar[];
}

export function runCpm(
  activities: ScheduleActivity[],
  relationships: ActivityRelationship[],
  meta?: ScheduleMeta | null,
  calendars: ScheduleCalendar[] = [],
): CpmResult {
  // Project-level fallback calendar from meta
  const fallback: WorkCalendar = {
    workdays: new Set(meta?.calendar?.workdays ?? [1, 2, 3, 4, 5]),
  };
  const defaultCal = calendars.find(c => c.is_default);
  if (defaultCal) {
    fallback.workdays = workdaySet(defaultCal);
    fallback.exceptions = exceptionMap(defaultCal);
  }
  const calsById = new Map(calendars.map(c => [c.id, c] as const));
  const calFor = (a: ScheduleActivity): WorkCalendar => {
    if (a.calendar_id && calsById.has(a.calendar_id)) {
      const cal = calsById.get(a.calendar_id)!;
      return { workdays: workdaySet(cal), exceptions: exceptionMap(cal) };
    }
    return fallback;
  };

  const dataDate = meta?.data_date || null;
  const leaves = activities.filter(a => a.activity_type !== 'wbs');
  const byId = new Map(leaves.map(a => [a.id, a]));

  const projectStart =
    leaves.map(a => a.actual_start || a.baseline_start).filter((x): x is string => !!x).sort()[0]
    ?? dataDate ?? todayISO();

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
  const constraintViolated = new Set<string>();
  const dur = (a: ScheduleActivity) => Math.max(0, Number(a.duration_days || 0));

  // ===== Forward pass =====
  for (const id of order) {
    const a = byId.get(id)!;
    const cal = calFor(a);
    const preds = predsOf.get(id) ?? [];
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
      if (r.rel_type === 'FS') candidate = addWorkdays(pEF, lag, cal);
      else if (r.rel_type === 'SS') candidate = addWorkdays(pES, lag, cal);
      else if (r.rel_type === 'FF') candidate = addWorkdays(pEF, lag - dur(a), cal);
      else candidate = addWorkdays(pES, lag - dur(a), cal);
      if (a.actual_start) continue;
      if (candidate > es) es = candidate;
    }

    // Apply constraints (forward)
    if (!a.actual_start && a.constraint_type && a.constraint_date) {
      const cd = a.constraint_date.slice(0, 10);
      const ct = a.constraint_type as ConstraintType;
      if (ct === 'SNET' && cd > es) es = cd;
      else if (ct === 'MSO') {
        if (cd !== es) constraintViolated.add(id);
        es = cd;
      } else if (ct === 'FNET') {
        const minES = addWorkdays(cd, -dur(a), cal);
        if (minES > es) es = minES;
      } else if (ct === 'MFO') {
        const required = addWorkdays(cd, -dur(a), cal);
        if (required !== es) constraintViolated.add(id);
        es = required;
      }
      // SNLT/FNLT enforced in backward pass; ASAP/ALAP no-ops here
    }
    ES.set(id, es);

    let ef: string;
    if (a.actual_finish) ef = a.actual_finish;
    else if (a.activity_type === 'finish_milestone' || a.activity_type === 'start_milestone') ef = es;
    else ef = addWorkdays(es, dur(a), cal);
    EF.set(id, ef);
  }

  // Project finish
  let projectFinish = projectStart;
  for (const id of order) {
    const ef = EF.get(id)!;
    if (ef > projectFinish) projectFinish = ef;
  }

  // ===== Backward pass =====
  const LF = new Map<string, string>();
  const LS = new Map<string, string>();
  for (const id of [...order].reverse()) {
    const a = byId.get(id)!;
    const cal = calFor(a);
    const succs = succsOf.get(id) ?? [];
    let lf = projectFinish;
    for (const r of succs) {
      const s = byId.get(r.succ_activity_id)!;
      const sLS = LS.get(s.id);
      const sLF = LF.get(s.id);
      if (!sLS || !sLF) continue;
      const lag = Number(r.lag_days || 0);
      let candidate: string;
      if (r.rel_type === 'FS') candidate = addWorkdays(sLS, -lag, cal);
      else if (r.rel_type === 'FF') candidate = addWorkdays(sLF, -lag, cal);
      else if (r.rel_type === 'SS') candidate = addWorkdays(sLS, -lag + dur(a), cal);
      else candidate = addWorkdays(sLF, -lag + dur(a), cal);
      if (candidate < lf) lf = candidate;
    }

    // Apply late constraints
    if (a.constraint_type && a.constraint_date) {
      const cd = a.constraint_date.slice(0, 10);
      const ct = a.constraint_type as ConstraintType;
      if (ct === 'FNLT' && cd < lf) lf = cd;
      else if (ct === 'SNLT') {
        const maxLF = addWorkdays(cd, dur(a), cal);
        if (maxLF < lf) lf = maxLF;
      } else if (ct === 'MFO') lf = cd;
      else if (ct === 'MSO') lf = addWorkdays(cd, dur(a), cal);
      else if (ct === 'ALAP') {
        // ALAP: pin LF down by setting it to its own EF (no forward push, but late-pass treats as critical)
        const efSelf = EF.get(id);
        if (efSelf && efSelf < lf) lf = efSelf;
      }
    }

    if (a.actual_finish) lf = maxISO(lf, a.actual_finish)!;
    LF.set(id, lf);
    const ls = a.activity_type === 'start_milestone' || a.activity_type === 'finish_milestone'
      ? lf
      : addWorkdays(lf, -dur(a), cal);
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
    const cal = calFor(a);
    const es = ES.get(a.id) ?? a.baseline_start ?? projectStart;
    const ef = EF.get(a.id) ?? es;
    const ls = LS.get(a.id) ?? es;
    const lf = LF.get(a.id) ?? ef;
    const float = diffWorkdays(es, ls, cal);
    const finished = !!a.actual_finish;
    const isCritical = !finished && (float <= 0 || constraintViolated.has(a.id));
    result.byId.set(a.id, {
      early_start: es,
      early_finish: ef,
      late_start: ls,
      late_finish: lf,
      total_float_days: finished ? 0 : float,
      is_critical: isCritical,
      constraint_violated: constraintViolated.has(a.id),
    });
  }
  return result;
}
