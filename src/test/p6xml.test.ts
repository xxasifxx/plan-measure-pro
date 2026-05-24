import { describe, it, expect } from 'vitest';
import { parseP6Xml } from '@/lib/p6xml/parser';
import { serializeP6Xml } from '@/lib/p6xml/serializer';
import { applyDailyReportsToP6 } from '@/lib/p6xml/apply-progress';
import { SAMPLE_P6_XML, SAMPLE_DAILY_REPORTS } from '@/lib/p6xml/sample';

describe('p6xml parser', () => {
  it('parses sample APIBusinessObjects with project + activities', () => {
    const t = parseP6Xml(SAMPLE_P6_XML);
    expect(t.project.id).toBe('NJTA-104-0001');
    expect(t.activities.length).toBe(6);
    const a1020 = t.activities.find(a => a.id === 'A1020');
    expect(a1020?.physicalPctComplete).toBe(40);
    expect(t.schemaVersion).toBe('22.12');
  });

  it('round-trips semantically when no edits applied', () => {
    const t = parseP6Xml(SAMPLE_P6_XML);
    const out = serializeP6Xml(t);
    const t2 = parseP6Xml(out);
    expect(t2.project.id).toBe(t.project.id);
    expect(t2.activities.map(a => a.id)).toEqual(t.activities.map(a => a.id));
  });
});

describe('applyDailyReportsToP6', () => {
  it('marks Not-Started → In Progress and sets ActualStart from first report', () => {
    const t = parseP6Xml(SAMPLE_P6_XML);
    const { changeLog } = applyDailyReportsToP6(t, SAMPLE_DAILY_REPORTS.filter(r => r.activityId === 'A1030'));
    const c = changeLog.find(c => c.activityId === 'A1030')!;
    expect(c.beforeStatus).toBe('Not Started');
    expect(c.afterStatus).toBe('In Progress');
    expect(c.actualStartSet).toBeTruthy();
    expect(c.afterPct).toBeGreaterThan(0);
    expect(c.afterPct).toBeLessThan(100);
  });

  it('marks isComplete → Completed with ActualFinish + zero remaining', () => {
    const t = parseP6Xml(SAMPLE_P6_XML);
    const { changeLog } = applyDailyReportsToP6(t, SAMPLE_DAILY_REPORTS.filter(r => r.activityId === 'A1020'));
    const c = changeLog.find(c => c.activityId === 'A1020')!;
    expect(c.afterStatus).toBe('Completed');
    expect(c.afterPct).toBe(100);
    expect(c.afterRemainHr).toBe(0);
    expect(c.actualFinishSet).toBeTruthy();
  });

  it('is idempotent on re-apply', () => {
    const t = parseP6Xml(SAMPLE_P6_XML);
    applyDailyReportsToP6(t, SAMPLE_DAILY_REPORTS);
    const xml1 = serializeP6Xml(t);
    const t2 = parseP6Xml(xml1);
    applyDailyReportsToP6(t2, SAMPLE_DAILY_REPORTS);
    const xml2 = serializeP6Xml(t2);
    expect(xml2).toBe(xml1);
  });

  it('bumps project DataDate to latest report date', () => {
    const t = parseP6Xml(SAMPLE_P6_XML);
    const { newDataDate } = applyDailyReportsToP6(t, SAMPLE_DAILY_REPORTS);
    expect(newDataDate.startsWith('2026-05-18')).toBe(true);
  });
});
