import { describe, it, expect } from 'vitest';
import { runCpm } from '@/lib/schedule/cpm';
import type { ScheduleActivity, ActivityRelationship, ActivityType } from '@/lib/schedule/types';

function a(id: string, dur: number, start = '2026-01-05', extra: Partial<ScheduleActivity> = {}): ScheduleActivity {
  return {
    id, project_id: 'p', parent_wbs_id: null, wbs_code: id, activity_id: id, name: id,
    activity_type: 'task' as ActivityType, baseline_start: start, baseline_end: null,
    duration_days: dur, percent_complete: 0,
    actual_start: null, actual_finish: null,
    early_start: null, early_finish: null, late_start: null, late_finish: null,
    total_float_days: null, is_critical: false, sort_order: 0,
    pay_item_id: null, baseline_quantity: 0,
    ...extra,
  };
}
const rel = (pred: string, succ: string, lag = 0, type: any = 'FS'): ActivityRelationship => ({
  id: `${pred}-${succ}`, project_id: 'p', pred_activity_id: pred, succ_activity_id: succ, rel_type: type, lag_days: lag,
});

describe('CPM', () => {
  it('marks the longer parallel chain critical', () => {
    const activities = [a('A', 5), a('B', 10), a('C', 3), a('D', 2)];
    const rels = [rel('A', 'B'), rel('A', 'C'), rel('B', 'D'), rel('C', 'D')];
    const r = runCpm(activities, rels);
    expect(r.byId.get('A')!.is_critical).toBe(true);
    expect(r.byId.get('B')!.is_critical).toBe(true);
    expect(r.byId.get('D')!.is_critical).toBe(true);
    expect(r.byId.get('C')!.is_critical).toBe(false);
    expect(r.byId.get('C')!.total_float_days).toBe(7);
  });

  it('detects cycles and marks involved activities non-critical', () => {
    const activities = [a('A', 1), a('B', 1)];
    const rels = [rel('A', 'B'), rel('B', 'A')];
    const r = runCpm(activities, rels);
    expect(r.cycles.length).toBeGreaterThan(0);
    expect(r.byId.get('A')!.is_critical).toBe(false);
    expect(Number.isNaN(r.byId.get('A')!.total_float_days)).toBe(true);
  });

  it('actual_start locks ES even when predecessor finishes later', () => {
    const acts = [
      a('A', 10, '2026-01-05'),
      a('B', 3, '2026-01-19', { actual_start: '2026-01-12' }),
    ];
    const r = runCpm(acts, [rel('A', 'B')]);
    expect(r.byId.get('B')!.early_start).toBe('2026-01-12');
  });

  it('actual_finish forces float to 0 and not critical', () => {
    const acts = [a('A', 5, '2026-01-05', { actual_finish: '2026-01-09', percent_complete: 100 })];
    const r = runCpm(acts, []);
    expect(r.byId.get('A')!.total_float_days).toBe(0);
    expect(r.byId.get('A')!.is_critical).toBe(false);
  });

  it('data_date pushes ES forward for not-started activities', () => {
    const acts = [a('A', 5, '2026-01-05')];
    const r = runCpm(acts, [], { project_id: 'p', data_date: '2026-02-02', calendar: { workdays: [1, 2, 3, 4, 5] } });
    expect(r.byId.get('A')!.early_start >= '2026-02-02').toBe(true);
  });

  it('finish_milestone EF equals ES (zero-duration)', () => {
    const acts = [
      a('A', 5, '2026-01-05'),
      a('M', 0, '2026-01-05', { activity_type: 'finish_milestone' as ActivityType }),
    ];
    const r = runCpm(acts, [rel('A', 'M')]);
    const m = r.byId.get('M')!;
    expect(m.early_finish).toBe(m.early_start);
  });

  it('SS+lag advances successor ES correctly', () => {
    const acts = [a('A', 10, '2026-01-05'), a('B', 5, '2026-01-05')];
    const r = runCpm(acts, [rel('A', 'B', 2, 'SS')]);
    // A.ES = Jan 5 (Mon), B.ES >= A.ES + 2wd = Jan 7
    expect(r.byId.get('B')!.early_start).toBe('2026-01-07');
  });
});
