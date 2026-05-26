## Phase 8 — Full P6 Import Fidelity, Visible Forms, and Correct Math

Three problems to fix together: (1) imported P6 files lose data, (2) several P6 fields exist in the DB but have no UI, (3) duration/finish/remaining/float math has gaps. The Activities tab keeps the same 3-pane workspace; this phase makes it complete and trustworthy.

---

### 1. Real P6 import into the workspace

Add a new "Import P6" panel inside `ScheduleWorkspace` (replaces the current image-only `GanttUploader` location for this tab; image upload stays available as a secondary option).

**Supported inputs**: `.xer` (existing `parseXer`) and `.xml` / PMXML (existing `parseP6Xml`).

**New file `src/lib/schedule/import-p6.ts`** — adapters that map parsed P6 structures into `schedule_activities` + `activity_relationships` + `project_schedule_meta`. For each import:

- **WBS**: every `PROJWBS` row / PMXML `<WBS>` becomes an `activity_type='wbs'` row with `parent_wbs_id` linked through a temp-id → uuid map. Top-level nodes get `parent_wbs_id = null`.
- **Activities**: every `TASK` / `<Activity>` becomes a leaf. Map:
  - `task_type` / `<Type>` → `activity_type` (`TT_Mile`→`start_milestone`, `TT_FinMile`→`finish_milestone`, `TT_LOE`→`loe`, else `task`).
  - `target_drtn_hr_cnt` (hours) → `duration_days = round(hr/8, 2)` and PMXML `<PlannedDuration>` same conversion (P6 stores hours; we standardize on workdays).
  - `target_start_date`/`<PlannedStartDate>` → `baseline_start`; `target_end_date`/`<PlannedFinishDate>` → `baseline_end`.
  - `act_start_date`/`<ActualStartDate>` → `actual_start`; finish equivalents → `actual_finish`.
  - `status_code` / `<Status>` + `<PhysicalPercentComplete>` → `percent_complete`.
  - `task_code` → `activity_id`; `wbs_id` → `parent_wbs_id` (via map).
- **Relationships**: `TASKPRED` `pred_type` (`PR_FS`/`PR_SS`/`PR_FF`/`PR_SF`) → `rel_type`; `lag_hr_cnt / 8` → `lag_days`. PMXML `<Relationship>` `<Type>` "Finish to Start" etc. → enum, `<Lag>/8` → days.
- **Meta**: `last_recalc_date` / PMXML `<DataDate>` → `project_schedule_meta.data_date`. Calendar workdays left at default unless we can read CALENDAR (out of scope for v1 — flagged in import summary).

**Preview-then-commit UI**: show counts (WBS, activities, relationships, milestones, LOEs) plus a sample table of first 20 activities and a warnings list (unknown types, missing dates, relationships referencing tasks outside the file). User clicks **Import** to insert; **Cancel** discards. Optional **Replace existing schedule** checkbox wipes current rows for this project inside a single transaction (via RPC `replace_project_schedule(p_project_id, p_acts jsonb, p_rels jsonb, p_meta jsonb)` — new SECURITY DEFINER function that the import calls so all writes happen atomically and respect RLS via creator check).

---

### 2. Expose every stored field through proper forms

**a. Activity Details drawer** — new `ActivityInspector.tsx` opened by clicking a row's name (or pressing Enter on a selection). Sections:

- **Identity**: `activity_id`, `name`, `wbs_code`, `activity_type` (Select: Task / Start Milestone / Finish Milestone / LoE / WBS Summary).
- **Schedule**: `baseline_start`, `baseline_end` (read-only mirror of `start + duration_days`, with override toggle), `duration_days`, calendar pill.
- **Progress**: `percent_complete` slider 0–100, `actual_start`, `actual_finish` (date pickers). Setting actual_finish auto-sets % to 100 with a confirm.
- **CPM (read-only)**: ES, EF, LS, LF, total float, criticality badge, with a tooltip explaining the formula.
- **Pay item link**: Select bound to existing `pay_items` for project; used by export and field reports.
- **Relationships**: lifted-up version of the popover, full table with type/lag editable inline and "Add successor" alongside "Add predecessor".

**b. Grid columns** — keep the dense grid but add three sortable columns hidden behind a "Columns" menu: Type icon, Finish (computed), Actual Start, Pay Item. Default columns unchanged so density is preserved.

**c. Toolbar additions**:
- **Activity Type** dropdown when the "+" insert button is used (so milestones are reachable without the inspector).
- **Data Date** date picker bound to `project_schedule_meta.data_date` (saves via `setMeta`).
- **Calendar** popover toggling Sun–Sat workday checkboxes (also via `setMeta`).
- **Import P6** button opens the panel from §1.

**d. PredecessorPopover** — make `rel_type` and `lag_days` editable on existing rows (currently they can only be added/removed). Show successor's computed ES as a hint after change.

---

### 3. Calculation correctness

