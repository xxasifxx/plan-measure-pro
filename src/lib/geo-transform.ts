/**
 * GPS-to-Plan georeferencing: affine transform, Kalman filter, coordinate conversion.
 */
import type { PointXY } from '@/types/project';

export interface GpsCoord {
  lat: number;
  lng: number;
}

export interface GeoControlPoint {
  gps: GpsCoord;
  plan: PointXY; // normalized to scale=1
}

/** 2x3 affine matrix [a, b, tx, c, d, ty] */
export type AffineMatrix = [number, number, number, number, number, number];

export interface GeoCalibration {
  controlPoints: GeoControlPoint[];
  transform: AffineMatrix;
  estimatedErrorFt: number;
}

// --- Coordinate helpers ---

const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_FT = 20_902_231; // mean radius in feet

/** Convert lat/lng to local meters relative to an origin */
export function gpsToLocalFt(origin: GpsCoord, point: GpsCoord): PointXY {
  const dLat = (point.lat - origin.lat) * DEG_TO_RAD;
  const dLng = (point.lng - origin.lng) * DEG_TO_RAD;
  const cosLat = Math.cos(origin.lat * DEG_TO_RAD);
  return {
    x: dLng * cosLat * EARTH_RADIUS_FT,
    y: dLat * EARTH_RADIUS_FT,
  };
}

// --- Affine transform ---

/** Solve 2-point affine: scale + rotation + translation (4 DOF, no skew) */
export function solveAffine2(pts: GeoControlPoint[]): AffineMatrix {
  if (pts.length < 2) throw new Error('Need at least 2 control points');
  const origin = pts[0].gps;
  const src = pts.map(p => gpsToLocalFt(origin, p.gps));
  const dst = pts.map(p => p.plan);

  // With 2 points: compute scale, rotation, translation
  const sx = src[1].x - src[0].x;
  const sy = src[1].y - src[0].y;
  const dx = dst[1].x - dst[0].x;
  const dy = dst[1].y - dst[0].y;

  const srcLen = Math.sqrt(sx * sx + sy * sy);
  const dstLen = Math.sqrt(dx * dx + dy * dy);
  if (srcLen === 0 || dstLen === 0) throw new Error('Control points are identical');

  const scale = dstLen / srcLen;
  const srcAngle = Math.atan2(sy, sx);
  const dstAngle = Math.atan2(dy, dx);
  const rotation = dstAngle - srcAngle;

  const a = scale * Math.cos(rotation);
  const b = -scale * Math.sin(rotation);
  const c = scale * Math.sin(rotation);
  const d = scale * Math.cos(rotation);

  const tx = dst[0].x - (a * src[0].x + b * src[0].y);
  const ty = dst[0].y - (c * src[0].x + d * src[0].y);

  return [a, b, tx, c, d, ty];
}

