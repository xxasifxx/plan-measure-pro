import type { PointXY } from '@/types/project';

export function distancePx(p1: PointXY, p2: PointXY): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function lineLength(points: PointXY[], pixelsPerFoot: number): number {
  if (points.length < 2) return 0;
  return distancePx(points[0], points[1]) / pixelsPerFoot;
}

// Shoelace formula for polygon area in pixels²
export function polygonAreaPx(points: PointXY[]): number {
  if (points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

export function polygonAreaSF(points: PointXY[], pixelsPerFoot: number): number {
  return polygonAreaPx(points) / (pixelsPerFoot * pixelsPerFoot);
}

export function sfToCY(sf: number, depthFeet: number): number {
  return (sf * depthFeet) / 27;
}

export function sfToSY(sf: number): number {
  return sf / 9;
}

export function formatMeasurement(value: number, unit: string): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K ${unit}`;
  return `${value.toFixed(1)} ${unit}`;
}
