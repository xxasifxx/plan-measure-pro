---
stream_key: 13-data-export-and-interoperability
paths:
  - src/lib/p6xml/parser.ts
  - src/lib/p6xml/serializer.ts
  - src/lib/p6xml/apply-progress.ts
  - src/lib/p6xml/load-approved.ts
  - src/lib/p6xml/build-from-project.ts
  - src/lib/p6xml/types.ts
  - src/lib/export-utils.ts
  - src/lib/pdf-utils.ts
  - src/lib/approved-quantities.ts
  - src/lib/native/filesystem.ts
  - src/pages/P6Export.tsx
  - src/hooks/usePayItemActivityMap.ts
shared_paths: []
---
# Data Export and Interoperability

## Purpose
Enables contractors and REs to move quantity and schedule data in and out of TakeoffPro in external formats: writing progress back into P6 PMXML for contractor re-import, producing Excel/XLSX daily inspector reports, generating PDF and CSV quantity summaries, and maintaining a clean pay-item ↔ P6-activity mapping. The official "output gate" — only RE-approved quantities flow into export artifacts.

## Surfaces (files)
- `src/lib/p6xml/parser.ts` — `parseP6Xml`: parses uploaded PMXML into a live XMLDocument
- `src/lib/p6xml/serializer.ts` — `serializeP6Xml`, `downloadP6Xml`: serializes mutated DOM; preserves unmodified elements verbatim
- `src/lib/p6xml/apply-progress.ts` — `applyDailyReportsToP6`: writes approved cumulative quantities as `ActualUnits`/`PhysicalPercentComplete` into PMXML
- `src/lib/p6xml/load-approved.ts` — `loadApprovedDailyReports`: loads RE-approved rows from Supabase
- `src/lib/p6xml/build-from-project.ts` — `buildP6XmlFromProject`: synthesizes full PMXML from live tables without an uploaded baseline
- `src/lib/p6xml/types.ts` — `P6Tables`, `ActivityChange`, `P6Project`, `P6Activity`
- `src/lib/export-utils.ts` — `exportCsv`, `exportApprovedCsv`, `exportPdfReport`, `exportApprovedPdfReport`, `exportInspectorDaily`, `exportApprovedInspectorDaily`; uses SheetJS + `jsPDF`
- `src/lib/pdf-utils.ts` — `buildDemoPdf` and annotation-overlay PDF helpers
- `src/lib/approved-quantities.ts` — `loadApprovedTotalsByPayItem` from `v_approved_pay_item_quantities`
- `src/lib/native/filesystem.ts` — `saveExport`: Capacitor Filesystem on native, browser download on web
- `src/pages/P6Export.tsx` — 428-line 3-step wizard (upload baseline, map pay items, apply & download)
- `src/hooks/usePayItemActivityMap.ts` — `usePayItemActivityMap`, `useUpdatePayItemMapping`, `useBulkAutoMap`
- **Tables**: `pay_items` (with `p6_activity_id` mapping column), `daily_reports`, `annotation_photos`
- **View**: `v_approved_pay_item_quantities`

## Acceptance criteria
1. Uploading a PMXML baseline and clicking "Apply Approved Progress" produces a mutated PMXML where each mapped activity's `ActualUnits` and `PhysicalPercentComplete` reflect latest RE-approved cumulative quantities.
2. Downloaded file is accepted by P6 via File → Import → Primavera XML → Update Existing Project without schema errors.
3. Auto-map links pay items whose `item_code` matches an Activity Id; already-mapped items are not overwritten.
4. `exportApprovedCsv` / `exportApprovedPdfReport` include only RE-approved quantities (status='approved').
5. `exportInspectorDaily` filters strictly by `userId` and `report_date`; no cross-inspector leak.
6. On Capacitor native, exported files land in app Documents via `saveExport` rather than browser download.
7. `buildP6XmlFromProject` produces valid PMXML from live schedule tables without uploaded baseline.

## Current state vs criteria
1. **Implemented** — `applyDailyReportsToP6` patches DOM in-place; `P6Export.tsx:102` orchestrates the flow.
2. **Partial** — Structural round-trip via serializer preservation, but no automated tests verify P6 import acceptance.
3. **Implemented** — `onAutoMap` (P6Export.tsx:90) skips `!p.p6_activity_id`.
4. **Implemented** — `loadApprovedDailyReports` queries `status = 'approved'`.
5. **Implemented** — `exportInspectorDaily` double-checks `a.userId !== userId` (export-utils.ts:242).
6. **Implemented** — `saveExport` called by all export functions; Capacitor path branched in helper.
7. **Implemented** — `buildP6XmlFromProject` constructs full PMXML including calendars and resources.

## Cross-stream handoffs
- **Consumes ← schedule-management**: `build-from-project.ts` reads `ScheduleActivity[]`, `ScheduleCalendar[]`, `ScheduleResource[]`.
- **Consumes ← measurement-and-geometry-engine**: `export-utils.ts` calls `sfToCY`/`sfToSY`.
- **Consumes ← offline-and-native-durability**: `saveExport` routes through `lib/native/filesystem.ts`.

## Risks / debt
1. **No round-trip test suite** — P6 import compatibility asserted only in comments; schema regression caught only by contractor complaint.
2. **`applyDailyReportsToP6` mutates the live DOM** — shared state; double-apply stacks silently.
3. **`jsPDF` `doc.save()` bypasses `saveExport`** — `writePdfFromRows` calls `doc.save()` directly; on native, PDF goes to browser download not Capacitor Documents.
4. **`as-of-date` cutoff is UI-only** — never validated server-side; blank value returns all-time approved quantities.
