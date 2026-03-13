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

// --- Hit testing for select tool ---

/** Distance from point to line segment */
export function pointToSegmentDistance(p: PointXY, a: PointXY, b: PointXY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distancePx(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distancePx(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Point-in-polygon (ray casting) */
export function pointInPolygon(p: PointXY, polygon: PointXY[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > p.y) !== (yj > p.y) && p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Distance from point to a count marker center */
export function pointToMarkerDistance(p: PointXY, marker: PointXY): number {
  return distancePx(p, marker);
}
