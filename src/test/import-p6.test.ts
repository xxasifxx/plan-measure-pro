import { describe, it, expect } from 'vitest';
import { importFromXer, importFromPmxml } from '@/lib/schedule/import-p6';
import { SAMPLE_XER } from '@/lib/xer/sample';
import { SAMPLE_P6_XML } from '@/lib/p6xml/sample';

describe('importFromXer', () => {
  const imp = importFromXer(SAMPLE_XER);

  it('maps WBS with parent linkage via ext_ids', () => {
    const wbs = imp.activities.filter(a => a.activity_type === 'wbs');
    expect(wbs.length).toBeGreaterThan(0);
    const root = wbs.find(w => !w.parent_ext_id);
    expect(root).toBeTruthy();
    const child = wbs.find(w => w.parent_ext_id);
    expect(child).toBeTruthy();
    expect(child!.parent_ext_id!.startsWith('W:')).toBe(true);
  });

  it('converts task hours to workdays (hr/8)', () => {
    const mob = imp.activities.find(a => a.activity_id === 'A1010');
    expect(mob).toBeTruthy();
    expect(mob!.duration_days).toBe(80 / 8);
  });

  it('detects milestones', () => {
    const ms = imp.activities.find(a => a.activity_id === 'M100');
    expect(ms?.activity_type).toBe('start_milestone');
    expect(ms?.duration_days).toBe(0);
  });

  it('maps relationships with proper type + lag in days', () => {
    expect(imp.relationships.length).toBeGreaterThan(0);
    for (const r of imp.relationships) {
      expect(['FS', 'SS', 'FF', 'SF']).toContain(r.rel_type);
      expect(typeof r.lag_days).toBe('number');
    }
  });

  it('exposes counts + data_date', () => {
    expect(imp.counts.tasks).toBeGreaterThan(10);
    expect(imp.counts.wbs).toBeGreaterThan(0);
    expect(imp.meta.data_date).toBeTruthy();
  });
});

describe('importFromPmxml', () => {
  const imp = importFromPmxml(SAMPLE_P6_XML);
  it('parses activities and converts hours to days', () => {
    expect(imp.activities.filter(a => a.activity_type !== 'wbs').length).toBeGreaterThan(0);
    for (const a of imp.activities.filter(x => x.activity_type !== 'wbs')) {
      expect(typeof a.duration_days).toBe('number');
    }
  });
});
