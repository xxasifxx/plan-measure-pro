import { describe, it, expect } from 'vitest';
import { parseXer } from '@/lib/xer/parser';
import { SAMPLE_XER } from '@/lib/xer/sample';
import { SAMPLE_XER_UPDATE } from '@/lib/xer/sample-update';

describe('parseXer', () => {
  it('parses the embedded baseline sample (regression: tag separator)', () => {
    const t = parseXer(SAMPLE_XER);
    expect(t.PROJECT.length).toBeGreaterThan(0);
    expect(t.TASK.length).toBeGreaterThan(10);
    expect(t.PROJWBS.length).toBeGreaterThan(0);
    expect(t.TASKPRED.length).toBeGreaterThan(0);
  });

  it('parses the embedded 60-day update sample', () => {
    const t = parseXer(SAMPLE_XER_UPDATE);
    expect(t.TASK.length).toBeGreaterThan(10);
  });

  it('tolerates tab separator after the tag', () => {
    const xer = ['%T\tPROJECT', '%F\tproj_id\tproj_short_name', '%R\t1\tFOO'].join('\n');
    const t = parseXer(xer);
    expect(t.PROJECT[0]?.proj_short_name).toBe('FOO');
  });
});
