

## Problem

Two issues:

1. **The "Import TOC" confirmation prompt isn't visible** after drawing a selection rectangle. The prompt uses `absolute top-4` positioning inside a scrollable container — if the user has scrolled down at all, the prompt is off-screen above the viewport.

2. **The TOC data model is too simple.** Currently `TocEntry` is `{ label, page }` mapping each entry to a single page. The user wants entries that represent page *ranges* with meaningful descriptions (e.g., "Construction Plans" covering pages 22-27), and the sidebar should display these grouped sections instead of flat page numbers.

## Plan

### 1. Fix the TOC import confirmation prompt visibility

In `PdfCanvas.tsx`, change the TOC import prompt from `absolute top-4 left-1/2` to `fixed top-4 left-1/2` (or use a sticky approach) so it's always visible regardless of scroll position. Same pattern the calibration prompt should use.

### 2. Update the TocEntry data model

In `src/types/project.ts`, change `TocEntry` to support page ranges:

```ts
export interface TocEntry {
  label: string;       // e.g. "Construction Plans"
  sheetNo: string;     // e.g. "C-101" or "C-101 - C-105"
  startPage: number;
  endPage: number;
}
```

### 3. Update the text extraction logic

In `src/lib/pdf-utils.ts`, after parsing individual sheet rows, add a post-processing step that groups consecutive entries with similar prefixes or assigns sequential page numbers. Each raw row still maps to a page, but entries with the same description prefix get collated into a range. Also handle cases where a single row already indicates a range (e.g., "C-101 THRU C-105").

### 4. Update the sidebar navigation

In `ProjectSidebar.tsx`, replace the flat TOC list with grouped sections:
- Each `TocEntry` displays as `"{label}" (pages {startPage}-{endPage})` or just the page number if start equals end
- Clicking a section navigates to its `startPage`
- Collapsible groups using the existing Collapsible component for multi-page sections showing individual pages within

### 5. Update all consumers

Update `useProject.ts` (the `persist` call), `Index.tsx`, and any references to `entry.page` to use the new `startPage`/`endPage` fields.

## Files to modify

- `src/types/project.ts` — update `TocEntry` interface
- `src/lib/pdf-utils.ts` — add page-range grouping logic to `extractTextFromRegion`
- `src/components/PdfCanvas.tsx` — fix prompt positioning to `fixed`
- `src/components/ProjectSidebar.tsx` — render grouped TOC sections with page ranges
- `src/pages/Index.tsx` — minor updates for new TocEntry shape

