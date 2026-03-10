

## Problem

The current parser tries to detect column headers and use X-coordinate boundaries to split sheet numbers from descriptions. This is fragile and fails on most PDFs. The user points out a much simpler observation: **the TOC is a sequential mapping of all pages in the document**.

## New Algorithm

The TOC covers all pages 1 through N (where N = `pdf.numPages`). Each row contains either:
- A **single number** (e.g., `1`) → that row's description covers 1 page
- A **number range** (e.g., `7-19`) → that row's description covers pages 7 through 19

The numbers are **sequential** — each row starts where the previous row ended + 1. The last row's end number equals the total page count.

### Parsing steps

1. Extract all text items in the selection rectangle, group into rows by Y-coordinate
2. Skip header rows (containing "SHEET", "DESCRIPTION", "INDEX OF SHEETS", etc.)
3. For each data row, scan text items left-to-right:
   - Find the **first item matching a number or number-range pattern** (`/^\d+$/` or `/^\d+\s*[-–]\s*\d+$/`)
   - Everything else on that row (non-number text items) is the **description**
4. Build `TocEntry[]` directly from parsed numbers — no column detection needed
5. Validate: entries should be sequential and the last entry's end should equal `pdf.numPages`

### File to modify

`src/lib/pdf-utils.ts` — replace the entire parsing section (header detection, column boundary, midpoint logic) with this simple number-first approach. Keep the Y-grouping logic and the final page-count capping.

