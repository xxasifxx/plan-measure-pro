# Snapshot · 2026-05-05 — TakeoffPro Brand Swept; Daily Reports & jsPDF

## What Existed
- TakeoffPro-branded GPS field-measurement platform.
- 20 commits of GPS calibration/tracing UI across March–April.
- XER schedule parser (src/lib/xer/) as primary schedule format.

## What Just Changed
1. **Brand & GPS removal (sha `c1559f62`):**
   - All "TakeoffPro" references swept from McfaPitch.tsx and plan.md.
   - GPS field-capture UI references removed. `geo_calibrations` table remains in DB but the hero UI is gone.

2. **jsPDF added (sha `35031a4b`):**
   - `jspdf 2.5.2` dependency. PNG export + PDF summary generation wired up.
   - Client-side PDF output for the first time (PDF.js was read-only).

3. **Daily reports schema (migration `20260505010015`):**
   - `daily_reports` table (per-inspector/project/date unique).
   - `activity_assignments` + `activity_pay_items` junction tables.
   - `schedule_activities`, `rocks`, `scorecard_metrics` tables added.
   - `annotation_photos` table + `annotation-photos` storage bucket.
   - `is_bid` flag on projects.

## What Was Abandoned
- **GPS hero workflow** — GPS calibration infrastructure DB tables remain but the dedicated capture UI was deleted. The GPS-as-differentiator thesis was abandoned.
- **TakeoffPro brand** — product identity reset; name/brand unclear at this moment.

## Product Thesis at This Moment
> "A construction project management and inspection platform. Inspectors submit daily reports tied to pay items. Quantity measurements are drawn on plan PDFs. Reports can be exported as PDFs. The product serves the resident-engineer / inspector workflow, not just GPS field measurement."
