// L-6: regression coverage for date-utils edge cases — fractional lags and
// empty-calendar guard added in Round 2.
import { describe, it, expect } from 'vitest';
import { addWorkdays } from '@/lib/schedule/date-utils';

const STANDARD_CAL = {
  id: 'cal-1',
  project_id: 'p',
  name: 'Standard',
  is_default: true,
  hours_per_day: 8,
  workweek: { '0': 0, '1': 8, '2': 8, '3': 8, '4': 8, '5': 8, '6': 0 },
  exceptions: [],
};

const NEVER_WORKING_CAL = {
  ...STANDARD_CAL,
  workweek: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 },
};

describe('addWorkdays', () => {
  it('advances a whole number of workdays skipping weekends', () => {
    // Monday 2026-01-05 + 5 workdays → Monday 2026-01-12
    const monday = new Date('2026-01-05T00:00:00Z');
    const result = addWorkdays(monday, 5, STANDARD_CAL);
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-12');
  });

  it('rounds fractional lag up (P6-conservative)', () => {
    // 2.3 days should be treated as 3 days
    const monday = new Date('2026-01-05T00:00:00Z');
    const result = addWorkdays(monday, 2.3, STANDARD_CAL);
    // Mon + 3 workdays = Thursday
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-08');
  });

  it('returns input unchanged for 0 workdays', () => {
    const d = new Date('2026-01-05T00:00:00Z');
    const result = addWorkdays(d, 0, STANDARD_CAL);
    expect(result.toISOString()).toBe(d.toISOString());
  });

  it('does not infinite-loop on a calendar with no working days', () => {
    const start = new Date('2026-01-05T00:00:00Z');
    // Should bail out and return the start date unchanged (guard prevents hang)
    const result = addWorkdays(start, 5, NEVER_WORKING_CAL);
    expect(result instanceof Date).toBe(true);
  });
});
