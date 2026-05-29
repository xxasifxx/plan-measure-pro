---
stream_key: 14-measurement-and-geometry-engine
paths:
  - src/lib/geometry.ts
  - src/lib/geo-transform.ts
  - src/components/GpsCalibration.tsx
  - src/components/GpsTraceControls.tsx
shared_paths:
  - src/components/PdfCanvas.tsx
  - src/hooks/useProject.ts
---
# Measurement and Geometry Engine

## Purpose
Provides all mathematical primitives that convert inspector-drawn annotations on PDF plan sheets into real-world quantities: pixel-distance to linear feet, pixel-polygon area to SF/SY/CY, point-in-polygon hit testing, GPS↔plan georeferencing via affine transform with Kalman smoothing, and scale calibration. The computational core every annotation, export, and KPI number flows through.

## Surfaces (files)
- `src/lib/geometry.ts` — `distancePx`, `lineLength`, `polygonAreaPx`, `polygonAreaSF`, `sfToCY`, `sfToSY`, `formatMeasurement`, `pointToSegmentDistance`, `pointInPolygon`, `pointToMarkerDistance`
- `src/lib/geo-transform.ts` — `gpsToLocalFt`, `solveAffine2`, `solveAffine3` (least-squares), `gpsToplan`, `estimateError`, `buildGeoCalibration`, `initKalman`, `updateKalman`; types `GeoControlPoint`, `AffineMatrix`, `GeoCalibration`, `KalmanState`
- `src/components/GpsCalibration.tsx` — UI for placing 2–3 GPS control points with transform-error preview
- `src/components/GpsTraceControls.tsx` — field GPS trace capture with Kalman-filtered position
- `src/components/PdfCanvas.tsx` — annotation canvas: renders annotations, drag-vertex editing, label leader lines, zoom-independent coordinates
- `src/hooks/useProject.ts` — loads `calibrations` and `geo_calibrations`; owns `pixelsPerFoot`
- **Tables**: `calibrations` (two-point scale), `geo_calibrations` (GPS↔plan control points), `annotations` (stored with normalized `measurement` in real-world units)

## Acceptance criteria
1. After two-point calibration, a polyline `measurement` equals pixel length divided by `pixelsPerFoot`.
2. `polygonAreaSF` returns shoelace area in SF; `sfToCY(area, depth)` = `area * depth / 27`; `sfToSY(area)` = `area / 9`.
3. `pointInPolygon` correctly classifies inside/outside via ray-casting.
4. With 2 GPS control points, `solveAffine2` round-trips each control point's `plan` coordinate to floating-point precision.
5. With 3+ control points, `solveAffine3` returns least-squares affine; `estimateError` returns non-zero residual when points are non-collinear.
6. Kalman: `updateKalman` with a high-accuracy measurement pulls state toward new reading; zero-dt update returns position unchanged.
7. Dragging a polygon vertex updates only that vertex; measurement recalculates live.

## Current state vs criteria
1. **Implemented** — `lineLength` (geometry.ts:7) divides by `pixelsPerFoot`.
2. **Implemented** — Single-expression functions (geometry.ts:28–38).
3. **Implemented** — Standard ray-casting (geometry.ts:59).
4. **Implemented** — `solveAffine2` (geo-transform.ts:44) exact by construction.
5. **Implemented** — `solveAffine3` uses normal equations (geo-transform.ts:77); falls back to `solveAffine2` when determinant < 1e-12.
6. **Implemented** — `updateKalman` (geo-transform.ts:171) handles dt ≤ 0 guard.
7. **Partial** — `PdfCanvas.tsx` renders and drags but vertex-drag/recalc wiring not isolated in the geometry library.

## Cross-stream handoffs
- **Feeds → data-export-and-interoperability**: `sfToCY`, `sfToSY` imported by `export-utils.ts:3`.
- **Feeds → project-health-and-controls**: `ProjectControls` aggregates real-world-unit `annotation.measurement`.
- **Feeds → offline-and-native-durability**: `calibrations` and `geo_calibrations` mirrored to IDB by `mirror.ts`.

## Risks / debt
1. **`pixelsPerFoot` is a single global scalar** — assumes uniform scale; scanned/tilted drawings produce systematic invisible errors.
2. **`estimateError` reports pixels, not feet** — docstring says "rough feet" but returns plan-pixel residual (geo-transform.ts:143).
3. **No coordinate normalization spec** — `PdfCanvas.tsx` renders raw pixel coordinates; zoom-independent normalization referenced but not enforced by geometry library.
4. **Kalman state is in-memory only** — `KalmanState` never persisted; filter cold-starts on every `GpsTraceControls` remount.
