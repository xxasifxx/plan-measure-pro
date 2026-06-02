// Round-trip test for the generated dev-WBS PMXML fixture.
// Honest scope: assert what src/lib/p6xml/parser.ts actually reads.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseP6Xml } from '../lib/p6xml/parser';
import { serializeP6Xml } from '../lib/p6xml/serializer';

const FIXTURE = readFileSync('public/exports/takeoffpro-dev.xml', 'utf8');
const SUMMARY = JSON.parse(readFileSync('docs/wbs-dev.activities.json', 'utf8'));

function children(el: Element, name: string): Element[] {
  return Array.from(el.children).filter(c => c.localName === name);
}

function childText(el: Element, name: string): string | undefined {
  return children(el, name)[0]?.textContent?.trim() || undefined;
}

describe('takeoffpro-dev.xml (PMXML self-proof)', () => {
  const tables = parseP6Xml(FIXTURE);

  it('parses with our parser', () => {
    expect(tables.project.id).toBe('TAKEOFFPRO-DEV');
    expect(tables.project.dataDate).toBeTruthy();
    expect(tables.schemaVersion).toBe('8.4');
  });

  // M0..M6 are phase milestones emitted in addition to the dev-WBS leaves.
  const leafActivities = tables.activities.filter(a => !/^M\d+$/.test(a.id));

  it('round-trips every activity in the JSON', () => {
    expect(leafActivities.length).toBe(SUMMARY.activities.length);
  });

  it('preserves status distribution from the strict scorer', () => {
    const counts = leafActivities.reduce((acc, a) => {
      acc[a.status || 'Not Started'] = (acc[a.status || 'Not Started'] || 0) + 1;
      return acc;
    }, {});
    expect(counts['Completed'] || 0).toBe(SUMMARY.totals.completed);
    expect(counts['In Progress'] || 0).toBe(SUMMARY.totals.inProgress);
    expect(counts['Not Started'] || 0).toBe(SUMMARY.totals.notStarted);
  });

  it('every Completed activity carries an ActualFinishDate', () => {
    const completed = leafActivities.filter(a => a.status === 'Completed');
    for (const a of completed) {
      expect(a.actualFinishDate, `activity ${a.id} ${a.name}`).toBeTruthy();
    }
  });

  it('serializes back to a byte-stable form (idempotent)', () => {
    const out1 = serializeP6Xml(tables);
    const reparsed = parseP6Xml(out1);
    const out2 = serializeP6Xml(reparsed);
    expect(out2).toBe(out1);
  });

  it('emits a P6-safe project graph without inline UDF objects', () => {
    const root = tables.doc.documentElement;
    const projects = children(root, 'Project');
    const project = projects[0];
    expect(projects).toHaveLength(1);
    expect(children(root, 'UDFType')).toHaveLength(0);
    expect(children(project, 'UDFType')).toHaveLength(0);
    expect(root.getElementsByTagNameNS('*', 'UDF')).toHaveLength(0);
    expect(root.getElementsByTagNameNS('*', 'UDFValue')).toHaveLength(0);
  });

  it('all generated activities reference existing WBS and calendar ids', () => {
    const root = tables.doc.documentElement;
    const project = children(root, 'Project')[0];
    const projectOid = childText(project, 'ObjectId');
    const calendarIds = new Set([
      ...children(root, 'Calendar'),
      ...children(project, 'Calendar'),
    ].map(c => childText(c, 'ObjectId')).filter(Boolean));
    const wbsIds = new Set(children(project, 'WBS').map(w => childText(w, 'ObjectId')).filter(Boolean));
    expect(projectOid).toBeTruthy();
    expect(calendarIds.size).toBeGreaterThan(0);
    expect(wbsIds.size).toBeGreaterThan(0);

    for (const a of children(project, 'Activity')) {
      expect(childText(a, 'ProjectObjectId')).toBe(projectOid);
      expect(wbsIds.has(childText(a, 'WBSObjectId'))).toBe(true);
      expect(calendarIds.has(childText(a, 'CalendarObjectId'))).toBe(true);
      expect(childText(a, 'PlannedStartDate')).toBeTruthy();
      expect(childText(a, 'PlannedFinishDate')).toBeTruthy();
    }
  });

  it('all generated relationships reference emitted activities', () => {
    const project = children(tables.doc.documentElement, 'Project')[0];
    const projectOid = childText(project, 'ObjectId');
    const activityIds = new Set(children(project, 'Activity').map(a => childText(a, 'ObjectId')).filter(Boolean));
    expect(activityIds.size).toBe(SUMMARY.activities.length + 7);

    for (const r of children(project, 'Relationship')) {
      expect(childText(r, 'PredecessorProjectObjectId')).toBe(projectOid);
      expect(childText(r, 'SuccessorProjectObjectId')).toBe(projectOid);
      expect(activityIds.has(childText(r, 'PredecessorActivityObjectId'))).toBe(true);
      expect(activityIds.has(childText(r, 'SuccessorActivityObjectId'))).toBe(true);
    }
  });
});
