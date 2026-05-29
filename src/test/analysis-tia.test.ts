import { describe, it, expect } from 'vitest';
import { buildTia } from '@/lib/schedule/analysis/tia';
import type { ActivityRelationship, ScheduleActivity } from '@/lib/schedule/types';

const base = (over: Partial<ScheduleActivity>): ScheduleActivity => ({
  id: 'x', project_id: 'p', parent_wbs_id: null, wbs_code: 'A',
  activity_id: 'A0001', name: 'Activity', activity_type: 'task',
  baseline_start: null, baseline_end: null, duration_days: 5,
  percent_complete: 0, actual_start: null, actual_finish: null,
  early_start: null, early_finish: null, late_start: null, late_finish: null,
  total_float_days: 0, is_critical: false, sort_order: 0,
  pay_item_id: null, baseline_quantity: null,
  ...over,
});

describe('buildTia', () => {
  const acts = [
    base({ id: 'a', activity_id: 'A1010', name: 'Deck Demo' }),
    base({ id: 'b', activity_id: 'A1020', name: 'Form Deck' }),
  ];
  const rels: ActivityRelationship[] = [
    { id: 'r1', project_id: 'p', pred_activity_id: 'a', succ_activity_id: 'b', rel_type: 'FS', lag_days: 0 },
  ];

  it('returns not-found message for unknown activity', () => {
    const out = buildTia(acts, rels, {
      affectedActivityId: 'zzz', delayStart: '2026-05-01', delayDays: 5,
      cause: 'rain', type: 'Weather',
    });
    expect(out.fragnetAscii).toMatch(/not found/i);
  });

  it('produces fragnet, narrative, and CSV for a valid activity', () => {
    const out = buildTia(acts, rels, {
      affectedActivityId: 'a', delayStart: '2026-05-01', delayDays: 7,
      cause: 'severe storm', type: 'Weather', projectName: 'NJTA-104',
    });
    expect(out.fragnetAscii).toContain('A1010');
    expect(out.fragnetAscii).toContain('DLY-A1010');
    expect(out.fragnetAscii).toContain('A1020');
    expect(out.narrative).toContain('NJTA-104');
    expect(out.narrative).toContain('7 working day');
    expect(out.fragnetCsv.split('\n')[0]).toBe(
      'activity_code,activity_name,duration_days,predecessor,relationship,lag_days',
    );
    expect(out.fragnetCsv).toContain('DLY-A1010');
  });

  it('singular day phrasing for 1-day delays', () => {
    const out = buildTia(acts, rels, {
      affectedActivityId: 'a', delayStart: '2026-05-01', delayDays: 1,
      cause: 'x', type: 'Other',
    });
    expect(out.fragnetAscii).toContain('1 working day');
    expect(out.fragnetAscii).not.toContain('1 working days');
  });
});
