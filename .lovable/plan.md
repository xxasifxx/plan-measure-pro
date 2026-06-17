
# Plan: Fix P6 PMXML Generator Using Researcher Findings

The researcher's analysis identifies multiple concrete violations in our current generator. Rather than rewriting everything in one pass (we've tried that 4 times and failed), we'll fix issues in isolated, verifiable stages — each producing an importable file that proves one set of rules works before stacking the next.

## Why we keep failing

Per the researcher, P6 **silently rejects** child records without per-row diagnostics when:
1. Top-level objects appear in the wrong order (globals before project-scoped)
2. Child elements within an object are in the wrong sequence
3. Date fields don't match the strict per-Status matrix
4. `<PrimaryResourceObjectId xsi:nil="true"/>` is present (deserializer fails — must be **omitted**, not nilled — our last change actively made this worse)
5. Relationship `Type` uses short codes instead of `Finish to Start` etc.
6. Lag is in days instead of hours

Our current `takeoffpro-dev.xml` violates several of these simultaneously, so we can't tell which fix landed.

## Staged delivery (one session each)

### Session 1 — Canary file + rule-encoded emitter scaffold
Produce `public/exports/canary-minimal.xml`: 1 project, 1 calendar, 1 WBS, 2 activities (1 Not Started + 1 Completed), 1 FS relationship. Built strictly to the researcher's §13 minimal shape.

Changes:
- New `scripts/p6xml/emit.mjs` module with **field-order-enforced** writers for `<Project>`, `<Calendar>`, `<WBS>`, `<Activity>`, `<Relationship>` (each writer hardcodes child order; passing fields out of order throws).
- New `scripts/build-canary-pmxml.mjs` producing the minimal file.
- Top-level order enforced: `Currency → OBS → Calendar → Resource → Project (with WBS → Activity → Relationship inside)`.
- **Remove** every `<PrimaryResourceObjectId xsi:nil="true"/>` — omit the tag entirely when no resource.
- Relationship `<Type>` uses full strings (`Finish to Start`); `<Lag>` in working hours.
- New ObjectId ranges that don't collide with reference export DB ids (Project 50000+, Activities 100000+, Relationships 200000+, WBS 60000+).

User imports `canary-minimal.xml` into P6 and reports the log. **Exit criterion:** all 2 activities + 1 relationship accepted.

### Session 2 — Status matrix canary
Once Session 1 imports cleanly, extend the canary to 6 activities exercising every status combo from researcher §5.1:
- Not Started (only PlannedStart/Finish + RemainingEarlyStart/Finish, no Actuals, no ExpectedFinish unless set)
- In Progress (PlannedStart/Finish + ActualStart + RemainingEarlyStart/Finish, **no** ActualFinish)
- Completed (PlannedStart/Finish + ActualStart + ActualFinish, **no** Remaining* dates, RemainingDuration=0)

Plus: Start Milestone, Finish Milestone, Level of Effort. Encode date-field guards in `emit.mjs` so emitting a forbidden field for a status throws.

### Session 3 — Full schedule rebuild
Re-emit `takeoffpro-dev.xml` (161 activities, 140 relationships) using the proven emitter from Sessions 1-2. No new rules — only apply the validated ones at scale.

Drop the existing `scripts/build-dev-pmxml.mjs` ad-hoc logic; the new script composes from `emit.mjs`.

### Session 4 — Validation harness
Add `src/test/p6-rules.test.ts` that loads each emitted XML and asserts:
- Top-level child order
- Within-object child order per type
- Status × date-field matrix
- No `xsi:nil` on `PrimaryResourceObjectId`
- Relationship Type strings, Lag in hours
- ObjectId uniqueness across the file
- FS chronology (predecessor finish ≤ successor start, unless lag negative)

This becomes the regression net so future edits can't silently re-break the file.

## Technical notes

ObjectId ranges (researcher §1.5 — avoid system reserved ranges; use stable high values that won't collide):
```text
Project        50000
Calendar       50100
OBS            50200
Currency       50300
WBS            60000–69999
Activity      100000–199999
Relationship  200000–299999
Resource       70000–79999 (unused in Session 1)
```

Top-level emission order (researcher §3.2):
```text
<APIBusinessObjects>
  <Currency/>
  <OBS/>
  <Calendar/>
  <Project>
    <WBS/>...
    <Activity/>...
    <Relationship/>...
  </Project>
</APIBusinessObjects>
```

Activity child order (researcher §3.1 — exact P6 schema sequence): ObjectId, GUID, Id, Name, Type, Status, CalendarObjectId, WBSObjectId, ProjectObjectId, PlannedDuration, RemainingDuration, ActualDuration, AtCompletionDuration, PercentCompleteType, PhysicalPercentComplete, DurationPercentComplete, PlannedStartDate, PlannedFinishDate, ActualStartDate, ActualFinishDate, RemainingEarlyStartDate, RemainingEarlyFinishDate, PrimaryConstraintType, PrimaryConstraintDate. (Will verify exact order against `EC00620.xml` during Session 1 implementation.)

## Out of scope (this plan)
- Resources/assignments (Session 1-3 omit them; researcher confirms they're optional)
- Baselines, UDFs, Activity Codes
- The live `P6Export.tsx` flow / `apply-progress.ts` — unchanged. This plan only fixes the static dev-schedule export.

## Deliverable for THIS session
Session 1 only: `scripts/p6xml/emit.mjs`, `scripts/build-canary-pmxml.mjs`, `public/exports/canary-minimal.xml`. User imports the canary and reports the log before we proceed to Session 2.
