

# Fix SpecViewer Rendering & Debounce Issues

## Problems

1. **Canvas ref not ready on first render**: The render effect (line 243) checks `!canvasRef.current` and bails — but when the Sheet portal mounts, the canvas may not exist yet. Since `open` doesn't re-trigger after mount, the effect never re-fires and the page stays blank.

2. **fitToWidth fires before container has dimensions**: Called immediately on `open` change (line 348), but the Sheet is still animating — `container.clientWidth` is 0, producing a bad scale.

3. **fitToWidth depends on `currentPage`** (line 344) but the debounced refit effect (line 352) includes `fitToWidth` as a dependency — so every page change triggers a refit, which is unnecessary and causes scale flickering.

4. **Scale changes during pinch-zoom trigger re-render of the PDF**: Every small scale delta from pinch gestures fires the render effect (depends on `scale`), causing constant expensive PDF re-renders mid-gesture.

## Fixes in `src/components/SpecViewer.tsx`

### 1. Callback ref for canvas mount detection
Add `canvasEl` state set via a callback ref. Add it to the render effect's dependency array so rendering triggers when the canvas actually appears in the DOM.

### 2. Delay fitToWidth on open
Replace the immediate `fitToWidth()` call with `setTimeout(fitToWidth, 150)` to wait for the Sheet animation to give the container real dimensions.

### 3. Remove `currentPage` from fitToWidth deps
The fit calculation only needs the PDF page dimensions (which are the same for all pages in