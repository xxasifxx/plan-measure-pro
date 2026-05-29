// L-6: regression coverage for date-utils — fractional lags + empty-calendar guard.
import { describe, it, expect } from 'vitest';
import { addWorkdays } from '@/lib/schedule/date-utils';

const STANDARD = new Set([1, 2, 3, 4, 5]);
const EMPTY = new Set<number>();

describe('addWorkdays', () => {
  it('advances whole workdays skipping weekends', () => {
    // Monday 2026-01-05 + 5 workdays → Monday 2026-01-12
    expect(addWorkdays('2026-01-05', 5, STANDARD)).toBe('2026-01-12');
  });

  it('rounds fractional lag up (P6-conservative)', () => {
    // Mon + 2.3 workdays → ceil(2.3)=3 → Thu 2026-01-08
    expect(addWorkdays('2026-01-05', 2.3, STANDARD)).toBe('2026-01-08');
  });

  it('returns same date for 0 workdays', () => {
    expect(addWorkdays('2026-01-05', 0, STANDARD)).toBe('2026-01-05');
  });

  it('throws on a calendar with no working days', () => {
    expect(() => addWorkdays('2026-01-05', 5, EMPTY)).toThrow(/no working days/);
  });
});
