

# Touch Interaction Overhaul — Single-Finger Draw + Multi-Finger Pan

## The Problem

Current touch handling is broken for the core inspector workflow. The overlay canvas only has mouse event handlers (`onClick`, `onMouseDown`, etc.) — touch events on mobile never trigger these. Two-finger gestures partially work on the container, but single-finger interactions (the primary workflow) do nothing useful.

## The Correct Workflow Model

An inspector on a tablet needs to:

1. **Single-finger tap** → place a point (count marker, calibration point, line endpoint, polygon vertex)
2. **Single-finger drag** → draw a line from A to B in one gesture (for `line` tool), or drag to pan (for `pan`/`select` tools), or rubber-band visual feedback while drawing
3. **Single-finger double-tap** → close a polygon
4. **Two-finger pinch** → zoom in/out
5. **Two-finger drag** → pan the canvas (regardless of tool)

The key insight the previous plan missed: **single-finger drag IS the primary drawing gesture**. On desktop you click-click to place two line endpoints. On mobile, a drag from A to B should place both endpoints in one motion — this is far more natural than two separate taps for lines. For polygons, taps place vertices (same as desktop clicks). For pan/select mode, single-finger drag pans.

## Behavior Matrix

```text
Gesture              | pan/select  | calibrate     | line          | polygon       | count
─────────────────────|─────────────|───────────────|───────────────|───────────────|──────────
1-finger tap         | hit-test    | place point   | place point   | place vertex  | place marker
1-finger drag        | pan canvas  | drag between  | drag A→B      | (no-op/pan)   | (pan)
                     |             | two points    | places both   |               |
1-finger double-tap  | —           | —             | —             | close polygon | —
2-finger pinch       | zoom        | zoom          | zoom          | zoom          | zoom
2-finger drag        | pan         | pan           | pan           | pan           | pan
```

## Technical Implementation — `src/components/PdfCanvas.tsx`

### 1. Add touch position helper
`getTouchCanvasPos(touch: Touch): PointXY` — mirrors `getCanvasPos` but reads from a Touch object instead of MouseEvent.

### 2. Touch state refs
- `touchStartPos: PointXY` — where finger landed
- `touchStartTime: number` — for tap vs drag discrimination  
- `lastTapTime: number` — for double-tap detection
- `touchDragging: boolean` — set true once finger moves > 10px threshold
- `suppressNextClick: boolean` — prevent ghost click after touch

### 3. Touch handlers on the overlay canvas

**`onTouchStart`** (single finger):
- Record position and timestamp
- If two fingers: delegate to existing pinch/pan logic (move from container to overlay)

**`onTouchMove`** (single finger):
- If movement > 10px from start → set `touchDragging = true`
- Tool = `pan` or `select`: update `panOffset` (single-finger pan)
- Tool = `line` or `calibrate`: update `mousePos` for rubber-band feedback, and if no points placed yet, place the first point at drag start
- Tool = `polygon`: update `mousePos` for rubber-band
- Two fingers: pinch-zoom + pan (existing logic)

**`onTouchEnd`** (single finger):
- **If NOT dragging** (tap): synthesize `handleCanvasClick` with the touch position
- **If dragging + line tool**: place the second endpoint at the release position → complete the line annotation
- **If dragging + calibrate tool**: place second calibration point at release → show distance prompt
- **Double-tap detection**: if two taps within 300ms → call `handleDoubleClick` logic
- Set `suppressNextClick = true` to block ghost click

### 4. Move touch handlers from container to overlay canvas
Currently `onTouchStart/Move/End` are on the outer container div. Move them to the overlay `<canvas>` so coordinates map correctly. Keep the native `preventDefault` on the container for multi-touch browser zoom prevention.

### 5. CSS changes
- Remove `touch-none` from the container div
- Add `touch-action: none` as inline style on the overlay canvas only

### 6. Refactor `handleCanvasClick` and `handleDoubleClick`
Extract the position-dependent logic into helpers that accept a `PointXY` directly (not a `React.MouseEvent`), so both mouse clicks and touch taps can call the same logic without synthesizing fake mouse events.

## Files Modified

- `src/components/PdfCanvas.tsx` — all changes in this single file

