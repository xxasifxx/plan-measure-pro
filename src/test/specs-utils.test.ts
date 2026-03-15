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
  it('indexes pages where SECTION heading matches dominant subsection prefix', () => {
    const pages = new Map<number, string>();
    // Real section 202 page: heading + dominant 202.xx markers
    pages.set(50, 'SECTION 202 REMOVAL OF STRUCTURES 202.01 Description 202.02 Materials ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(50);
  });

  it('skips cross-references where another section dominates', () => {
    const pages = new Map<number, string>();
    // Page 68 is in section 157: mentions "Section 202" but subsections are 157.xx
    pages.set(68, 'shall comply with Section 202 requirements. 157.01 Description 157.02 Materials 157.03 Construction ' + 'word '.repeat(100));
    // Real section 202 starts later
    pages.set(120, 'SECTION 202 REMOVAL OF STRUCTURES 202.01 Description 202.02 Materials ' + 'word '.repeat(100));

    const index = buildSectionPageIndex(pages);
    // Should NOT pick page 68 (cross-reference), should pick page 120
    expect(index.get(202)).toBe(120);
    expect(index.has(157)).toBe(false); // no "SECTION 157" heading
  });

  it('skips TOC pages with 5+ distinct section prefixes', () => {
    const pages = new Map<number, string>();
    pages.set(5, 'SECTION 201 ... 201.01 202.01 203.01 204.01 205.01 ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.has(201)).toBe(false);
  });

  it('skips pages with too few words', () => {
    const pages = new Map<number, string>();
    pages.set(10, 'SECTION 305 short text');
    const index = buildSectionPageIndex(pages);
    expect(index.has(305)).toBe(false);
  });

  it('picks first valid occurrence for a section', () => {
    const pages = new Map<number, string>();
    pages.set(100, 'SECTION 401 DESCRIPTION 401.01 Materials 401.02 ' + 'word '.repeat(100));
    pages.set(105, 'SECTION 401 continued 401.05 requirements 401.06 ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.get(401)).toBe(100);
  });

  it('allows section heading on page with no subsection markers', () => {
    const pages = new Map<number, string>();
    // Some sections start with just the heading and title, no subsection numbers yet
    pages.set(200, 'SECTION 601 ELECTRICAL WORK General requirements for all electrical ' + 'word '.repeat(80));
    const index = buildSectionPageIndex(pages);
    expect(index.get(601)).toBe(200);
  });
});
