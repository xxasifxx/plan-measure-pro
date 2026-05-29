# Snapshot · 2026-05-26 — P6 XML Schedule Engine

## What Existed
- Multi-user inspection/daily-report platform with PDF annotation, pay-item catalog, daily reports schema.
- XER parser (`src/lib/xer/`) as the schedule ingest path — partial, ad-hoc.
- `schedule_activities` table existed but was minimal (no CPM fields, no relationships).

## What Just Changed
**Library swap + major capability addition (sha `6d325711`, migrations `7d5d3850` + `9262b81e`):**

1. **PMXML (P6 XML) parser** — `src/lib/schedule/import-p6.ts` (281 LOC): parses Primavera P6 XML exports including activities, WBS, calendars, resources, resource assignments, constraints.

2. **CPM engine** — `src/lib/schedule/cpm.ts`: calendar-aware forward/backward pass, total float, free float, `is_critical` flag.

3. **Schedule DB schema** expanded:
   - `schedule_activities`: +10 P6 columns (early/late start/finish, float, activity_type, sort_order).
   - `activity_relationships` table (FS/SS/FF/SF).
   - `project_schedule_meta` table.
   - `replace_project_schedule()` RPC (v1 — 4-arg).

4. **UI surface:** `ScheduleWorkspace` (WbsTree + GanttChart), `ActivityInspector`, `ImportP6Panel`, `MetaControls`, `BaselineManager`, `CalendarManager`, `ResourceManager` — all landed in a ~2-hour burst.

5. **Offline-first persistence**: annotation mutations routed through `offlineMutate` queue.

6. **`resident_engineer` role** added to `app_role` enum.

## What Was Abandoned
- XER was still present as a co-equal format at this point (dual `detectAndImport` dispatcher). Excision was imminent but not yet complete.

## Product Thesis at This Moment
> "A construction inspection and schedule oversight platform for Resident Engineers. Import a P6 XML schedule; run CPM, view Gantt, manage baselines and calendars, inspect float and criticality. Daily reports, quantity take-off, and pay-item tracking run alongside. Offline-capable for field use."
