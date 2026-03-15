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
  it('indexes pages with "SECTION NNN - TITLE" headings and matching subsections', () => {
    const pages = new Map<number, string>();
    pages.set(50, 'SECTION 202 - REMOVAL OF STRUCTURES 202.01 Description 202.02 Materials ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(50);
  });

  it('skips inline cross-references like "in accordance with Section 202"', () => {
    const pages = new Map<number, string>();
    // Page in section 157 that mentions section 202 inline (no dash/title)
    pages.set(68, 'shall comply with Section 202 requirements. 157.01 Description 157.02 Materials 157.03 Construction ' + 'word '.repeat(100));
    // Real section 202 starts later with proper heading format
    pages.set(120, 'SECTION 202 - REMOVAL OF STRUCTURES AND OBSTRUCTIONS 202.01 Description 202.02 Materials ' + 'word '.repeat(100));

    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(120);
  });

  it('skips cross-references even when no subsection markers present', () => {
    const pages = new Map<number, string>();
    // Prose page mentioning "Section 202" without heading format
    pages.set(68, 'The contractor shall comply with Section 202 for all removal work and ensure ' + 'word '.repeat(100));
    pages.set(120, 'SECTION 202 – REMOVAL OF STRUCTURES 202.01 Description ' + 'word '.repeat(100));

    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(120);
  });

  it('skips TOC pages with 5+ distinct section prefixes', () => {
    const pages = new Map<number, string>();
    pages.set(5, 'SECTION 201 - FOO 201.01 202.01 203.01 204.01 205.01 ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.has(201)).toBe(false);
  });

  it('skips pages with too few words', () => {
    const pages = new Map<number, string>();
    pages.set(10, 'SECTION 305 - PAVEMENT short');
    const index = buildSectionPageIndex(pages);
    expect(index.has(305)).toBe(false);
  });

  it('picks first valid occurrence for a section', () => {
    const pages = new Map<number, string>();
    pages.set(100, 'SECTION 401 - STRUCTURES 401.01 Materials 401.02 ' + 'word '.repeat(100));
    pages.set(105, 'SECTION 401 - STRUCTURES continued 401.05 requirements 401.06 ' + 'word '.repeat(100));
    const index = buildSectionPageIndex(pages);
    expect(index.get(401)).toBe(100);
  });

  it('handles em-dash and en-dash in heading format', () => {
    const pages = new Map<number, string>();
    pages.set(200, 'SECTION 601 – ELECTRICAL WORK General requirements for all electrical ' + 'word '.repeat(80));
    const index = buildSectionPageIndex(pages);
    expect(index.get(601)).toBe(200);
  });
});
