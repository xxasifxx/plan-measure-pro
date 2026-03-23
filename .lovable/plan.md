

# Add Touch Support for TOC Region Selection

## Problem

The TOC import uses a drag-to-select-rectangle gesture, but this only works with mouse events (`onMouseDown/Move/Up`). The touch handlers don't support `tocSelect` mode — single-finger drags during `tocSelect` fall through without doing anything.

## Solution

Add `tocSelect` handling to the three touch event handlers in `PdfCanvas.tsx`:

### Changes in `src/components/PdfCanvas.tsx`

1. **`handleOverlayTouchStart`** — When `toolMode === 'tocSelect'` and single finger: set `tocDragStart` to the touch position (same as `handleMouseDown` does), clear previous rect.

2. **`handleOverlayTouchMove`** — When `toolMode === 'tocSelect'` and dragging: update `tocDragEnd` with current touch position (same as `handleMouseMove` does). Add `tocSelect` to the drag detection block so it calls `preventDefault` and updates the rubber-band rectangle.

3. **`handleOverlayTouchEnd`** — When `toolMode === 'tocSelect'` and was dragging: finalize the rectangle into `tocRect` if large enough (w > 20 && h > 20), same logic as `handleMouseUp`. This triggers the confirmation prompt.

4. **Skip tap handling** — When `tocSelect` is active, single-finger taps should be ignored (no point placement), which is already handled since `handleClickAtPos` returns early for `tocSelect`.

Single file change, ~20 lines added across the three touch handlers.

