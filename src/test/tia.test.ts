// L-4: smoke test for Time Impact Analysis. Ensures the helper computes a
// non-negative impact and doesn't crash on minimal input. Deep behavioral
// coverage will come once the TIA UI surfaces multiple insertion strategies.
import { describe, it, expect } from 'vitest';
import { runTia } from '@/lib/xer/tia';
import { SAMPLE_XER } from '@/lib/xer/sample';
import { parseXer } from '@/lib/xer/parser';

describe('runTia', () => {
  const tbl = parseXer(SAMPLE_XER);

  it('produces a TIA result with a numeric delay impact', () => {
    const fragnet = [
      {
        task_code: 'NEW-DELAY-01',
        task_name: 'Permit Delay',
        target_drtn_hr_cnt: 80, // 10 workdays
        predecessor_codes: [tbl.TASK[0]?.task_code].filter(Boolean) as string[],
      },
    ];
    const result = runTia(tbl, fragnet);
    expect(result).toBeDefined();
    expect(typeof result.delayDays).toBe('number');
    expect(result.delayDays).toBeGreaterThanOrEqual(0);
  });

  it('returns 0 delay for an empty fragnet', () => {
    const result = runTia(tbl, []);
    expect(result.delayDays).toBe(0);
  });
});
