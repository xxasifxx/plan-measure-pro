# Project Health and Controls

## Purpose
Gives project managers and owners a unified PM dashboard to track schedule milestone health, quantity-variance vs contract, weekly scorecard KPIs (billable hours, adoption %, on-time reporting), inspector activity/freshness, AI-tagged site photos, and bid summary — all scoped to a single project. Distinct from Schedule Management (raw CPM analysis) and from the field-view takeoff experience.

## Surfaces (files)
- `src/pages/ProjectControls.tsx` — 692-line single-page PM hub; five tabs: Dashboard, Activities, Scorecard, AI Photos, Bid
- `src/components/schedule/ScheduleWorkspace.tsx` — embedded in the Activities tab
- `src/components/GanttUploader.tsx` — PMXML drag-drop uploader widget
- **Read tables**: `projects`, `annotations`, `pay_items`, `project_members`, `schedule_activities`, `rocks`, `scorecard_metrics`, `annotation_photos`
- **Write tables**: `schedule_activities`, `rocks`, `scorecard_metrics`, `annotation_photos`
- **Edge function**: `tag-photo` — AI pay-item suggestion invoked fire-and-forget on upload
- `src/types/project.ts` — `UNIT_LABELS`, `getPayItemSection` used for bid summary

## Acceptance criteria
1. Dashboard KPI tiles display Schedule Status %, Milestones On Track/Behind, Critical Issues count, and Reporting Freshness — derived from live Supabase data, no stubs.
2. Quantity Variance section shows installed-vs-contract progress bars for every pay item that has a `contract_quantity`.
3. Inspector Adoption table lists each contributing inspector's 7-day annotation count and staleness status (> 3 days = stale).
4. Rocks (quarterly goals) can be created, have their status cycled, and deleted.
5. Scorecard metrics can be upserted per-week for the three fixed `METRIC_KEYS`.
6. Uploading a photo triggers `tag-photo` and the confirmed pay-item association updates `annotation_photos`.
7. The hub requires PM access (`isOwner || isManager`); non-PMs receive access-denied, not a blank screen.

## Current state vs criteria
1. **Partial** — Schedule Status tile hardcodes `CPI 1.03 · SPI 0.98` (ProjectControls.tsx:332); other three tiles data-driven.
2. **Implemented** — `variance` memo (ProjectControls.tsx:177).
3. **Implemented** — `inspectorActivity` memo (ProjectControls.tsx:162).
4. **Implemented** — `addRock`, `updateRockStatus`, `deleteRock` (ProjectControls.tsx:220–239).
5. **Implemented** — `upsertMetric` with `onConflict` (ProjectControls.tsx:242).
6. **Implemented** — `uploadPhoto` invokes `tag-photo` fire-and-forget (ProjectControls.tsx:253).
7. **Implemented** — `canEdit` guard at render time (ProjectControls.tsx:286).

## Cross-stream handoffs
- **Consumes ← schedule-management**: embeds `ScheduleWorkspace`; reads `schedule_activities` for milestone KPIs.
- **Consumes ← measurement-and-geometry-engine**: reads `annotations.measurement` and `annotations.manual_quantity`.
- **Feeds → data-export-and-interoperability**: pay item data consumed by `export-utils.ts`.

## Risks / debt
1. **Hardcoded CPI/SPI** — primary schedule KPI tile shows `CPI 1.03 · SPI 0.98` unconditionally; real values from `analysis/progress.ts` never wired.
2. **`computeExpectedPct` provenance unclear** — `dashboard` memo calls it but function is not visible in first 389 lines; regression silently zeros milestone counts.
3. **No pagination on scorecard metrics** — `limit(60)` silently drops older data on long-running projects.
4. **Photo AI confidence threshold not enforced** — `ai_confidence` read but never used to filter or warn in UI.
