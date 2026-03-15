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
  it('indexes pages with SECTION headings and substantial content', () => {
    const pages = new Map<number, string>();
    pages.set(50, 'SECTION 202 REMOVAL OF STRUCTURES 202.01 Description This work consists of ' + 'word '.repeat(150));
    pages.set(5, '201.01 ... 202.01 ... 203.01 ... 204.01 ... ' + 'word '.repeat(100));

    const index = buildSectionPageIndex(pages);
    expect(index.get(202)).toBe(50);
    // TOC page skipped (3+ distinct sections)
    expect(index.has(201)).toBe(false);
  });

  it('skips pages with too few words', () => {
    const pages = new Map<number, string>();
    pages.set(10, 'SECTION 305 short text');
    const index = buildSectionPageIndex(pages);
    expect(index.has(305)).toBe(false);
  });

  it('picks first occurrence for a section', () => {
    const pages = new Map<number, string>();
    pages.set(100, 'SECTION 401 DESCRIPTION 401.01 ' + 'word '.repeat(150));
    pages.set(105, 'SECTION 401 continued 401.05 ' + 'word '.repeat(150));
    const index = buildSectionPageIndex(pages);
    expect(index.get(401)).toBe(100);
  });
});
