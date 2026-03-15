// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getSectionFromItemCode, buildSectionPageIndex } from '@/lib/specs-utils';

describe('getSectionFromItemCode', () => {
  it('extracts 3-digit section from standard codes', () => {
    expect(getSectionFromItemCode('202-0002')).toBe(202);
    expect(getSectionFromItemCode('510-N0059')).toBe(510);
    expect(getSectionFromItemCode('108-N0002')).toBe(108);
  });

  it('returns null for invalid codes', () => {
    expect(getSectionFromItemCode('AB-1234')).toBeNull();
    expect(getSectionFromItemCode('')).toBeNull();
  });
});

describe('buildSectionPageIndex', () => {
  it('indexes pages with SECTION NNN heading and NNN.01 subsection', () => {
    const pages = new Map<number, string>();
    pages.set(50, 'SECTION 202 REMOVAL OF STRUCTURES 202.01 Description 202.02 Materials ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(50);
  });

  it('skips cross-references without NNN.01 on the same page', () => {
    const pages = new Map<number, string>();
    // Page 68: section 157 text mentions "Section 202" but no 202.01
    pages.set(68, 'shall comply with Section 202 requirements. 157.01 Description 157.02 Materials 157.03 Construction ' + 'word '.repeat(100));
    // Real section 202 page has both heading and 202.01
    pages.set(120, 'SECTION 202 REMOVAL OF STRUCTURES 202.01 Description 202.02 Materials ' + 'word '.repeat(100));

    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(120);
  });

  it('skips prose-only cross-references', () => {
    const pages = new Map<number, string>();
    pages.set(68, 'The contractor shall comply with Section 202 for all removal work and ensure ' + 'word '.repeat(100));
    pages.set(120, 'SECTION 202 REMOVAL 202.01 Description ' + 'word '.repeat(100));

    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(120);
  });

  it('skips TOC pages with 5+ distinct section prefixes', () => {
    const pages = new Map<number, string>();
    pages.set(5, 'SECTION 201 FOO 201.01 202.01 203.01 204.01 205.01 ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.has(201)).toBe(false);
  });

  it('skips pages with too few words', () => {
    const pages = new Map<number, string>();
    pages.set(10, 'SECTION 305 PAVEMENT 305.01 short');
    const index = buildSectionPageIndex(pages);
    expect(index.has(305)).toBe(false);
  });

  it('picks first valid occurrence for a section', () => {
    const pages = new Map<number, string>();
    pages.set(100, 'SECTION 401 STRUCTURES 401.01 Materials 401.02 ' + 'word '.repeat(100));
    pages.set(105, 'SECTION 401 STRUCTURES continued 401.01 ref 401.05 ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.get(401)).toBe(100);
  });
});
