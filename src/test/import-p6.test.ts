import { describe, it, expect } from 'vitest';
import { importFromPmxml } from '@/lib/schedule/import-p6';
import { SAMPLE_P6_XML } from '@/lib/p6xml/sample';

describe('importFromPmxml', () => {
  const imp = importFromPmxml(SAMPLE_P6_XML);

  it('parses activities and converts hours to days', () => {
    const tasks = imp.activities.filter(a => a.activity_type !== 'wbs');
    expect(tasks.length).toBeGreaterThan(0);
    for (const a of tasks) {
      expect(typeof a.duration_days).toBe('number');
    }
  });

  it('exposes counts + data_date', () => {
    expect(imp.counts.tasks).toBeGreaterThan(0);
    expect(imp.meta.data_date).toBeTruthy();
  });
});
