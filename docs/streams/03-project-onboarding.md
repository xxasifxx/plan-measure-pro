# Project Onboarding

## Purpose
Covers everything that happens between "project row created" and "inspector can start drawing": uploading the plan PDF, optionally uploading standard specs, parsing the Index of Sheets (TOC) to map section labels to page ranges, and importing the pay-item schedule from the contract document. Distinct from field-capture because no measurement work can happen until calibration and pay items are in place, and distinct from the pay-item-catalog because it handles one-time bootstrapping, not ongoing lifecycle.

## Surfaces (files)
- `src/pages/Dashboard.tsx` (`handleCreate`) — "New Project" dialog: name, contract number, PDF file input
- `src/hooks/useProjects.ts` (`createProject` mutation) — uploads PDF to `project-pdfs` bucket, inserts `public.projects` row
- `src/pages/Index.tsx` (`load()`, `handleTocRegionSelected`, `handleImportPayItems`, `handleSpecsUpload`) — loads PDF from signed URL, populates `useProject` state, provides the `tocSelect` workflow trigger
- `src/components/ProjectSidebar.tsx` — surfaces "Upload PDF", "Upload Standard Specs", "Import TOC", and "Import Pay Items" buttons; houses the manual pay-item add dialog
- `src/lib/pdf-utils.ts` (`extractTextFromRegion`, `extractPayItemsFromPage`) — text-layer parsing: TOC region selection and pay-item table heuristic extraction
- `src/hooks/useProject.ts` (`updateToc`) — persists parsed TOC entries to `public.projects.toc` JSONB column
- `public.projects.toc` (JSONB) — `TocEntry[]`: `{label, sheetNo, startPage, endPage}`
- `public.projects.specs_storage_path` — path in `specs-pdfs` bucket
- `src/types/project.ts` (`TocEntry`) — schema for a parsed sheet-index row

## Acceptance criteria
- Creating a project requires a name and a plan PDF; on success the user lands at `/project/:id` with the PDF rendered.
- On `/project/:id` load, calibrations and annotations from `public.calibrations` and `public.annotations` are fetched and applied; if offline, IDB cache is used with a toast.
- Selecting the `tocSelect` tool and drag-selecting the "INDEX OF SHEETS" region produces one `TocEntry` per row.
- "Import Pay Items" on the current page (or up to 4 subsequent pages) populates the pay-item list with `itemCode`, `name`, `unit`, `unitPrice`, and a section-keyed color.
- Uploading a Standard Specs PDF fully indexes it and sets `specs_storage_path`.
- TOC and pay-item state survives a page reload.

## Current state vs criteria
- **Create project / PDF upload**: Implemented — `useProjects.ts:112–135`; storage path `{userId}/{uuid}.pdf`.
- **Load with offline fallback**: Implemented — `Index.tsx:115–143`; IDB mirror via `safePut/safeGet`.
- **TOC drag-select**: Implemented — `PdfCanvas.tsx:97–108`, `Index.tsx:370–386`; `extractTextFromRegion` in `pdf-utils.ts:43–193`.
- **Pay-item import**: Implemented — `Index.tsx:388–420+`; multi-page scan up to +4 pages.
- **Specs PDF upload + indexing**: Implemented — `Index.tsx:333–358`.
- **TOC / pay-items survive reload**: Implemented — `useProject.ts:331–338` and `useProject.ts:303–328`.

## Cross-stream handoffs
- **Receives from portfolio-and-pm-home**: `createProject` produces the `projects` row and PDF storage path.
- **Feeds pay-item-catalog**: `handleImportPayItems` produces the initial `PayItem[]`.
- **Feeds field-capture**: `initProject` hydrates `useProject` with annotations, calibrations, and pay items.
- **Seam**: `useProject.initProject(...)` — single call in `Index.tsx:190` after all DB data is assembled.

## Risks / debt
1. `extractPayItemsFromPage` is a pure heuristic regex scan of PDF text layers; non-standard table layouts (rotated text, scanned pages) silently produce zero or malformed pay items.
2. TOC parsing uses a hardcoded 5px Y-grouping tolerance and `console.log` debug noise in production — no structured logging or parse-quality indicator.
3. The "Up to 4 subsequent pages" pay-item scan is a magic number with no UI indication of where the scan stopped.
4. `specs_storage_path` is uploaded with `upsert: true` at fixed path `{projectId}/specs.pdf` — concurrent uploads silently overwrite.
