import { describe, it, expect } from 'vitest';
import { normalizeActivityPatch } from '@/lib/schedule/baseline';

const wd = new Set([1, 2, 3, 4, 5]);

describe('normalizeActivityPatch', () => {
  it('derives baseline_end when duration changes', () => {
    const out = normalizeActivityPatch(
      { baseline_start: '2026-01-05', duration_days: 5 },
      { duration_days: 10 },
      wd,
    );
    expect(out.baseline_end).toBe('2026-01-19'); // Mon Jan 5 + 10 workdays
  });

  it('honors manual_finish lock', () => {
    const out = normalizeActivityPatch(
      { baseline_start: '2026-01-05', baseline_end: '2026-02-28', duration_days: 5, manual_finish: true },
      { duration_days: 10 },
      wd,
    );
    expect(out.baseline_end).toBeUndefined();
  });

  it('forces milestone duration to 0', () => {
    const out = normalizeActivityPatch(
      { duration_days: 5 },
      { activity_type: 'finish_milestone' },
      wd,
    );
    expect(out.duration_days).toBe(0);
  });

  it('actual_finish sets percent to 100 and remaining to 0', () => {
    const out = normalizeActivityPatch(
      { baseline_start: '2026-01-05', duration_days: 10, percent_complete: 40 },
      { actual_finish: '2026-01-19' },
      wd,
    );
    expect(out.percent_complete).toBe(100);
    expect(out.remaining_duration_days).toBe(0);
  });

  it('percent_complete recomputes remaining', () => {
    const out = normalizeActivityPatch(
      { duration_days: 10, percent_complete: 0 },
      { percent_complete: 25 },
      wd,
    );
    expect(out.remaining_duration_days).toBe(7.5);
  });
});
