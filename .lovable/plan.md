
# P6 XML round-trip for inspector-driven progress updates

Extend the MCFA pitch and the existing XER toolkit so the scheduler can ingest a Primavera **P6 XML (PMXML)** baseline, auto-apply progress derived from RE-approved daily reports, and export a PMXML update Oracle P6 can re-import — eliminating the manual "type each Activity %, Actual Start, Actual Finish into P6" pass.

## How P6 XML actually works (research summary)

Oracle ships two interchange formats; we already handle XER, this adds the XML one:

- **File**: `PMXML` (a.k.a. *Primavera XML* / *P6 XML*). Single `<APIBusinessObjects>` root, schema versioned per P6 release (e.g. `Business_Objects_22_12.xsd`). Same format P6 Professional, EPPM, and Primavera Cloud use for project import/export.
- **Relevant elements** (subset we need):
  - `<Project>` — `Id`, `Name`, `DataDate`, `PlannedStartDate`, `MustFinishByDate`
  - `<WBS>` — `Id`, `Name`, `ParentObjectId`
  - `<Activity>` — `Id` (=task_code), `ObjectId`, `Name`, `Type` (`Task Dependent`, `Resource Dependent`, `Milestone`...), `Status` (`Not Started` / `In Progress` / `Completed`), `PercentCompleteType` (`Physical` | `Duration` | `Units`), `PhysicalPercentComplete`, `DurationPercentComplete`, `ActualStartDate`, `ActualFinishDate`, `RemainingDuration`, `AtCompletionDuration`, `PlannedDuration`, `PrimaryConstraintType`, `PrimaryConstraintDate`
  - `<Relationship>` — `PredecessorActivityObjectId`, `SuccessorActivityObjectId`, `Type` (`Finish to Start`...), `Lag`
  - `<ResourceAssignment>` — `ActualRegularUnits`, `RemainingUnits`, `ActualStartDate`, `ActualFinishDate` (optional; lets quantities flow into earned-value)
- **Update semantics**: re-importing into P6 with "Update existing project" matches activities by `Id` (Activity ID) within the target Project Id. P6 then recalculates dates on the next schedule run; we don't need to recompute CPM ourselves.
- **Day vs hour**: XML uses **hours** for durations (consistent with XER `*_hr_cnt`). Dates are ISO `YYYY-MM-DDTHH:mm:ss`.

We do **not** need Oracle SDKs, the EPPM REST API, or web services — pure browser-side XML read/write is sufficient and matches our existing "no IT integration" positioning.

## Scope

This is a **pitch-page deliverable plus a working in-browser prototype** of the XML round-trip, mirroring the existing XER demo pattern. No backend, no auth changes, no Oracle credentials.

### 1. Parsing & serialization library (`src/lib/p6xml/`)

```
src/lib/p6xml/
  types.ts         # P6Project, P6Activity, P6Relationship, P6Wbs, P6ResourceAssignment
  parser.ts        # parseP6Xml(xmlText): P6Tables — DOMParser, namespace-aware
  serializer.ts    # serializeP6Xml(tables, opts): string — round-trips through XMLSerializer
  apply-progress.ts# applyDailyReportsToP6(tables, reports, dataDate): {tables, changeLog}
  sample.ts        # tiny embedded PMXML for the demo (no external file needed)
```

Parser/serializer goals:
- Preserve unknown elements/attributes on round-trip (read once into a generic node tree, mutate only the fields we touch). This is how we guarantee P6 still accepts the file.
- Whitelist the editable fields above; everything else is passed through verbatim.
- Detect schema version from the root attribute and write it back unchanged.

### 2. Daily-report → activity mapping

`DailyReport` (reusing the inspector record shape already implied by the takeoff side) carries:
`{ date, activityIdOrTag, quantityInstalled, unitOfMeasure, isComplete, notes, approvedByRE: true }`.

`applyDailyReportsToP6` rules:
1. Match by `Activity.Id`. If the inspector tags by pay item, fall back to an activity-code map the PM configures once per project.
2. If `ActualStartDate` is empty and any approved report exists → set `ActualStartDate` = earliest approved report date, set `Status` = `In Progress`.
3. If `isComplete` (or cumulative quantity ≥ contract quantity) → set `ActualFinishDate` = report date, `Status` = `Completed`, `RemainingDuration` = 0, `PhysicalPercentComplete` = 100.
4. Otherwise → update `PhysicalPercentComplete` = `cumulativeQty / contractQty`, recompute `RemainingDuration` = `PlannedDuration * (1 - pct)`, leave `AtCompletionDuration` unchanged unless the inspector reports an overrun.
5. Bump project `DataDate` to the latest approved report date.
6. Emit a `changeLog` (one row per touched activity) for the PM's review screen.

### 3. UI: XML round-trip demo on the MCFA pitch

Add a new section to `src/pages/McfaPitch.tsx` between the existing "Progress vs Baseline" and the next module:

- **Kicker**: `0X · P6 XML ROUND-TRIP` (insert and renumber subsequent kickers, following the same pattern used previously).
- **Three-pane flow** (animated, similar to existing XerLensTour visuals):
  1. *Drop baseline PMXML* — file input or "Use sample" button (uses `sample.ts`).
  2. *Approved daily reports* — a mock table of 6–8 RE-approved rows the PM would otherwise type into P6.
  3. *Updated PMXML out* — preview of the changeLog (activity, old %, new %, ΔRemainingDuration, new Actual dates) plus a "Download `<ProjectId>_update.xml`" button.
- **Copy** emphasising the click-savings: "Today a PM hand-keys ~40 activity updates per project per month into P6. With approved daily reports as the source of truth, one upload reproduces the same edits and re-imports cleanly."
- A small "Compatible with" badge row: *P6 Professional 22.x · EPPM · Primavera Cloud* (all consume PMXML).

### 4. Standalone demo route

Add `src/pages/P6XmlDemo.tsx` and a `/p6-xml` route in `src/App.tsx`, parallel to `/xer`. This is the page the MCFA pitch CTA links into so the prospect can actually try it without a sales call.

### 5. Tests

`src/test/p6xml.test.ts`:
- Round-trip: parse → serialize → parse equals original semantically.
- `applyDailyReportsToP6` cases: not-started → in-progress, in-progress → percent bump, completion, idempotency on re-apply.

## Out of scope

- No EPPM REST / web-service integration (file-based only, per existing positioning).
- No CPM recalculation — we rely on P6's scheduler after re-import.
- No XER ↔ XML conversion utility (separate ask).
- No DB schema changes; daily reports are mocked on the pitch page from existing inspector data shape.
- No changes to the takeoff product's auth, RLS, or roles.

## Files

- **Create**: `src/lib/p6xml/{types,parser,serializer,apply-progress,sample}.ts`
- **Create**: `src/pages/P6XmlDemo.tsx`
- **Create**: `src/test/p6xml.test.ts`
- **Edit**: `src/pages/McfaPitch.tsx` (insert new section, renumber following kickers)
- **Edit**: `src/App.tsx` (add `/p6-xml` route)

## Technical notes

- Use built-in `DOMParser` / `XMLSerializer` — no new deps. PMXML files in MCFA's range (~few MB) parse comfortably client-side.
- Namespace: PMXML uses `http://xmlns.oracle.com/Primavera/P6/V<ver>/API/BusinessObjects`; preserve it on the root element when serializing.
- Date helpers: emit `YYYY-MM-DDTHH:mm:ss` (no timezone suffix — matches P6 export style).
- Keep the parser tolerant of element order — P6 exports are not strictly ordered between releases.
