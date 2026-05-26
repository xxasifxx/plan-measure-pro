// Helpers for keeping baseline_end, milestone duration, and remaining duration
// consistent with the canonical fields the user actually edits.
import type { ScheduleActivity, ScheduleMeta } from './types';
import { addWorkdays } from './date-utils';

export function calendarFrom(meta?: ScheduleMeta | null): Set<number> {
  return new Set(meta?.calendar?.workdays ?? [1, 2, 3, 4, 5]);
}

export function normalizeActivityPatch(
  current: Partial<ScheduleActivity>,
  patch: Partial<ScheduleActivity>,
  workdays: Set<number>,
): Partial<ScheduleActivity> {
  const merged: Partial<ScheduleActivity> = { ...current, ...patch };
  const out: Partial<ScheduleActivity> = { ...patch };

  const isMilestone =
    merged.activity_type === 'start_milestone' || merged.activity_type === 'finish_milestone';

  if (isMilestone && Number(merged.duration_days || 0) !== 0) {
    out.duration_days = 0;
    merged.duration_days = 0;
  }

  const manual = !!merged.manual_finish;
  const startTouched = 'baseline_start' in patch || 'duration_days' in patch || 'activity_type' in patch;
  if (!manual && startTouched && merged.baseline_start) {
    const dur = Math.max(0, Number(merged.duration_days || 0));
    out.baseline_end = addWorkdays(merged.baseline_start, dur, workdays);
  }
  if (patch.manual_finish === false && merged.baseline_start) {
    const dur = Math.max(0, Number(merged.duration_days || 0));
    out.baseline_end = addWorkdays(merged.baseline_start, dur, workdays);
  }

  if (patch.actual_finish && Number(merged.percent_complete || 0) < 100) {
    out.percent_complete = 100;
    merged.percent_complete = 100;
  }
  if ('percent_complete' in patch || 'duration_days' in patch || 'actual_finish' in patch) {
    const pct = Math.min(100, Math.max(0, Number(merged.percent_complete || 0)));
    const dur = Math.max(0, Number(merged.duration_days || 0));
    out.remaining_duration_days = Math.round(dur * (1 - pct / 100) * 100) / 100;
  }

  // Constraint date is required when type is a hard constraint; clearing type clears date.
  if ('constraint_type' in patch) {
    const ct = patch.constraint_type;
    if (!ct || ct === 'ASAP' || ct === 'ALAP') {
      out.constraint_date = null;
    }
  }
  return out;
}
