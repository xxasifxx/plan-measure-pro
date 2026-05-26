// Helpers for keeping baseline_end, milestone duration, and remaining duration
// consistent with the canonical fields the user actually edits.
import type { ScheduleActivity, ScheduleMeta } from './types';
import { addWorkdays } from './date-utils';

export function calendarFrom(meta?: ScheduleMeta | null): Set<number> {
  return new Set(meta?.calendar?.workdays ?? [1, 2, 3, 4, 5]);
}

/**
 * Normalize a partial activity update so derived fields stay correct.
 * - Milestones are forced to duration 0.
 * - When duration_days or baseline_start change (and manual_finish is not on),
 *   baseline_end is recomputed.
 * - When percent_complete changes, remaining_duration_days is recomputed.
 */
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

  // baseline_end auto-derive
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

  // actual_finish ⇒ % = 100
  if (patch.actual_finish && Number(merged.percent_complete || 0) < 100) {
    out.percent_complete = 100;
    merged.percent_complete = 100;
  }
  // % = 100 ⇒ remaining = 0
  if ('percent_complete' in patch || 'duration_days' in patch || 'actual_finish' in patch) {
    const pct = Math.min(100, Math.max(0, Number(merged.percent_complete || 0)));
    const dur = Math.max(0, Number(merged.duration_days || 0));
    out.remaining_duration_days = Math.round(dur * (1 - pct / 100) * 100) / 100;
  }

  return out;
}
