import { describe, it, expect } from 'vitest';
import { runCpm } from '@/lib/schedule/cpm';
import type { ScheduleActivity, ActivityRelationship } from '@/lib/schedule/types';

function a(id: string, dur: number, start = '2026-01-05'): ScheduleActivity {
  return {
    id, project_id: 'p', parent_wbs_id: null, wbs_code: id, activity_id: id, name: id,
    activity_type: 'task', baseline_start: start, baseline_end: null,
    duration_days: dur, percent_complete: 0,
    actual_start: null, actual_finish: null,
    early_start: null, early_finish: null, late_start: null, late_finish: null,
    total_float_days: null, is_critical: false, sort_order: 0,
    pay_item_id: null, baseline_quantity: 0,
  };
}

function rel(pred: string, succ: string, lag = 0): ActivityRelationship {
  return { id: `${pred}-${succ}`, project_id: 'p', pred_activity_id: pred, succ_activity_id: succ, rel_type: 'FS', lag_days: lag };
}

describe('CPM', () => {
  it('marks the longer parallel chain critical', () => {
    // A(5) -> B(10) -> D(2)
    // A(5) -> C(3)  -> D(2)
    // Critical: A,B,D
    const activities = [a('A', 5), a('B', 10), a('C', 3), a('D', 2)];
    const rels = [rel('A', 'B'), rel('A', 'C'), rel('B', 'D'), rel('C', 'D')];
    const r = runCpm(activities, rels);
    expect(r.byId.get('A')!.is_critical).toBe(true);
    expect(r.byId.get('B')!.is_critical).toBe(true);
    expect(r.byId.get('D')!.is_critical).toBe(true);
    expect(r.byId.get('C')!.is_critical).toBe(false);
    expect(r.byId.get('C')!.total_float_days).toBe(7);
  });

  it('detects cycles', () => {
    const activities = [a('A', 1), a('B', 1)];
    const rels = [rel('A', 'B'), rel('B', 'A')];
    const r = runCpm(activities, rels);
    expect(r.cycles.length).toBeGreaterThan(0);
  });
});
