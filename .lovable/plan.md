# Phase 9 — Full P6 Parity

Promote the previously deferred items to first-class features and wire them through import, UI, CPM, and export.

## In Scope (was out of scope)

1. **Multi-calendar support** (per-activity + per-project)
2. **Resources & cost** (labor/material/equipment assignments, budgeted/actual units & cost)
3. **Baseline snapshots** (named baselines, compare vs current)
4. **Constraint types** (SNET, SNLT, FNET, FNLT, MSO, MFO, ASAP, ALAP)
5. **P6 CALENDAR table parsing** (XER `CALENDAR` + PMXML `<Calendar>`), including workweek + exceptions

## Database (new migration)

New tables:
- `schedule_calendars` (project_id, name, is_default, hours_per_day, workweek jsonb, exceptions jsonb)
- `schedule_resources` (project_id, name, type enum: labor/material/equipment/nonlabor, unit, cost_per_unit, max_units_per_day)
- `activity_resource_assignments` (activity_id, resource_id, budgeted_units, actual_units, remaining_units, budgeted_cost, actual_cost)
- `schedule_baselines` (project_id, name, captured_at, captured_by, notes)
- `baseline_activities` (baseline_id, activity_id, baseline_start, baseline_end, duration_days, total_float_days, percent_complete)

Columns on `schedule_activities`:
- `calendar_id uuid` nullable (defaults to project calendar)
- `constraint_type text` (enum check)
- `constraint_date timestamptz`
- `primary_resource_id uuid`

RPCs:
- `capture_baseline(project_id, name, notes)` → snapshot all activities atomically
- `delete_baseline(baseline_id)`
- Extend `replace_project_schedule` to accept calendars + resources + assignments

RLS: same project-membership pattern as existing schedule tables.

## CPM engine changes (`src/lib/schedule/cpm.ts`)

- Calendar lookup per activity (fallback project default). Workday arithmetic uses that calendar's workweek + exceptions, not a global constant.
- Constraint application during forward/backward pass:
  - SNET/FNET: raise ES/EF
  - SNLT/FNLT: lower LS/LF
  - MSO/MFO: hard-pin ES==LS (or EF==LF), float clamped, flagged critical if violated
  - ALAP: schedule against late dates
- Resource cost rollup: per-activity `at_completion_cost = actual_cost + remaining_units * cost_per_unit`; project totals exposed via hook.

## Import (`src/lib/schedule/import-p6.ts`)

- Parse XER `CALENDAR` (`clndr_data` blob → workweek + holidays) and PMXML `<Calendar>` (`<StandardWorkWeek>`, `<HolidayOrExceptions>`).
- Parse XER `RSRC` + `TASKRSRC` and PMXML `<Resource>` + `<ResourceAssignment>` → resources + assignments (units, cost, remaining).
- Parse `cstr_type`/`cstr_date` (XER) and `<PrimaryConstraintType>`/`<PrimaryConstraintDate>` (PMXML).
- Map task `clndr_id` → `calendar_id`.
- All written through extended `replace_project_schedule` RPC in one transaction.

## Export (`src/lib/p6xml/build-from-project.ts`)

Emit `<Calendar>`, `<Resource>`, `<ResourceAssignment>`, constraint fields, and per-activity `<CalendarObjectId>` so round-trip is lossless.

## UI

- **`CalendarManager.tsx`** — modal: list/create/edit calendars, workweek grid (Mon–Sun hours), exceptions date picker, set project default.
- **`ResourceManager.tsx`** — modal: CRUD resource library; ResourceAssignmentTab inside `ActivityInspector` for per-activity budgeted/actual/remaining units & cost.
- **`BaselinePanel.tsx`** — toolbar dropdown: "Capture baseline", list with delete, "Compare to baseline" toggle that overlays grey baseline bars on Gantt and shows variance columns (BL Start, BL Finish, Var Days, Var Cost).
- **`ConstraintEditor`** inside `ActivityInspector` — type select + date picker; violations surface in `ComplianceStrip`.
- **`ScheduleToolbar`** gets Calendars / Resources / Baselines / Import buttons.
- New grid columns (toggleable via columns picker): Calendar, Constraint, Primary Resource, Budgeted Cost, Actual Cost, BL Finish, Var.

## Tests

- `multi-calendar.test.ts` — same duration, different calendars → different EF.
- `constraints.test.ts` — SNET/MSO/FNLT each verified against hand-calc.
- `resources.test.ts` — cost rollup, remaining units math.
- `baseline.test.ts` — capture then mutate activity, variance computed correctly.
- Extend `import-p6.test.ts` with fixtures containing CALENDAR, RSRC, TASKRSRC, constraints.

## Out of scope (still)

- Resource leveling / what-if scheduling
- Multi-currency
- Role-based resources vs named resources distinction
- Earned-value curves (S-curves) — data is captured, charting deferred

Proceed?
