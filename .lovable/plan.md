
## Goal
Replace the flat list inside **Project Controls → Activities** with a Primavera P6-style workspace that lets PMs build, edit and analyze the project schedule directly in the app — WBS hierarchy on the left, spreadsheet-style activity grid in the middle, interactive Gantt on the right, with dependencies and a forward/backward-pass critical-path calculation.

## What the user will see

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Schedule (P6 view)                  Data Date: Mar 14   [Recalculate CPM] │
├─────────────┬───────────────────────────────────┬───────────────────────────┤
│ WBS TREE    │ ACTIVITY GRID                     │ GANTT                    │
│ ▼ 1 Project │ ID    Name     Start  Fin  Dur %  │ ──█████──────            │
│   ▼ 1.1 Pav │ A1010 Mill     3/01  3/05 5d  60  │   ████░░──               │
│     • A1010 │ A1020 Pave     3/06  3/12 7d  10  │      ████──── (critical) │
│     • A1020 │ A1030 Stripe   3/13  3/15 3d  0   │          ███             │
└─────────────┴───────────────────────────────────┴───────────────────────────┘
```

- **WBS tree (left, resizable)** — collapsible parent/child WBS rows, "+ Add child", drag-to-reparent, click filters the grid.
- **Activity grid (center)** — inline-editable columns: Activity ID, Name, Type (Task / Milestone / LOE), Start, Finish, Duration (days), % Complete, Predecessors (chip list), Float, Pay item. Sortable, multi-select, keyboard nav.
- **Gantt (right)** — day/week/month zoom; draggable bars (move = shift start; resize-right = change duration); dependency arrows; critical-path bars in `--destructive`; today/data-date marker line; milestones as diamonds.
- **Toolbar** — Add WBS, Add Activity, Indent/Outdent, Delete, Link selected (FS by default), Unlink, Recalculate CPM, Zoom in/out, Filter by WBS / status, Export to PMXML (reuses existing `serializeP6Xml`).
- **Compliance strip (bottom)** — reuses `complianceSnapshot` + `checkNjdotMilestones` from `src/lib/xer/wbs.ts`: open-ended logic, negative lags, missing NJDOT M-codes.

## Data model changes
Migration adds the missing P6 fields to `schedule_activities` and a new relationships table:

| Table | Column | Notes |
|---|---|---|
| `schedule_activities` | `parent_wbs_id uuid null` | self-FK for WBS tree |
| `schedule_activities` | `activity_id text` | human ID, e.g. `A1010` |
| `schedule_activities` | `activity_type text` default `'task'` | task / start_milestone / finish_milestone / loe / wbs |
| `schedule_activities` | `duration_days numeric` default `0` | |
| `schedule_activities` | `actual_start date null`, `actual_finish date null` | |
| `schedule_activities` | `early_start/early_finish/late_start/late_finish date null`, `total_float_days numeric null`, `is_critical boolean default false` | CPM outputs |
| `schedule_activities` | `sort_order int default 0` | sibling ordering |
| new: `activity_relationships` | `id, project_id, pred_activity_id, succ_activity_id, rel_type ('FS'|'SS'|'FF'|'SF'), lag_days numeric default 0` | unique(pred,succ,rel_type) |
| new: `project_schedule_meta` | `project_id pk, data_date date, calendar jsonb` | per-project schedule settings |

RLS mirrors existing `schedule_activities` policies (members read, creators manage).

## Code structure

New files (kept small and composable):

```
src/lib/schedule/
  types.ts                — Activity, Relationship, ScheduleMeta
  cpm.ts                  — forward + backward pass, marks is_critical, computes float
  date-utils.ts           — workdays add/diff (5-day default calendar)
  use-schedule.ts         — react-query hook: activities + relationships + meta
src/components/schedule/
  ScheduleWorkspace.tsx   — top-level layout (resizable panels)
  WbsTree.tsx             — recursive tree, indent/outdent, drag-reparent
  ActivityGrid.tsx        — virtualized table, inline editors, predecessor chips
  GanttChart.tsx          — SVG/Canvas timeline, draggable bars, arrows, CP coloring
  GanttTimeline.tsx       — header rows (year / month / day) with zoom
  RelationshipEditor.tsx  — popover to add/remove FS/SS/FF/SF + lag
  ScheduleToolbar.tsx     — add/indent/link/zoom/recalc/export buttons
  ComplianceStrip.tsx     — re-uses wbs.ts checks against live data
```

Modified:
- `src/pages/ProjectControls.tsx` — Activities tab body becomes `<ScheduleWorkspace projectId={projectId}/>`. The existing flat `ActivityEditor` and inspector list are removed (their pay-item linking moves into the grid's Pay Item column). `GanttUploader` stays at the top as a one-shot importer that now also seeds `activity_id` + `duration_days`.
- `src/lib/xer/wbs.ts` — `complianceSnapshot`/`checkNjdotMilestones` get a `fromScheduleActivities()` adapter so the strip works without an XER file.
- `src/lib/p6xml/*` — add a `buildPmxmlFromProject(projectId)` that mirrors the live tables into the existing serializer for "Export to P6".

## CPM algorithm (src/lib/schedule/cpm.ts)
1. Build adjacency map from `activity_relationships`.
2. Topological sort; reject + surface cycle errors in the compliance strip.
3. Forward pass — ES/EF using rel type + lag (FS default).
4. Backward pass from project finish (max EF or `must_finish_by`) — LS/LF.
5. `total_float = LS - ES` (in workdays). `is_critical = total_float <= 0`.
6. Results persisted in the same `update` mutation that fires on any edit, debounced 400 ms; also exposed as a manual "Recalculate" button.

## Gantt interaction
- Bars are absolutely positioned divs inside a horizontally scrollable lane container; width = `duration_days * pxPerDay`.
- Drag bar body → updates `start` (and `finish` by duration). Drag right edge → updates `duration_days`. Drop triggers mutation + CPM recalculation.
- Dependency arrows drawn in an overlay `<svg>` using right-edge → left-edge cubic paths; click to open `RelationshipEditor`.
- Zoom buttons cycle `pxPerDay` (day=24, week=8, month=2). Today line + data-date line render as full-height vertical bars.

## Acceptance criteria
- Open Project Controls → Activities. The flat list is gone; the 3-pane P6 workspace loads with the project's existing rows.
- I can add a parent WBS "Earthwork", indent two child activities under it, set durations and dates inline, and link them FS+2d.
- Gantt shows bars in correct lanes; dragging the second bar pushes its start; releasing recalculates CPM and the critical chain turns red.
- Compliance strip flags any missing NJDOT milestone (M100–M950) and any negative lag.
- Export to P6 button downloads a valid PMXML built from the live project (reuses `serializeP6Xml`).
- Web build still passes; existing tests (`p6xml.test.ts`, `xer-parser.test.ts`) untouched; one new test for `cpm.ts` (small fixture, two parallel chains, verifies critical path).
- RLS unchanged for existing tables; new `activity_relationships` + `project_schedule_meta` carry equivalent policies.

## Out of scope (can follow up)
- Multi-calendar / per-activity calendars (uses a single 5-day project calendar).
- Resource loading, cost loading, baselines vs current schedule comparison.
- Risk register / Monte-Carlo.
- Mobile layout for the Gantt (workspace gracefully degrades to grid-only under 768 px).
