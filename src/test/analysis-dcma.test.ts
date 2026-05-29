import { describe, it, expect } from 'vitest';
import { runDcma, dcmaSummary } from '@/lib/schedule/analysis/dcma';
import type { ActivityRelationship, ScheduleActivity } from '@/lib/schedule/types';

function act(over: Partial<ScheduleActivity>): ScheduleActivity {
  return {
    id: 'x', project_id: 'p', parent_wbs_id: null, wbs_code: 'A',
    activity_id: 'A0001', name: 'a', activity_type: 'task',
    baseline_start: null, baseline_end: null, duration_days: 5,
    percent_complete: 0, actual_start: null, actual_finish: null,
    early_start: null, early_finish: null, late_start: null, late_finish: null,
    total_float_days: 0, is_critical: false, sort_order: 0,
    pay_item_id: null, baseline_quantity: null,
    ...over,
  };
}
function rel(over: Partial<ActivityRelationship>): ActivityRelationship {
  return { id: 'r', project_id: 'p', pred_activity_id: '', succ_activity_id: '', rel_type: 'FS', lag_days: 0, ...over };
}

describe('runDcma', () => {
  it('passes Leads when no negative lags exist', () => {
    const r = runDcma({
      activities: [act({ id: 'a' }), act({ id: 'b', activity_id: 'A0002' })],
      relationships: [rel({ pred_activity_id: 'a', succ_activity_id: 'b' })],
      dataDate: '2026-05-01',
    });
    const leads = r.find(x => x.id === 'leads')!;
    expect(leads.pass).toBe(true);
  });

  it('fails Leads when a negative lag is present', () => {
    const r = runDcma({
      activities: [act({ id: 'a' }), act({ id: 'b', activity_id: 'A0002' })],
      relationships: [rel({ pred_activity_id: 'a', succ_activity_id: 'b', lag_days: -2 })],
      dataDate: '2026-05-01',
    });
    expect(r.find(x => x.id === 'leads')!.pass).toBe(false);
  });

  it('flags negative-float activities', () => {
    const r = runDcma({
      activities: [act({ id: 'a', total_float_days: -3 })],
      relationships: [],
      dataDate: '2026-05-01',
    });
    expect(r.find(x => x.id === 'negfloat')!.pass).toBe(false);
  });

  it('flags high-duration tasks > 44 days', () => {
    const r = runDcma({
      activities: [act({ id: 'a', duration_days: 60 })],
      relationships: [],
      dataDate: '2026-05-01',
    });
    expect(r.find(x => x.id === 'highdur')!.pass).toBe(false);
  });

  it('summary contains a line per check', () => {
    const r = runDcma({ activities: [], relationships: [], dataDate: null });
    const txt = dcmaSummary(r);
    expect(txt.split('\n').length).toBeGreaterThanOrEqual(14);
  });
});