- **Derive `baseline_end`** automatically whenever `baseline_start` or `duration_days` changes (unless the inspector's "manual finish" override is on). Formula: `addWorkdays(baseline_start, duration_days, calendar)`. Mutation helper in `useSchedule.upsertActivity` recomputes server-side payload before writing.
- **CPM seeds the right thing**:
  - If `actual_start` is set, ES = actual_start (and is locked, since the work has begun).
  - If `actual_finish` is set, EF = actual_finish, remaining duration = 0, total float = 0, not on critical path unless successors are.
  - If `project_schedule_meta.data_date` is set, an activity whose `actual_start` is null cannot have ES earlier than `data_date` (progress override).
- **Milestones**: `start_milestone` and `finish_milestone` force `duration_days = 0`; finish_milestone EF = ES; CPM treats them as zero-duration nodes (already works, but enforce in the writer).
- **Remaining duration & physical %**: when user edits `percent_complete`, store as-is; export converts to remaining = `duration_days * (1 - pct/100)` consistently (fix `build-from-project.ts` to use days as days, not `*8`, by emitting both `<PlannedDuration>` in hours via `days*8` AND keeping the days canonical internally — round-trip test asserts hours-in == hours-out).
- **P6 hours/days round-trip**: round-trip test (importer → DB → exporter → re-importer) must produce identical durations within 0.01 day.
- **Float on disconnected nodes**: currently they get `float = 0` because LS=ES default to project finish minus duration; switch to `LS = max(projectFinish - duration, ES)` so an isolated 5-day activity at projectStart shows positive float instead of being mis-flagged critical.
- **Cycle handling**: when a cycle is detected, return the activities involved (already done) but also mark them with `is_critical = false` and `total_float = null`, and surface them in `ComplianceStrip` with a "Break cycle" action that opens the relationship list for those ids.

---

### Data-model changes (one migration)

Additive only — nothing destructive:

- `schedule_activities.manual_finish boolean default false` (locks auto baseline_end recompute).
- `schedule_activities.remaining_duration_days numeric` (cached, written by CPM).
- RPC `replace_project_schedule(p_project_id uuid, p_acts jsonb, p_rels jsonb, p_meta jsonb)` — SECURITY DEFINER, checks `created_by = auth.uid()`, deletes existing rows, inserts new ones in dependency order. RLS unchanged.

---

### Tests

- `import-p6.test.ts`: parse `SAMPLE_XER` → mapped tables → assert WBS parent linkage, relationship type mapping, hour→day conversion, milestone detection.
- `import-p6.test.ts` round-trip: in-app rows → `buildPmxmlFromProject` → `parseP6Xml` → re-mapped rows; activity ids, durations (±0.01d), relationship types/lags must match.
- `cpm.test.ts` additions: actual_start locks ES; actual_finish forces EF and float=0; data_date pushes ES forward; isolated activity has positive float; finish_milestone EF=ES; cycle members get `total_float=null`.
- `baseline-end.test.ts`: edit duration → baseline_end recomputes; manual_finish=true preserves user-entered finish.

---

### Files

**New**: `src/lib/schedule/import-p6.ts`, `src/lib/schedule/baseline.ts` (baseline_end + milestone enforcement helpers), `src/components/schedule/ImportP6Panel.tsx`, `src/components/schedule/ActivityInspector.tsx`, `src/components/schedule/DataDateControl.tsx`, `src/components/schedule/CalendarControl.tsx`, `src/test/import-p6.test.ts`, `src/test/baseline-end.test.ts`.

**Modified**: `src/lib/schedule/cpm.ts` (actual dates, data_date, isolated float, milestones), `src/lib/schedule/use-schedule.ts` (baseline_end derivation, `importP6` mutation calling the RPC), `src/lib/p6xml/build-from-project.ts` (correct unit conversion), `src/components/schedule/ScheduleWorkspace.tsx` (inspector wiring, toolbar additions, import panel), `src/components/schedule/ScheduleToolbar.tsx` (new buttons + type selector), `src/components/schedule/ComplianceStrip.tsx` (cycle action), `src/test/cpm.test.ts` (new cases), supabase migration adding `manual_finish`, `remaining_duration_days`, and `replace_project_schedule` RPC.

### Out of scope

P6 multi-calendar import, resource/cost loading, baseline snapshots, constraint types (FNLT/SNET), CALENDAR table parsing — flagged in import warnings but not implemented.

### Acceptance

- Upload `SAMPLE_XER` from the Activities tab → preview shows ~15 activities with WBS tree → Import → workspace populated with hierarchy, relationships, milestones, and actual dates visible.
- Open inspector on any activity → every column in `schedule_activities` is visible and editable (or shown read-only with explanation for CPM-derived fields).
- Edit `duration_days` → `baseline_end` updates without manual entry.
- Set `actual_finish` → % jumps to 100, float goes to 0, Gantt bar fills.
- Round-trip test passes: import → export → re-import yields identical durations and relationships.