/** Solve 3-point full affine (6 DOF) using least squares */
export function solveAffine3(pts: GeoControlPoint[]): AffineMatrix {
  if (pts.length < 3) return solveAffine2(pts);
  const origin = pts[0].gps;
  const src = pts.map(p => gpsToLocalFt(origin, p.gps));
  const dst = pts.map(p => p.plan);

  // Solve via normal equations for X: [a, b, tx] and Y: [c, d, ty]
  // dst.x = a*src.x + b*src.y + tx
  // dst.y = c*src.x + d*src.y + ty
  const n = src.length;
  let Sxx = 0, Sxy = 0, Syy = 0, Sx = 0, Sy = 0;
  let Sdx = 0, Sdy = 0, Sdxx = 0, Sdxy = 0, Sdyx = 0, Sdyy = 0;

  for (let i = 0; i < n; i++) {
    Sxx += src[i].x * src[i].x;
    Sxy += src[i].x * src[i].y;
    Syy += src[i].y * src[i].y;
    Sx += src[i].x;
    Sy += src[i].y;
    Sdx += dst[i].x;
    Sdy += dst[i].y;
    Sdxx += dst[i].x * src[i].x;
    Sdxy += dst[i].x * src[i].y;
    Sdyx += dst[i].y * src[i].x;
    Sdyy += dst[i].y * src[i].y;
  }

  // [Sxx Sxy Sx] [a]   [Sdxx]
  // [Sxy Syy Sy] [b] = [Sdxy]
  // [Sx  Sy  n ] [tx]  [Sdx ]
  const det = Sxx * (Syy * n - Sy * Sy) - Sxy * (Sxy * n - Sy * Sx) + Sx * (Sxy * Sy - Syy * Sx);
  if (Math.abs(det) < 1e-12) return solveAffine2(pts.slice(0, 2));

  const solve3x3 = (r1: number, r2: number, r3: number) => {
    const x = (r1 * (Syy * n - Sy * Sy) - Sxy * (r2 * n - Sy * r3) + Sx * (r2 * Sy - Syy * r3)) / det;
    const y = (Sxx * (r2 * n - Sy * r3) - r1 * (Sxy * n - Sy * Sx) + Sx * (Sxy * r3 - r2 * Sx)) / det;
    const z = (Sxx * (Syy * r3 - r2 * Sy) - Sxy * (Sxy * r3 - r2 * Sx) + r1 * (Sxy * Sy - Syy * Sx)) / det;
    return [x, y, z] as const;
  };

  const [a, b, tx] = solve3x3(Sdxx, Sdxy, Sdx);
  const [c, d, ty] = solve3x3(Sdyx, Sdyy, Sdy);

  return [a, b, tx, c, d, ty];
}

/** Apply affine transform to a GPS coord */
export function gpsToplan(cal: GeoCalibration, gps: GpsCoord): PointXY {
  const origin = cal.controlPoints[0].gps;
  const local = gpsToLocalFt(origin, gps);
  const [a, b, tx, c, d, ty] = cal.transform;
  return {
    x: a * local.x + b * local.y + tx,
    y: c * local.x + d * local.y + ty,
  };
}

/** Estimate error in feet by back-projecting control points */
export function estimateError(cal: GeoCalibration): number {
  let totalErr = 0;
  for (const cp of cal.controlPoints) {
    const projected = gpsToplan(cal, cp.gps);
    const dx = projected.x - cp.plan.x;
    const dy = projected.y - cp.plan.y;
    totalErr += Math.sqrt(dx * dx + dy * dy);
  }
  // Average error in plan pixels — convert to rough feet estimate
  // This is approximate; actual error depends on calibration scale
  return totalErr / cal.controlPoints.length;
}

/** Build a GeoCalibration from control points */
export function buildGeoCalibration(points: GeoControlPoint[]): GeoCalibration {
  const transform = points.length >= 3 ? solveAffine3(points) : solveAffine2(points);
  const cal: GeoCalibration = { controlPoints: points, transform, estimatedErrorFt: 0 };
  cal.estimatedErrorFt = estimateError(cal);
  return cal;
}

// --- Simple Kalman filter for GPS smoothing ---

export interface KalmanState {
  lat: number;
  lng: number;
  vLat: number;
  vLng: number;
  accuracy: number;
  timestamp: number;
}

export function initKalman(gps: GpsCoord, accuracy: number, timestamp: number): KalmanState {
  return { lat: gps.lat, lng: gps.lng, vLat: 0, vLng: 0, accuracy, timestamp };
}

export function updateKalman(state: KalmanState, gps: GpsCoord, accuracy: number, timestamp: number): KalmanState {
  const dt = (timestamp - state.timestamp) / 1000; // seconds
  if (dt <= 0) return { ...state, lat: gps.lat, lng: gps.lng, accuracy, timestamp };

  // Predict
  const predLat = state.lat + state.vLat * dt;
  const predLng = state.lng + state.vLng * dt;

  // Gain (simplified)
  const gain = state.accuracy / (state.accuracy + accuracy);

  // Update
  const newLat = predLat + gain * (gps.lat - predLat);
  const newLng = predLng + gain * (gps.lng - predLng);

  return {
    lat: newLat,
    lng: newLng,
    vLat: (newLat - state.lat) / dt,
    vLng: (newLng - state.lng) / dt,
    accuracy: (1 - gain) * state.accuracy,
    timestamp,
  };
}
