

# Continuous Scroll PDF Viewer for SpecViewer

## Problem
The SpecViewer renders one page at a time, requiring explicit prev/next navigation. Real PDF viewers like Acrobat show a continuous vertical scroll of all pages — you just scroll down to see the next page. This is the single biggest UX gap.

## Solution — Multi-page continuous scroll

Replace the single-canvas architecture with a scrollable container holding one canvas per visible page (virtualized). Pages render on-demand as they scroll into view.

### Architecture

```text
┌─────────────────────────────┐
│  SheetContent (flex col)    │
│  ┌───────────────────────┐  │
│  │ Header / Toolbar      │  │
│  ├───────────────────────┤  │
│  │ Scroll container      │  │  ← overflow-y: auto
│  │  ┌─────────────────┐  │  │
│  │  │ Spacer (above)  │  │  │  ← maintains scroll height
│  │  ├─────────────────┤  │  │
│  │  │ Canvas page N   │  │  │  ← rendered pages
│  │  │ Canvas page N+1 │  │  │
│  │  │ Canvas page N+2 │  │  │
│  │  ├─────────────────┤  │  │
│  │  │ Spacer (below)  │  │  │
│  │  └─────────────────┘  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

### Implementation in `src/components/SpecViewer.tsx`

1. **Page height calculation**: On open/scale change, get page 1 viewport to compute `pageHeight` (at current renderScale). All pages assumed same size (standard for spec PDFs). Add a gap (e.g. 12px) between pages.

2. **Virtual scroll container**: Replace the single `<canvas>` with a tall `<div>` whose total height = `totalPages * (pageHeight + gap)`. This gives the scrollbar correct proportions.

3. **Visible page detection**: On scroll, compute which pages are in the viewport using `scrollTop / (pageHeight + gap)`. Render a window of ~3 pages (current ± 1 buffer).

4. **Canvas pool**: Maintain a small pool of canvas elements (3-5). Position them absolutely within the tall div at their correct `top` offset. When a page scrolls out, reuse its canvas for the next page entering view.

5. **Render pipeline**: When a page enters the visible window, render it to its canvas using the existing `specsPdf.getPage(n).render()` logic. Cancel renders for pages that scroll out before completing.

6. **Scroll-to-page**: `setCurrentPage(n)` scrolls the container to `(n-1) * (pageHeight + gap)`. The page counter updates on scroll by reading which page is centered.

7. **Search highlight**: Apply the existing highlight logic per-page during render — no change needed except it now runs per visible page instead of one page.

8. **Preserve existing features**: Pinch-zoom, Ctrl+wheel zoom, search, page input, fit-to-width all continue to work. The debounced `renderScale` still controls actual PDF rendering. Scale changes re-calculate `pageHeight` and re-render visible pages.

9. **Performance**: Only 3 canvases exist at any time. `IntersectionObserver` or scroll-position math triggers renders. Cancelled renders prevent stale draws.

### Changes summary
- Remove single `canvasEl` state → add `visiblePages` state (array of page numbers)
- Add `pageHeight` state computed from PDF + renderScale
- Replace single canvas with positioned canvas pool in a tall scroll div
- Add scroll handler to update `visiblePages` and `currentPage`
- Render effect loops over `visiblePages` instead of single page
- `scrollTo` replaces `setCurrentPage` for navigation buttons, search, and "Go to start"

### Single file change
All modifications in `src/components/SpecViewer.tsx`.

