# Standard Specifications

## Purpose
Lets inspectors and REs look up NJDOT/NJTA standard specification sections directly from the takeoff tool by clicking a pay item, without leaving the application or hunting through a multi-hundred-page PDF. The stream owns PDF loading, full-text extraction, section-page index building, virtualized continuous-scroll rendering, and instant in-document search.

## Surfaces (files)
- `src/components/SpecViewer.tsx` — Main component (696 lines): resizable/draggable slide-over panel, virtualized canvas renderer with visible-page buffer, Ctrl+F search with text-layer highlight overlay, touch pinch-zoom, page-number input, fit-to-width auto-scale; accepts `specsPdf`, `specsPageTexts`, `startPage`, `sectionNumber`
- `src/lib/specs-utils.ts` — Three-tier section-page index builder (`buildSectionPageIndex`): Tier 1 strict (SECTION NNN + NNN.01 + dominant prefix), Tier 2 relaxed (no NNN.01 required), Tier 3 fallback (any heading on non-TOC page); `extractAllText` batch extracts all pages in chunks of 10; `getSectionFromItemCode` parses item code prefix
- `src/pages/Index.tsx` / `src/pages/Demo.tsx` — Hosts `SpecViewer`; wires `specs_storage_path` from project row, loads PDF via `pdfjs-dist`, builds index, calls `getSectionFromItemCode` on selected pay item to derive `startPage`
- `public.projects.specs_storage_path` — Column pointing to a blob in Supabase Storage; loaded by the host page and passed into SpecViewer as `PDFDocumentProxy`

## Acceptance criteria
- Clicking a pay item opens `SpecViewer` at the first page of its three-digit section (e.g., item `202-0002` → Section 202).
- `buildSectionPageIndex` resolves at least the nine standard top-level sections (100–900) for a well-formed NJDOT spec PDF; a warning appears when a section is not found.
- Text extraction of a 900-page PDF completes without blocking the UI (batched with `setTimeout(0)` yields between chunks).
- Ctrl+F / ⌘+F opens the search bar; typing ≥ 2 characters highlights matches on the visible page canvas with amber/orange overlay; active match is orange, others are yellow.
- Pinch-to-zoom (two-finger touch) and scroll-wheel zoom (Ctrl+scroll) work on both mobile and desktop.
- Panel width is persisted in `localStorage` under `specViewerPanelWidth` and restored on next open.
- When `startPage` is null (section not found), the viewer opens at page 1 and auto-populates the search bar with "SECTION NNN".

## Current state vs criteria
- **Section jump** — implemented; `getSectionFromItemCode` extracts 3-digit prefix; `buildSectionPageIndex` provides `startPage` (`specs-utils.ts:175-179`, `56-169`).
- **Three-tier index** — implemented; all three tiers coded with TOC-skip heuristic (≥ 5 distinct prefixes = TOC) (`specs-utils.ts:82-166`).
- **Batched text extraction** — implemented; 10-page batches with `setTimeout(0)` yield (`specs-utils.ts:7-41`).
- **Virtualized rendering** — implemented; `visiblePages` computed from scroll position with ±1 buffer, per-page `<canvas>` elements created on demand, renders cancelled for off-screen pages (`SpecViewer.tsx:240-430`).
- **Search with highlight** — implemented; text-layer character map built per visible page, rectangles drawn on canvas with alpha overlay (`SpecViewer.tsx:369-423`).
- **Pinch zoom / scroll zoom** — implemented (`SpecViewer.tsx:127-195`).
- **Panel width persistence** — implemented (`SpecViewer.tsx:198-200`).
- **Section-not-found fallback** — implemented; `sectionNotFound` flag opens search pre-filled (`SpecViewer.tsx:283-290`).

## Cross-stream handoffs
- **Feeds from**: project setup — `projects.specs_storage_path` must be set (by the admin or project creator uploading the specs PDF) for this stream to function.
- **Feeds from**: annotation/takeoff stream — selected pay item's `itemCode` triggers `getSectionFromItemCode` to derive the jump target.
- **Feeds into**: no downstream consumer; this is a read-only reference tool.

## Risks / debt
1. **Entire PDF loaded into memory** — `pdfjs-dist` loads the full binary; a 1,200-page NJDOT spec PDF can consume 200–400 MB in the renderer process, causing tab crashes on low-memory mobile devices.
2. **Search highlight is canvas-drawn, not DOM-native** — the highlight overlay re-renders the entire page canvas on every keystroke and match navigation; for pages with dense text this causes visible flicker and dropped frames.
3. **`extractAllText` runs on the main thread** — though batched, there is no Web Worker; a 900-page extraction still blocks the event loop at each batch boundary.
4. **No spec PDF upload UI in this stream** — `specs_storage_path` must be set externally (e.g., through the admin panel or Documents stream); if absent, SpecViewer silently renders nothing.
