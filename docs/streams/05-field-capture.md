---
stream_key: 05-field-capture
paths:
  - src/pages/Index.tsx
  - src/components/PdfCanvas.tsx
  - src/components/Toolbar.tsx
  - src/components/MobileToolbar.tsx
  - src/components/GpsCalibration.tsx
  - src/components/GpsTraceControls.tsx
  - src/components/MobileAnnotationSheet.tsx
  - src/hooks/useProject.ts
  - src/lib/geometry.ts
  - src/lib/geo-transform.ts
  - src/types/project.ts
shared_paths: []
---
# Field Capture

## Purpose
The core on-site measurement workflow: rendering contract plan PDFs on a canvas, placing geometric annotations (line, polygon, count, label) keyed to pay items, calibrating the drawing scale, editing placed shapes, viewing GPS position overlaid on the plan, and capturing notes and location strings. This is the stream inspectors spend the most time in and the one that produces all raw measurement data consumed by export and RE review.

## Surfaces (files)
- `src/pages/Index.tsx` — top-level workspace; orchestrates PDF load, tool state, GPS state, mobile vs desktop layout, keyboard shortcuts (Ctrl+Z/Y), and all handler wiring
- `src/components/PdfCanvas.tsx` — dual-canvas (PDF render layer + overlay); implements hit-testing, pointer/touch routing, all drawing modes (`line`, `polygon`, `count`, `label`, `calibrate`, `tocSelect`), drag-handle editing, GPS overlay, live measurement labels
- `src/components/Toolbar.tsx` — desktop toolbar: tool mode buttons, undo/redo, active pay-item pill, calibration indicator with copy-to-pages, page nav, zoom, summary/export
- `src/components/MobileToolbar.tsx` — mobile two-row toolbar
- `src/components/GpsCalibration.tsx` — step wizard capturing 2–3 GPS/plan control-point pairs; calls `buildGeoCalibration`
- `src/components/GpsTraceControls.tsx` — start/stop GPS trace recording
- `src/components/MobileAnnotationSheet.tsx` — bottom sheet for editing selected annotation metadata
- `src/hooks/useProject.ts` — `addAnnotation`, `removeAnnotation`, `updateAnnotation`, `setCalibration`, `copyCalibrationToPages`, `undo`/`redo`; realtime Supabase subscription for multi-user sync; offline via `offlineMutate`
- `src/lib/geometry.ts` — `lineLength`, `polygonAreaSF`, `pointInPolygon`, `pointToSegmentDistance`, `distancePx`, `pointToMarkerDistance`
- `src/lib/geo-transform.ts` — `buildGeoCalibration`, affine GPS→plan transform
- `src/types/project.ts` — `ToolMode`, `Annotation`, `Calibration`, `PointXY`
- `public.annotations` — `type`, `points` JSONB, `pay_item_id`, `page`, `measurement`, `measurement_unit`, `depth`, `manual_quantity`, `location`, `notes`, `approved_at`, `approved_by`
- `public.calibrations` — `project_id`, `page`, `point1`/`point2` JSONB, `real_distance`, `pixels_per_foot`

## Acceptance criteria
- Setting calibration by clicking two points and entering a known distance produces a `pixelsPerFoot`; line measurements match real scale.
- Placing a polygon on calibrated page shows live SF running total; completing it prompts for depth (CY items) and stores result.
- Selecting an existing annotation shows drag handles; dragging a vertex updates the measurement label in real time.
- Undo (Ctrl+Z) removes the last-placed annotation from both local state and Supabase; redo restores it.
- An annotation created by another user appears on the canvas without page reload (realtime).
- GPS calibration with ≥ 2 control points renders a position dot and trace polyline at the correct location.
- A `manual` or non-drawable pay item accepts a manual quantity override.
- The `readOnly` flag disables the calibrate tool and hides pay-item edit controls.

## Current state vs criteria
- **Scale calibration**: Implemented — `PdfCanvas.tsx:57–59`; display `1″ = N′` in `Toolbar.tsx:38–48`.
- **Polygon with CY depth prompt**: Implemented — `PdfCanvas.tsx:61–63`.
- **Drag-handle editing**: Implemented — `PdfCanvas.tsx:71–75`; live measurement recalc at `PdfCanvas.tsx:265–269`.
- **Undo/redo with DB sync**: Implemented — `useProject.ts:265–297`.
- **Realtime multi-user sync**: Implemented — `useProject.ts:341–418`; presence channel `useProject.ts:421–450`.
- **GPS calibration overlay**: Implemented — `GpsCalibration.tsx`, `GpsTraceControls.tsx`; `PdfCanvas.tsx:29–34` accepts `gpsPosition`, `gpsTracePoints`.
- **Manual quantity override**: Implemented — `PdfCanvas.tsx:265–268` uses `manualQuantity ?? measurement`.
- **readOnly mode**: Implemented — `Index.tsx:42`; `Toolbar.tsx:55–57` filters out `calibrate`.

## Cross-stream handoffs
- **Receives from pay-item-catalog**: `payItems` + `activePayItemId` drive available tools.
- **Receives from project-onboarding**: `useProject.initProject` hydrates calibrations, TOC, annotations.
- **Feeds RE review / export**: `public.annotations` rows consumed by `exportApprovedCsv`, `exportApprovedPdfReport`, and `ReReview.tsx`.
- **Seam**: `onAddAnnotation` → `useProject.addAnnotation` → `offlineMutate` → `public.annotations` INSERT.

## Risks / debt
1. `PdfCanvas` is 1,426 lines with pointer/touch/draw/GPS/TOC/drag logic co-located — extremely hard to test in isolation.
2. `buildGeoCalibration` silently throws on degenerate transforms (`GpsCalibration.tsx:72–79`); no diagnostic when affine matrix is ill-conditioned.
3. Undo stack is per-session and per-device only; undoing on one device does not roll back another user's view.
4. "Copy calibration to pages" does a bulk DB delete + re-insert with no confirmation of which pages were overwritten.
