// L-4: smoke test for Time Impact Analysis fragnet generation.
import { describe, it, expect } from 'vitest';
import { buildTia } from '@/lib/xer/tia';
import { SAMPLE_XER } from '@/lib/xer/sample';
import { parseXer } from '@/lib/xer/parser';

describe('buildTia', () => {
  const tbl = parseXer(SAMPLE_XER);

  it('produces a fragnet and narrative for a real activity', () => {
    const first = tbl.TASK[0];
    expect(first).toBeDefined();
    const out = buildTia(tbl, {
      affectedTaskId: first.task_id,
      delayStart: '2026-03-15',
      delayDays: 7,
      cause: 'Unforecast 5-day rain event plus contaminated soil discovery.',
      type: 'Weather',
    });
    expect(out.fragnetAscii).toContain(first.task_code);
    expect(out.fragnetAscii).toMatch(/FS, lag 0/);
    expect(out.narrative).toContain('TIME IMPACT ANALYSIS');
    expect(out.fragnetCsv.split('\n').length).toBeGreaterThanOrEqual(2);
  });

  it('returns a friendly message when activity is missing', () => {
    const out = buildTia(tbl, {
      affectedTaskId: 'does-not-exist',
      delayStart: '2026-03-15',
      delayDays: 3,
      cause: 'n/a',
      type: 'Other',
    });
    expect(out.fragnetAscii).toMatch(/not found/i);
  });
});
