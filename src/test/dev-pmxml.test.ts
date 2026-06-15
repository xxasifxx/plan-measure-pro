// Validates the generated public/exports/takeoffpro-dev.xml against the
// shape of a real P6 Professional 17.7 export (modeled on the uploaded
// EC00620.xml reference). Catches the kinds of mistakes that previously
// caused P6's importer to reject every object: wrong namespace, missing
// top-level reference objects, missing P6 activity / WBS fields, wrong
// boolean/nil conventions, and broken Activity/Relationship references.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseP6Xml } from '../lib/p6xml/parser';

const FIXTURE = readFileSync('public/exports/takeoffpro-dev.xml', 'utf8');
const SUMMARY = JSON.parse(readFileSync('docs/wbs-dev.activities.json', 'utf8'));

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter(c => c.localName === name);
}
function childText(el: Element, name: string): string | undefined {
  return children(el, name)[0]?.textContent?.trim() || undefined;
}
function childEl(el: Element, name: string): Element | undefined {
  return children(el, name)[0];
}
function isNil(el: Element | undefined): boolean {
  if (!el) return false;
  const attr = el.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'nil') || el.getAttribute('xsi:nil');
  return attr === 'true';
}
function workHoursBetween(start: string, finish: string): number {
  let d = new Date(start);
  const end = new Date(finish);
  let total = 0;
  while (d < end) {
    if (d.getUTCDay() > 0 && d.getUTCDay() < 6) {
      const dayStart = new Date(d); dayStart.setUTCHours(8, 0, 0, 0);
      const dayEnd = new Date(d); dayEnd.setUTCHours(16, 0, 0, 0);
      const lo = Math.max(d.getTime(), dayStart.getTime());
      const hi = Math.min(end.getTime(), dayEnd.getTime());
      if (hi > lo) total += (hi - lo) / 3600000;
    }
    const next = new Date(d); next.setUTCDate(next.getUTCDate() + 1); next.setUTCHours(0, 0, 0, 0); d = next;
  }
  return total;
}

