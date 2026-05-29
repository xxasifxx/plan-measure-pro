// Round-trip test for the generated dev-WBS PMXML fixture.
// Honest scope: assert what src/lib/p6xml/parser.ts actually reads.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseP6Xml } from '../lib/p6xml/parser';
import { serializeP6Xml } from '../lib/p6xml/serializer';

const FIXTURE = readFileSync('public/exports/takeoffpro-dev.xml', 'utf8');
const SUMMARY = JSON.parse(readFileSync('docs/wbs-dev.activities.json', 'utf8'));

describe('takeoffpro-dev.xml (PMXML self-proof)', () => {
  const tables = parseP6Xml(FIXTURE);

  it('parses with our parser', () => {
    expect(tables.project.id).toBe('TAKEOFFPRO-DEV');
    expect(tables.project.dataDate).toBeTruthy();
    expect(tables.schemaVersion).toBe('22.12');
  });

  it('round-trips every activity in the JSON', () => {
    expect(tables.activities.length).toBe(SUMMARY.activities.length);
  });

  it('preserves status distribution from the strict scorer', () => {
    const counts = tables.activities.reduce((acc, a) => {
      acc[a.status || 'Not Started'] = (acc[a.status || 'Not Started'] || 0) + 1;
      return acc;
    }, {});
    expect(counts['Completed'] || 0).toBe(SUMMARY.totals.completed);
    expect(counts['In Progress'] || 0).toBe(SUMMARY.totals.inProgress);
    expect(counts['Not Started'] || 0).toBe(SUMMARY.totals.notStarted);
  });

  it('every Completed activity carries an ActualFinishDate', () => {
    const completed = tables.activities.filter(a => a.status === 'Completed');
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
});
