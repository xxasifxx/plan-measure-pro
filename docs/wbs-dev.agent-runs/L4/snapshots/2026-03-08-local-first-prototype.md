# Snapshot · 2026-03-08 — Local-First Prototype

## What Existed
- **`useProject` hook** — in-memory + localStorage state for annotations, pay items, PDF scale calibration. CRUD, closeProject, local persistence.
- **`PdfCanvas` component** (373 LOC) — PDF.js render layer, line / polygon / count / calibrate / pan tools, TOC-select drag-rect.
- No backend, no auth, no collaboration.

## What Just Changed
- Initial application created. PdfCanvas and useProject land together as the foundation.
- TOC-select (`drawTocRect / handleImportToc`) added immediately after.

## What Was Abandoned
- Nothing yet — green-field start.

## Product Thesis at This Moment
> "A PDF plan-measurement tool that runs locally in the browser. Inspectors open a plan PDF, draw take-off annotations (lines, polygons, counts), assign them to pay items, and calibrate a scale. Everything persists in localStorage — no server required."
