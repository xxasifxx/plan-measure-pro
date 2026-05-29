# Plan — emit `.lovable/wbs/*` as a Primavera P6 XML (PMXML) without blank-field theater

## The core problem

A naive emitter dumps every leaf as a WBS node and every activity as a `<Activity>`. P6 then shows a forest of activities with empty Start, Finish, Duration, % Complete, Calendar, Resource, and Cost — because our JSON is intent + history, not a CPM-scheduled plan. The fix isn't to fabricate dates; it's to (a) decide which P6 fields we *legitimately* have a source for, (b) park the rest in Notebook Topics, UDFs, and Activity Codes where P6 expects "extra truth," and (c) emit activity *types* and *statuses* that don't demand the missing fields.

## Decisions to lock before any XML is written

These are the choices that determine whether the file is honest or padded. Each one needs your sign-off — the rest of the plan branches on the answers.

### D1. Activity Type strategy
P6 has four types and each has different required fields:
- `TT_Task` — needs duration + dates + calendar (heavy)
- `TT_Mile` (Start/Finish Milestone) — needs only a single date
- `TT_LOE` (Level of Effort) — duration spans its predecessors/successors automatically
- `TT_WBS` (WBS Summary) — rolls up from children, no dates needed

Proposal:
- `origin=git` with `time_window` → `TT_Task` (we have real dates)
- `origin=future-marketing-debt` → `TT_Mile` (a promise to deliver, single target date)
- `origin=future-risk` / `future-verification-gap` with no estimate → `TT_LOE` (lets P6 compute span from successors instead of us inventing one)
- Leaves with many children and no own commits → `TT_WBS` (summary only)

This alone eliminates ~70% of blank-duration rows.

### D2. Status mapping (from our 4-D state vector)
P6 has exactly 4 statuses. Mapping:
| state.lifecycle | + condition | P6 Status |
|---|---|---|
| shipped | — | Completed |
| in-flight | — | In Progress |
| paused / dormant | — | In Progress (with % complete frozen, Notebook explains why) |
| planned | — | Not Started |
| abandoned | — | Not Started + Activity Code `LIFECYCLE=abandoned` (P6 has no "cancelled" status; we tag it) |

The 4-D vector is richer than P6 status — the rest goes into Activity Codes (D4) and Notebook Topics (D5), not lost.

### D3. Dates — what we have, what we infer, what stays empty
- **Have real:** `time_window.first/last` on git activities → `ActualStart` / `ActualFinish` (only set ActualFinish if `lifecycle=shipped`; else only ActualStart).
- **Have planned for future-marketing-debt:** none today. Either (a) leave PlannedStart empty and accept P6 will float them to project start, or (b) derive from predecessor-chain + a default 5d duration. Recommend (a) plus a Notebook entry — don't fabricate.
- **Duration:** for completed git activities use `time_window.active_days` (with floor 1); for in-flight use elapsed since `first`; for future stubs leave `PlannedDuration` unset on TT_LOE (P6 computes it).
- **Data Date:** the `2026-05-29` date already in state.json becomes the project `DataDate`.

### D4. Activity Codes (P6's tagging system) — this is where our richness lives
Define one Activity Code Type per dimension, with values from our enums:
- `ORIGIN` = git | future-risk | future-marketing-debt | future-verification-gap
- `LIFECYCLE` = planned | in-flight | paused | dormant | shipped | abandoned
- `BLOCKING` = none | decision | external | successor-missing
- `VISIBILITY` = quiet | normal | loud
- `STREAM` = the 23 streams
- `LAYER` = Frontend | Backend | Mobile | Capability | Verification | Engineering | Build | Docs
- `HEALTH` = healthy | dormant-but-needed | awaiting-successor | paused-pending-decision | abandoned-but-loud (derived in `next.json`)

P6 then lets you filter/group by any of these — same expressive power as our state vector, no info loss.

### D5. Notebook Topics (per-activity prose) — for evidence
One topic per activity with:
- `evidence.commit_shas` first 10 + count (full list in UDF)
- `evidence.reason` for stubs
- `contributing_leaves[]` list
- `state.blocking.note`

This is where reviewers click to see "why is this here."

### D6. UDFs (typed user fields)
- `LovableActivityId` (Text) — our ACT-xxxx
- `PrimaryLeafId` (Text) — LF-xxxx
- `CommitCount` (Integer)
- `DormancyDays` (Integer)
- `Confidence` (Double) — for stub activities, computed from signals
- `DownstreamCount` (Integer) — drives the "dormant-but-needed" filter

