import { describe, it, expect } from 'vitest';
import { lineLength, polygonAreaSF, sfToCY, sfToSY } from '@/lib/geometry';
import type { PointXY } from '@/types/project';

describe('lineLength', () => {
  const ppf = 10; // 10 px per foot

  it('returns 0 for fewer than 2 points', () => {
    expect(lineLength([], ppf)).toBe(0);
    expect(lineLength([{ x: 0, y: 0 }], ppf)).toBe(0);
  });

  it('measures a single straight segment', () => {
    const pts: PointXY[] = [{ x: 0, y: 0 }, { x: 30, y: 40 }];
    // 3-4-5 triangle: 50 px / 10 ppf = 5 ft
    expect(lineLength(pts, ppf)).toBeCloseTo(5);
  });

  it('sums every segment of a multi-vertex polyline (regression for C-1)', () => {
    // L-shape: 3 segments of 10 px each = 30 px / 10 ppf = 3 ft
    const pts: PointXY[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ];
    expect(lineLength(pts, ppf)).toBeCloseTo(3);
    // Naive first-to-last (the bug) would return distance(0,0 -> 20,10) / 10 ≈ 2.236.
    expect(lineLength(pts, ppf)).not.toBeCloseTo(Math.hypot(20, 10) / ppf);
  });
});

describe('area conversions', () => {
  it('polygonAreaSF computes 10x10 ft square as 100 sf', () => {
    const ppf = 5;
    const square: PointXY[] = [
      { x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 },
    ];
    expect(polygonAreaSF(square, ppf)).toBeCloseTo(100);
  });

  it('sfToCY: 100 sf x 1 ft depth = 100/27 cy', () => {
    expect(sfToCY(100, 1)).toBeCloseTo(100 / 27);
  });

  it('sfToSY: 9 sf = 1 sy', () => {
    expect(sfToSY(9)).toBeCloseTo(1);
  });
});
