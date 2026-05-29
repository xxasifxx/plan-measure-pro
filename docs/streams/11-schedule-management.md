# Schedule Management

## Purpose
Enables NJDOT/NJTA project schedulers and Resident Engineers to ingest contractor-submitted P6 PMXML schedules, run calendar-aware CPM, visualize the plan as an interactive Gantt, manage WBS hierarchies, track baselines, assign resources, and perform regulatory compliance analysis (DCMA-14, TIA, AACE classification, SPI/CPI progress, chart export, and RE feedback memo generation). Distinct from data-export (which writes PMXML back to P6) and from Project Controls (which presents aggregated KPIs).

## Surfaces (files)
- `src/lib/p6xml/parser.ts` — raw DOM parse of PMXML into `P6Tables`
- `src/lib/schedule/import-p6.ts` — `importFromPmxml` / `detectAndImport`; maps parsed DOM to normalized `ImportedSchedule`
- `src/lib/schedule/cpm.ts` — `runCpm`: calendar-aware Kahn topological sort, forward/backward passes, 8 constraint types, cycle detection
- `src/lib/schedule/calendars.ts` — `workdaySet`, `exceptionMap`, `parsePmxmlCalendar`
- `src/lib/schedule/baseline.ts` — `calendarFrom`, `normalizeActivityPatch`
- `src/lib/schedule/use-schedule.ts` — `useSchedule` hook: all CRUD mutations, CPM memo, baseline capture/delete via `replace_project_schedule` and `capture_baseline` RPCs
- `src/lib/schedule/types.ts` — `ScheduleActivity`, `ActivityRelationship`, `ScheduleCalendar`, `ScheduleResource`, `ResourceAssignment`, `ScheduleBaseline`, `CpmResult`
- `src/lib/schedule/analysis/dcma.ts` — `runDcma`: 14-point assessment engine
- `src/lib/schedule/analysis/tia.ts` — `buildTia`: TIA fragnet + NJDOT 108-03 narrative
- `src/lib/schedule/analysis/aace.ts` — `AACE_CLASSES` reference data
- `src/lib/schedule/analysis/feedback.ts` — `buildReMemo`: DCMA results → RE accept/reject memo
- `src/lib/schedule/analysis/progress.ts` — `compareProgress`: SPI/CPI, baseline-vs-forecast; `chartRows`
- `src/lib/schedule/analysis/chart-export.ts` — chart image/data export
- `src/lib/schedule/analysis/memo-export.ts` — `downloadMemoPdf` / `downloadMemoDoc`
- `src/components/schedule/ScheduleWorkspace.tsx` — top-level schedule tab orchestrator
- `src/components/schedule/GanttChart.tsx` — drag-to-move/resize bars, dependency arrows, milestone diamonds, critical-path colouring
- `src/components/schedule/WbsTree.tsx` — hierarchical WBS node tree
- `src/components/schedule/ImportP6Panel.tsx` — file-drop upload + import wizard (PMXML only)
- `src/components/schedule/DcmaPanel.tsx` — live 14-point audit dialog with downloadable `.txt`
- `src/components/schedule/ComplianceStrip.tsx` — persistent NJDOT compliance pill bar
- `src/components/schedule/BaselineManager.tsx` — snapshot capture/delete UI
- `src/components/schedule/CalendarManager.tsx` — workweek + exception editor
- `src/components/schedule/ResourceManager.tsx` — resource + assignment CRUD
- `src/components/schedule/ActivityInspector.tsx` — per-activity detail panel
- `src/components/schedule/MetaControls.tsx` — data date, project calendar pickers
- **Tables**: `schedule_activities`, `activity_relationships`, `project_schedule_meta`, `schedule_calendars`, `schedule_resources`, `activity_resource_assignments`, `schedule_baselines`, `baseline_activities`
- **RPCs**: `replace_project_schedule`, `capture_baseline`, `delete_baseline`

## Acceptance criteria
1. Uploading a valid PMXML file imports all WBS nodes, activities, relationships, calendars, resources, and assignments via `replace_project_schedule` with zero data loss for supported fields.
2. `runCpm` computes ES/EF/LS/LF/total-float using the activity's assigned calendar, and marks the continuous critical path.
3. `GanttChart` renders all activities as time-proportional bars; dragging a bar calls `onMove` and `onResize`.
4. `ComplianceStrip` shows correct counts for negative lags, open-ended tasks, CPM cycles, and missing NJDOT M-codes in real time.
5. `DcmaPanel` scores all 14 checks against the live in-memory schedule and exports a parseable `.txt` report.
6. `buildReMemo` issues REJECT when any hard-blocker check fails and ACCEPT when all 14 pass.
7. `captureBaseline` RPC creates a named snapshot; `compareProgress` computes SPI/CPI and slipping activities.
8. All analysis functions consume in-memory `ScheduleActivity[]` directly — no file upload required.

## Current state vs criteria
1. **Implemented** — `importFromPmxml` (import-p6.ts:123); `replace_project_schedule` called from `use-schedule.ts:108`.
2. **Implemented** — `runCpm` (cpm.ts:18) full forward/backward pass with per-activity calendars and 8 constraint types.
3. **Partial** — Drag-move writes optimistically to `cpm.byId` in-place (GanttChart.tsx:88) rather than through `onMove`/`upsertActivity`; persistence unverified.
4. **Implemented** — `ComplianceStrip` recomputes via `useMemo` on every change.
5. **Implemented** — `DcmaPanel` (DcmaPanel.tsx:23); `.txt` download wired.
6. **Implemented** — `buildReMemo` with hard-blocker set `{leads, negfloat, invaliddates, logic, hard}`.
7. **Implemented** — `captureBaseline` / `loadBaselineActivities` (use-schedule.ts:291–312).
8. **Implemented** — All analysis modules import from `@/lib/schedule/types`, not XER.

## Cross-stream handoffs
- **Feeds → data-export-and-interoperability**: `build-from-project.ts` reads `ScheduleActivity[]` to rebuild PMXML.
- **Feeds → project-health-and-controls**: `ProjectControls` embeds `ScheduleWorkspace` and reads `schedule_activities` for milestone KPIs.
- **Consumes ← offline-and-native-durability**: `schedule_activities` mirrored into IDB (`mirror.ts:22`).

## Risks / debt
1. **Drag mutation race** — `GanttChart.tsx:88` mutates `cpm.byId` in-place during drag; parent re-render resets position silently.
2. **`as any` casts on every Supabase call** — generated types don't yet include schedule tables; full persistence layer untyped.
3. **CPM not persisted automatically** — `persistCpm` is a separate manual mutation; tab close after import leaves `is_critical` / `total_float_days` stale in DB.
4. **TIA narrative is a static template** — `buildTia` (tia.ts:23) inserts only the first direct successor; multi-path impact + concurrency are boilerplate, not computed.
