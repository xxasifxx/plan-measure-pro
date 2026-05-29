## Why stream-14 shows zero coverage

Stream 05 (`field-capture`) and stream 14 (`measurement-and-geometry-engine`) declare the exact same six files under `paths:`:

```
src/lib/geometry.ts
src/lib/geo-transform.ts
src/components/GpsCalibration.tsx
src/components/GpsTraceControls.tsx
src/components/PdfCanvas.tsx
src/hooks/useProject.ts
```

`build-spine.mjs` resolves ambiguity by longest-literal-glob-prefix. The globs are identical strings → scores tie → `Object.entries` order wins and stream-05 takes everything. Stream-14 ends up with 0 leaves.

The doc-level intent is already clear from the prose: stream-14 owns the math/transform primitives; stream-05 owns the canvas UI and the project hook that *consumes* those primitives. The fix is to make `paths:` reflect ownership and use `shared_paths:` for consumption.

## Fix

Edit only the two stream front-matters. No script or pipeline changes — the existing tiebreak + `shared_paths` mechanism already does the right thing once ownership is unambiguous.

### `docs/streams/14-measurement-and-geometry-engine.md`

```yaml
paths:
  - src/lib/geometry.ts
  - src/lib/geo-transform.ts
  - src/components/GpsCalibration.tsx
  - src/components/GpsTraceControls.tsx
shared_paths:
  - src/components/PdfCanvas.tsx   # consumes geometry for vertex-drag recalc
  - src/hooks/useProject.ts        # loads calibrations + geo_calibrations
```

### `docs/streams/05-field-capture.md`

```yaml
paths:
  - src/pages/Index.tsx
  - src/components/PdfCanvas.tsx
  - src/components/Toolbar.tsx
  - src/components/MobileToolbar.tsx
  - src/components/MobileAnnotationSheet.tsx
  - src/hooks/useProject.ts
  - src/types/project.ts
shared_paths:
  - src/lib/geometry.ts            # owned by stream-14
  - src/lib/geo-transform.ts       # owned by stream-14
  - src/components/GpsCalibration.tsx
  - src/components/GpsTraceControls.tsx
```

## Verification

1. Re-run `node scripts/wbs/build-spine.mjs`.
2. Expect coverage report: `14-...` declared=4 matched=4 shared=2; `05-...` matched=7 shared=4.
3. Expect the `WARNING streams with zero file coverage` line to no longer include stream-14.
4. Spot-check `.lovable/wbs/spine.json` → `path_to_stream["src/lib/geometry.ts"] === "14-measurement-and-geometry-engine"` and `path_to_shared["src/lib/geometry.ts"]` contains `05-field-capture`.

## Out of scope

- No changes to `build-spine.mjs` tiebreak logic (front-matter is the source of truth; fixing it once is cleaner than teaching the resolver to guess).
- No changes to prose sections of either stream doc.
- No re-bootstrap; `bootstrap-stream-paths.mjs` already skips files with front-matter.