describe('takeoffpro-dev.xml (P6 Professional 17.7 export shape)', () => {
  const tables = parseP6Xml(FIXTURE);
  const root = tables.doc.documentElement;
  const project = children(root, 'Project')[0];

  it('uses the P6 Professional 17.7 namespace and schemaLocation', () => {
    expect(root.namespaceURI).toBe('http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/BusinessObjects');
    expect(tables.schemaVersion).toBe('17.7');
    const sl = root.getAttributeNS('http://www.w3.org/2001/XMLSchema-instance', 'schemaLocation') || '';
    expect(sl).toContain('P6Professional/V17.7');
  });

  it('emits the top-level reference objects P6 expects', () => {
    expect(children(root, 'Currency')).toHaveLength(1);
    expect(children(root, 'OBS')).toHaveLength(1);
    expect(children(root, 'Calendar')).toHaveLength(1);
    expect(children(root, 'Project')).toHaveLength(1);
  });

  it('Calendar is Global with the P6 Pro field set', () => {
    const cal = children(root, 'Calendar')[0];
    expect(childText(cal, 'Type')).toBe('Global');
    expect(childText(cal, 'HoursPerDay')).toBe('8');
    expect(['0','1']).toContain(childText(cal, 'IsDefault'));
    expect(childEl(cal, 'StandardWorkWeek')).toBeTruthy();
  });

  it('Project includes the required P6 Pro defaults and WBSObjectId', () => {
    for (const f of ['ActivityDefaultActivityType','ActivityDefaultCalendarObjectId',
        'ActivityDefaultDurationType','ActivityDefaultPercentCompleteType',
        'OBSObjectId','WBSCodeSeparator','WBSObjectId','GUID','Id','Name','Status','DataDate']) {
      expect(childText(project, f), f).toBeTruthy();
    }
    // WBSObjectId must point to an existing top-level WBS node in this project.
    const wbsIds = new Set(children(project, 'WBS').map(w => childText(w, 'ObjectId')));
    expect(wbsIds.has(childText(project, 'WBSObjectId')!)).toBe(true);
  });

  it('WBS nodes carry the P6 Pro export field set', () => {
    const wbs = children(project, 'WBS');
    expect(wbs.length).toBeGreaterThan(5);
    for (const w of wbs) {
      for (const f of ['Code','Name','ObjectId','OBSObjectId','ProjectObjectId','Status','SequenceNumber','GUID']) {
        expect(childText(w, f), `WBS ${childText(w,'ObjectId')}.${f}`).toBeTruthy();
      }
      // ParentObjectId must exist either as a referenced id or as xsi:nil="true".
      const parent = childEl(w, 'ParentObjectId');
      expect(parent).toBeTruthy();
      const parentTxt = parent!.textContent?.trim();
      if (!parentTxt) expect(isNil(parent)).toBe(true);
    }
  });

  it('Activities carry the P6 Pro field set with xsi:nil for absent dates', () => {
    const acts = children(project, 'Activity');
    expect(acts.length).toBe(SUMMARY.activities.length + 7); // + milestones
    for (const a of acts) {
      for (const f of ['Id','Name','ObjectId','ProjectObjectId','WBSObjectId','CalendarObjectId',
          'Status','Type','PercentCompleteType','PlannedStartDate','PlannedFinishDate',
          'PlannedDuration','RemainingDuration','AtCompletionDuration','GUID',
          'DurationType','LevelingPriority','PhysicalPercentComplete','PrimaryResourceObjectId']) {
        expect(childText(a, f) ?? (isNil(childEl(a, f)) ? 'nil' : ''), `${childText(a,'Id')}.${f}`).toBeTruthy();
      }
      // Not-Started activities must declare ActualStart/ActualFinish as xsi:nil rather than omitting them.
      if (childText(a, 'Status') === 'Not Started') {
        expect(isNil(childEl(a, 'ActualStartDate'))).toBe(true);
        expect(isNil(childEl(a, 'ActualFinishDate'))).toBe(true);
      }
      // Completed activities must carry a real ActualFinishDate.
      if (childText(a, 'Status') === 'Completed') {
        expect(childText(a, 'ActualFinishDate')).toBeTruthy();
      }
    }
  });

  it('Percent values use the P6 Pro fractional convention (0..1)', () => {
    for (const a of children(project, 'Activity')) {
      const pct = Number(childText(a, 'PhysicalPercentComplete') || '0');
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(1);
    }
  });

  it('Every Activity references an existing WBS, Calendar, and the Project', () => {
    const projectOid = childText(project, 'ObjectId')!;
    const wbsIds = new Set(children(project, 'WBS').map(w => childText(w, 'ObjectId')!));
    const calIds = new Set(children(root, 'Calendar').map(c => childText(c, 'ObjectId')!));
    for (const a of children(project, 'Activity')) {
      expect(childText(a, 'ProjectObjectId')).toBe(projectOid);
      expect(wbsIds.has(childText(a, 'WBSObjectId')!)).toBe(true);
      expect(calIds.has(childText(a, 'CalendarObjectId')!)).toBe(true);
    }
  });

  it('Every Relationship references emitted activities and the Project', () => {
    const projectOid = childText(project, 'ObjectId')!;
    const actIds = new Set(children(project, 'Activity').map(a => childText(a, 'ObjectId')!));
    const rels = children(project, 'Relationship');
    expect(rels.length).toBeGreaterThan(0);
    for (const r of rels) {
      expect(childText(r, 'Type')).toBe('Finish to Start');
      expect(childText(r, 'PredecessorProjectObjectId')).toBe(projectOid);
      expect(childText(r, 'SuccessorProjectObjectId')).toBe(projectOid);
      expect(actIds.has(childText(r, 'PredecessorActivityObjectId')!)).toBe(true);
      expect(actIds.has(childText(r, 'SuccessorActivityObjectId')!)).toBe(true);
    }
  });

  it('FS relationships do not contradict emitted StartDate/FinishDate chronology', () => {
    const byOid = new Map(children(project, 'Activity').map(a => [childText(a, 'ObjectId')!, a]));
    for (const r of children(project, 'Relationship')) {
      const pred = byOid.get(childText(r, 'PredecessorActivityObjectId')!)!;
      const succ = byOid.get(childText(r, 'SuccessorActivityObjectId')!)!;
      const predFinish = new Date(childText(pred, 'FinishDate')!).getTime();
      const succStart = new Date(childText(succ, 'StartDate')!).getTime();
      expect(succStart, `${childText(pred, 'Id')} → ${childText(succ, 'Id')}`).toBeGreaterThanOrEqual(predFinish);
    }
  });

  it('No inline UDF objects (they crash the Mercury importer in this shape)', () => {
    expect(root.getElementsByTagNameNS('*','UDFType').length).toBe(0);
    expect(root.getElementsByTagNameNS('*','UDF').length).toBe(0);
    expect(root.getElementsByTagNameNS('*','UDFValue').length).toBe(0);
  });

  it('Status distribution matches the source summary', () => {
    const leaves = tables.activities.filter(a => !/^M\d+$/.test(a.id));
    const counts: Record<string, number> = {};
    for (const a of leaves) counts[a.status || 'Not Started'] = (counts[a.status || 'Not Started'] || 0) + 1;
    expect(counts['Completed'] || 0).toBe(SUMMARY.totals.completed);
    expect(counts['In Progress'] || 0).toBe(SUMMARY.totals.inProgress);
    expect(counts['Not Started'] || 0).toBe(SUMMARY.totals.notStarted);
  });

  it('All emitted datetimes land on a Mon-Fri workday between 08:00 and 16:00', () => {
    const dateFields = ['ActualStartDate','ActualFinishDate','PlannedStartDate','PlannedFinishDate','StartDate','FinishDate'];
    for (const a of children(project, 'Activity')) {
      for (const f of dateFields) {
        const t = childText(a, f); if (!t) continue;
        const d = new Date(t);
        const dow = d.getUTCDay();
        const h = d.getUTCHours(), m = d.getUTCMinutes();
        expect(dow, `${childText(a,'Id')}.${f} weekday`).toBeGreaterThan(0);
        expect(dow, `${childText(a,'Id')}.${f} weekday`).toBeLessThan(6);
        const minuteOfDay = h*60+m;
        expect(minuteOfDay, `${childText(a,'Id')}.${f} workhours`).toBeGreaterThanOrEqual(8*60);
        expect(minuteOfDay, `${childText(a,'Id')}.${f} workhours`).toBeLessThanOrEqual(16*60);
      }
    }
  });

  it('Activity chronology obeys status invariants relative to the data date', () => {
    const dataDate = new Date(childText(project, 'DataDate')!);
    for (const a of children(project, 'Activity')) {
      const status = childText(a, 'Status');
      const asd = childText(a, 'ActualStartDate');
      const afd = childText(a, 'ActualFinishDate');
      const id = childText(a, 'Id')!;
      if (status === 'Not Started') {
        expect(isNil(childEl(a, 'ActualStartDate')), `${id} not-started actuals`).toBe(true);
        expect(isNil(childEl(a, 'ActualFinishDate')), `${id} not-started actuals`).toBe(true);
      } else if (status === 'Completed') {
        expect(asd, `${id} completed start`).toBeTruthy();
        expect(afd, `${id} completed finish`).toBeTruthy();
        const s = new Date(asd!), f = new Date(afd!);
        expect(f.getTime(), `${id} finish > start`).toBeGreaterThan(s.getTime());
        expect(f.getTime(), `${id} finish <= data date`).toBeLessThanOrEqual(dataDate.getTime());
      } else if (status === 'In Progress') {
        expect(asd, `${id} in-progress start`).toBeTruthy();
        expect(isNil(childEl(a, 'ActualFinishDate')), `${id} in-progress finish`).toBe(true);
        expect(new Date(asd!).getTime(), `${id} start <= data date`).toBeLessThanOrEqual(dataDate.getTime());
        expect(Number(childText(a, 'ActualDuration') || '0'), `${id} actual duration > 0`).toBeGreaterThan(0);
        expect(Number(childText(a, 'RemainingDuration') || '0'), `${id} remaining > 0`).toBeGreaterThan(0);
        const pf = new Date(childText(a, 'PlannedFinishDate')!);
        expect(pf.getTime(), `${id} planned finish > data date`).toBeGreaterThan(dataDate.getTime());
      }
    }
  });

  it('task activity durations match emitted planned and actual work windows', () => {
    for (const a of children(project, 'Activity')) {
      if (childText(a, 'Type') !== 'Task Dependent') continue;
      const id = childText(a, 'Id')!;
      const plannedH = Number(childText(a, 'PlannedDuration') || '0');
      const plannedWindowH = workHoursBetween(childText(a, 'PlannedStartDate')!, childText(a, 'PlannedFinishDate')!);
      expect(Math.abs(plannedWindowH - plannedH), `${id} planned duration/window`).toBeLessThan(0.01);
      if (childText(a, 'Status') === 'Completed') {
        const actualH = Number(childText(a, 'ActualDuration') || '0');
        const actualWindowH = workHoursBetween(childText(a, 'ActualStartDate')!, childText(a, 'ActualFinishDate')!);
        expect(Math.abs(actualWindowH - actualH), `${id} actual duration/window`).toBeLessThan(0.01);
      }
    }
  });
});