### D7. Relationships
Direct map. `relationships.json` already has `type` (FS/SS/FF) and `lag_days`. Emit confidence + sources as a Notebook on the relationship (or concatenate into the Comments field if the viewer doesn't honor relationship notebooks). The 52 rejected edges stay out of XML but ship as a sibling `.rejected.xml` for audit.

### D8. WBS hierarchy
`wbs.json` already has parents (stream → layer → leaf). Direct map to nested `<WBS>` nodes. The 67 orphan-capability leaves get parked under a synthetic `Capability` layer per stream so nothing dangles.

### D9. Calendar and Resources
- One project calendar: `Lovable 7-day` (we don't track working hours). Single calendar avoids the per-activity calendar reference problem.
- Resources: skip entirely in v1. (Could add a per-stream resource later if you want load views — but that's fabricated data right now.)

### D10. Cost
Skip. We have zero financial signal. Don't emit `<TotalCost>` etc.; P6 shows blanks gracefully when the elements aren't present (it's the *presence with zero* that looks like missing data).

## What gets built (after you approve D1–D10)

```
scripts/wbs/
  emit-p6-xml.mjs          # main emitter
  p6/
    schema.mjs             # PMXML element builders
    activity-types.mjs     # D1 logic
    status-map.mjs         # D2 logic
    activity-codes.mjs     # D4 enum → <ActivityCode> + <ActivityCodeAssignment>
    notebook.mjs           # D5 prose builder
    udfs.mjs               # D6 typed UDF builder
    calendar.mjs           # D9 default calendar
    validate.mjs           # post-emit XSD-shape check
.lovable/wbs/
  project.p6.xml           # main artifact
  project.p6.rejected.xml  # rejected relationships for audit
  project.p6.report.md     # field-coverage report: how many activities got each field, how many are intentionally blank, with reasons
```

## Field-coverage report (the anti-blank-field accountant)

After emission the script writes `project.p6.report.md`:

```
ActivityName        669/669  (100%)
ActivityType        669/669  (100%)  [TT_Task 220 | TT_Mile 8 | TT_LOE 419 | TT_WBS 22]
Status              669/669  (100%)
ActualStart         145/669  (intentional: only in-flight + shipped)
ActualFinish         20/669  (intentional: only shipped)
PlannedStart          0/669  (intentional: no fabricated dates — TT_LOE infers from successors)
PlannedDuration     220/669  (TT_Task only; TT_LOE computed by P6; TT_Mile zero)
Calendar            669/669  (single default)
NotebookTopics      669/669  (every activity has evidence prose)
ActivityCodes       669/669  ×7 dimensions = 4683 assignments
UDFs                669/669
PercentComplete     165/669  (in-flight + shipped only)
```

The report is the user-facing proof that no field is blank by accident — every empty cell has a documented reason.

## What's explicitly out of scope

- No invented dates or durations to fill cells.
- No Resource Assignments, Costs, Roles, Risks, Issues, Documents, Baselines.
- ~~No round-trip into the app's Supabase or UI.~~ Done — see Phase 2.
- No P6 viewer/import automation — file lands in `.lovable/wbs/` and you import it.

## Phase 2 — comprehension + narrative arcs (added after round-trip)

The naive emit produced a structurally clean PMXML that round-tripped through the app's CPM with 0 warnings but finished only 4 weeks past the data date (2026-06-24). Diagnosis was weak comprehension: 419 of 669 activities were `TT_LOE` with zero duration and only 169 of 669 had any predecessor at all, so CPM saw mostly disparate parallel work collapsed onto the data date. Two passes added:

1. **`build-comprehension.mjs`** parses `docs/streams/*.md` "Current state vs criteria" sections and reconciles them against activities — 146/147 criteria classified, durations seeded on 572/669 activities, lifecycle and `% complete` overridden from documentation truth instead of commit recency, 15 cross-stream handoff edges promoted from prose.

2. **`build-narrative-arcs.mjs`** distinguishes *disparate progress* (many independent surfaces moving in parallel) from *dependent progress* (one criterion enabling the next). Two signals:
   - **Verify chain (within stream, by criterion ordinal):** the team works through remaining criteria sequentially, so `[verify]` activities chain FS in ordinal order — 121 edges.
   - **Stubs-before-verify (parallel across leaves, serial within a leaf):** within a leaf one developer builds serially; across leaves a stream runs parallel; each leaf-tail converges into the stream's first verify activity — 184 edges.
   - Result: future-side dependent share rose ~2% → **43%**, CPM finish moved 2026-06-24 → **2026-07-02**.

### Narrative-arc honesty check

The modest 8-day shift is the finding, not a failure: median stream health is ~85% Implemented, so there genuinely isn't much chainable remaining work. Where the schedule would extend if comprehension were tightened: stream 11 (schedule-management, 43 serialized stubs) and stream 15 (offline-and-native-durability, 35 stubs) — the stub-chain dominates and is probably under-estimated. 102 future-side activities remain orphan-parallel (mostly marketing promises + 99-cross-cutting); chaining them would be theater.

### What this changes about reading the PMXML

- "Critical path" now means the longest chain through verify activities and stub serializations, not whichever activity happened to inherit an old git timestamp.
- A wide stream finishing fast = real parallelism, not missing edges.
- A narrow stream with many stubs finishing slowly = real serialization, not over-constraint.
- The 102 orphan-parallel future activities mark where comprehension is still thin.
