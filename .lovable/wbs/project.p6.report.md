# P6 XML field-coverage report

Generated: 2026-05-29T19:47:23.973Z
Source: `.lovable/wbs/{wbs,activities,relationships,state,links,next}.json`
Output: `.lovable/wbs/project.p6.xml` (+ `.rejected.xml`)

## Coverage

| Field | Coverage | Reason blanks are intentional |
|---|---|---|
| ActivityName        | 669/669 (100.0%) | — |
| ActivityType        | 669/669 (100.0%) | [Task Dependent 242 | Finish Milestone 8 | Level of Effort 419] |
| Status              | 669/669 (100.0%) | [Completed 19 | In Progress 184 | Not Started 466] |
| ActualStart         | 203/669 (30.3%) | Only emitted when lifecycle ∈ {in-flight, paused, dormant, shipped} (D3) |
| ActualFinish        | 19/669 (2.8%) | Only emitted when lifecycle = shipped (D3) |
| PlannedStart        | 0/669 (0.0%) | Never fabricated. TT_LOE activities infer span from successors in P6 (D3b) |
| PlannedDuration     | 572/669 (85.5%) | Only Task Dependent activities; LOE and Milestone do not require it (D1) |
| PercentComplete     | 203/669 (30.3%) | Only set when lifecycle ≠ planned/abandoned (D2) |
| Calendar            | 669/669 (100.0%) | Single default "Lovable 7-day" (D9) |
| NotebookTopics      | 669/669 (100.0%) | Every activity has evidence prose (D5) |
| ActivityCodes       | 4683 assignments across 7 dimensions (D4) | ORIGIN, LIFECYCLE, BLOCKING, VISIBILITY, STREAM, LAYER, HEALTH |
| UDFs                | 669/669 (100.0%) × 6 fields (D6) | LovableActivityId, PrimaryLeafId, CommitCount, DormancyDays, Confidence, DownstreamCount |
| Relationships       | 169 accepted, 0 rejected (audit) | D7 |
| Resources / Costs   | 0 | Skipped — no source signal (D9, D10) |

## What's blank, and why (the anti-blank-field accountant)

- **No PlannedStart anywhere.** Past activities use ActualStart; future activities use Level of Effort, which lets P6 compute their span from successor dependencies. We refuse to fabricate dates.
- **No Resources, Roles, or Costs.** The JSON has no financial or staffing signal. Emitting zeros would lie.
- **No Baseline.** A baseline requires a frozen snapshot we don't maintain.
- **Abandoned activities show "Not Started" in P6.** P6 has no Cancelled status. They're tagged `LIFECYCLE=abandoned` via Activity Code so the filter is one click away.

## How to use in P6

1. File → Import → Primavera P6 (XML) → `project.p6.xml`
2. Group by Activity Code (try LIFECYCLE, ORIGIN, or HEALTH)
3. Filter "Ready to start": Activity Code HEALTH = ready
4. Filter "Dormant but needed": Activity Code HEALTH = dormant-but-needed
5. Open any activity → Notebook tab for evidence + commit SHAs

## What this is not

- Not a CPM-scheduled plan. P6 will offer to schedule on import; running F9 will float undated future activities to the data date. That's expected.
- Not a round-trip format. The XML is generated; edits go in the JSON.
