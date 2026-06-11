## Why the import still fails

I traced `scripts/build-dev-pmxml.mjs` against the source data (`docs/wbs-dev.activities.json`, 154 activities) and the regenerated `public/exports/takeoffpro-dev.xml`. The structural shape is fine; the **content is internally contradictory**, which is why P6 rejects every Project / Activity / Relationship.

### Bugs found (logic + chronology)

1. **Source dates are degenerate.** 60 "Completed" activities all share `actualStart = actualFinish = 2026-05-29T00:00:00Z` (the data date). The generator passes those through verbatim, so each completed activity ends up with start == finish but `ActualDuration = 8h`, `PlannedDuration = 8h`. P6 rejects any activity whose `ActualFinishDate - ActualStartDate` is inconsistent with `ActualDuration` against its calendar.

2. **Times don't fit the calendar.** The Global calendar declares workdays 08:00–16:00. We emit activity dates at `00:00:00` (because source dates are midnight-UTC). P6 will not place an actual start outside calendar working time → activity rejected → whole Project rejected.

3. **`PlannedStart == PlannedFinish` for completed work.** We set `plannedStart = actualStart; plannedFinish = actualFinish` but keep `PlannedDuration = durationDays * 8`. Same contradiction as #1 on the planned side.

4. **Project `earliestStart` is meaningless.** It picks the minimum of activity `refStart`, so the project's effective span (2026-04-01 → 2027-07-05) is driven by one stray completed task, not the actual project start (`PROJECT_S = 2025-09-01`). `ScheduledFinishDate` is correct, but the Project header is internally inconsistent with `PlannedStartDate`.

5. **In-progress chronology is wrong.** `actualStart = parseIso(a.actualStart) || cursor`. When source actualStart is the data date, the activity's actual start sits at the data date and its remaining work also starts at the data date, leaving `ActualDuration = 0` but `PercentComplete > 0`. P6 rejects.

6. **`cursor` advances by completed work time.** For "In Progress" we do `cursor = addWorkHours(cursor, remainH)` but never roll the cursor back to account for the elapsed actual portion, so the schedule baseline drifts forward.

7. **Milestones inherit garbage from their driver.** They use `last.plannedFinish` of the phase, which is corrupted by #1–#5.

### Fix plan

All changes in `scripts/build-dev-pmxml.mjs`. No app/UI code touched.

**A. Synthesize a sane chronology, ignore degenerate source dates.**
   - Define `PROJECT_START = 2025-09-01T08:00:00` and `DATA_DATE = 2026-05-29T08:00:00` (08:00 aligns to calendar).
   - Walk activities in deterministic order (phase → stream → input). Maintain two cursors:
     - `pastCursor` starting at `PROJECT_START`, used to lay out completed/in-progress actual segments forward.
     - `futureCursor` starting at `DATA_DATE`, used to lay out remaining work.
   - **Completed:** `actualStart = pastCursor`; `actualFinish = addWorkHours(pastCursor, totalH)`; advance `pastCursor = actualFinish`. If `actualFinish > DATA_DATE`, clamp to `DATA_DATE - totalH` worth of workdays so all completed work sits strictly before the data date. `plannedStart/plannedFinish = actualStart/actualFinish`. `ActualDuration = totalH`, `RemainingDuration = 0`, `PercentComplete = 1`.
   - **In Progress:** `actualStart = addWorkHours(DATA_DATE, -elapsedH)` where `elapsedH = round(totalH * pct)` (clamped ≥ 1, ≤ totalH-1). `remainH = totalH - elapsedH`. `plannedStart = actualStart`. `plannedFinish = addWorkHours(futureCursor, remainH)`. Advance `futureCursor` by `remainH`. `ActualDuration = elapsedH`.
   - **Not Started:** `plannedStart = futureCursor`; `plannedFinish = addWorkHours(futureCursor, totalH)`; advance `futureCursor`. No actuals (xsi:nil). `PercentComplete = 0`.

**B. Implement `addWorkHours` with negative hours** (walk backward across workdays) for the in-progress clamp.

**C. Project header consistency.**
   - `PlannedStartDate = PROJECT_START` (already true).
   - `ScheduledFinishDate = fmtP6(futureCursor)` after all remaining work is laid out (drop the `earliestStart`/`latestFinish` min/max).
   - Keep `DataDate = DATA_DATE`.

**D. Calendar-aligned formatting.**
   - Force every emitted date to land on a working minute (08:00–16:00, Mon–Fri). `addWorkHours` already does this; just make sure we never bypass it.

**E. Milestones.**
   - Anchor each phase milestone to the `plannedFinish` of the last activity in that phase (post-fix dates), or to `futureCursor` if the phase has no activities. `PercentComplete = 1` if every driver is Completed, else `0`.

**F. Relationships sanity.**
   - Keep FS-0 chain within stream + driver→milestone, but only emit a relationship if both endpoints land on the same workflow side of the data date OR if successor's `plannedStart >= predecessor's plannedFinish`. (Otherwise P6 will fail the relationship even when both activities exist.)

**G. Optional but cheap wins.**
   - Add `<DateAdded>` to Project (some P6 builds require it).
   - Drop `<WBSObjectId>` from the Project header if it points at a WBS we ourselves create in the same file (P6 fills this in after WBS insert; including a pre-existing reference can race).

### Verification

1. `node scripts/build-dev-pmxml.mjs` and re-run `src/test/dev-pmxml.test.ts` (already structural).
2. Add three new assertions to that test:
   - For every Activity: if `ActualStartDate` and `ActualFinishDate` both present, `Finish > Start` and `(Finish - Start)` in workhours ≈ `ActualDuration` (±1h tolerance).
   - For every Activity: `ActualStartDate ≤ DataDate` and (`Not Started` ⇒ no actuals; `Completed` ⇒ both actuals; `In Progress` ⇒ start only).
   - All emitted datetimes fall on Mon–Fri 08:00–16:00.
3. Report the import log from P6 after re-import.

### Files changed

- `scripts/build-dev-pmxml.mjs` (logic rewrite — sections noted above)
- `src/test/dev-pmxml.test.ts` (add chronology assertions)
- `public/exports/takeoffpro-dev.xml` (regenerated artifact)

No frontend or backend code is affected.
