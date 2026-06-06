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
          'DurationType','LevelingPriority','PhysicalPercentComplete']) {
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
});
