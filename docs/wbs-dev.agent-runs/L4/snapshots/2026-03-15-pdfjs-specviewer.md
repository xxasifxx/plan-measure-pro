# Snapshot · 2026-03-15 — PDF.js SpecViewer Pivot

## What Existed
- Local-first PdfCanvas with full annotation toolset (select, reassign, undo/redo added 2026-03-13).
- `SpecViewer` using a text-dump / pre-parsed approach (`specs-utils.ts` static extraction, 276 LOC of text-parsing tests).
- Pay-item catalog with colors, units, contract quantities.

## What Just Changed
- **Library swap (pivot-detector sha `cb06eeba`):** SpecViewer rebuilt to render PDF pages directly via PDF.js from stored PDF at TOC start page.
- `specs-utils.ts` gutted from 209 LOC to a near-empty shell; tests cut from 276 to ~40 LOC.
- `pdfjs-dist 4.4.168` added as a dependency.

## What Was Abandoned
- Static text-extraction approach for specifications. Parsing CSI spec text in JavaScript was too brittle; rendering the actual PDF page is the new canonical view.

## Product Thesis at This Moment
> "A construction quantity take-off and spec-review tool. Inspectors draw measurements on plan PDFs; the same app lets them jump to the relevant specification page — both rendered live from PDF.js. Still local-first, no backend."
