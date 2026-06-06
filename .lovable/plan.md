## Correction
You’re right. The current XML was not an accurate P6 Professional export. It was a minimal hand-built object graph with fields I assumed P6 would accept. That was the wrong strategy for this task.

The target is not “make our parser happy.” The target is: **generate a P6 Professional 17.7 import file that carries the TakeoffPro development schedule as a usable progress-tracking schedule.**

## Revised plan

### 1. Treat the uploaded P6 export as the schema reference
Use `EC00620.xml` as the canonical P6 Professional 17.7 export dialect:

- Namespace:
  ```text
  http://xmlns.oracle.com/Primavera/P6Professional/V17.7/API/BusinessObjects
  ```
- Include the matching `xsi:schemaLocation`.
- Use P6 Professional conventions from the valid file:
  - `xsi:nil="true"` fields instead of omitted nullable fields.
  - `0` / `1` booleans instead of `true` / `false`.
  - fractional percent values where P6 exports them (`1` = 100%).
  - real P6 activity field set/order, not our reduced field set.
  - top-level reference objects before `<Project>` where required.

### 2. Stop exporting a toy project shell
Replace the current minimal `<Calendar><Project>` file with a proper P6 Professional export shell:

- `<Currency>`
- `<OBS>`
- `<Calendar>` using the valid file’s global calendar shape
- `<Project>` with real P6 project defaults:
  - activity default type/calendar/duration/percent-complete fields
  - `OBSObjectId`
  - `ParentEPSObjectId`
  - `WBSCodeSeparator`
  - `WBSObjectId` pointing to the root WBS
  - planned start, scheduled finish, data date, status

### 3. Preserve the actual purpose: project progress tracking
Keep the TakeoffPro development plan as the schedule content:

- WBS = phases and implementation streams.
- Activities = generated dev work items from `docs/wbs-dev.activities.json`.
- Milestones = M0–M6.
- Status = completed / in-progress / not-started from the development evidence.
- Percent complete = carried into P6 fields correctly.
- Actual start/finish = emitted only when valid for the activity status.
- Planned/remaining duration = based on the generated schedule model, not random placeholders.
- Relationships = single-workflow sequencing where applicable, not assumed infinite parallel execution.

### 4. Emit full P6-shaped WBS records
Update every generated WBS node to include the fields P6 Professional exports, including:

- `AnticipatedFinishDate xsi:nil="true"`
- `AnticipatedStartDate xsi:nil="true"`
- `Code`
- EV default fields
- `GUID`
- independent ETC fields
- `Name`
- `OBSObjectId`
- `ObjectId`
- `OriginalBudget`
- `ParentObjectId` or `xsi:nil="true"`
- `ProjectObjectId`
- `SequenceNumber`
- `Status`
- `WBSCategoryObjectId xsi:nil="true"`

### 5. Emit full P6-shaped Activity records
Replace the current reduced activity object with the real P6 Professional activity field shape from the valid export:

- actual/planned/remaining labor and non-labor units/cost fields
- `ActualDuration`
- `AtCompletionDuration`
- `AutoComputeActuals`
- `CalendarObjectId`
- `DurationPercentComplete`
- `DurationType`
- `EstimatedWeight`
- expected/external/early/late date fields with `xsi:nil="true"` where blank
- `FinishDate`
- `GUID`
- `Id`
- `LevelingPriority`
- `Name`
- `ObjectId`
- `PercentComplete`
- `PercentCompleteType`
- `PhysicalPercentComplete`
- `PlannedDuration`
- `PlannedStartDate`
- `PlannedFinishDate`
- nil constraint/suspend/resume fields
- `ProjectObjectId`
- `RemainingDuration`
- `StartDate`
- `Status`
- `Type`
- `UnitsPercentComplete`
- `WBSObjectId`

### 6. Emit relationships in the exact P6 Professional shape
Keep relationships inside `<Project>`, but use the valid export’s child ordering and fields:

```xml
<Relationship>
  <Lag>0</Lag>
  <ObjectId>...</ObjectId>
  <PredecessorActivityObjectId>...</PredecessorActivityObjectId>
  <PredecessorProjectObjectId>...</PredecessorProjectObjectId>
  <SuccessorActivityObjectId>...</SuccessorActivityObjectId>
  <SuccessorProjectObjectId>...</SuccessorProjectObjectId>
  <Type>Finish to Start</Type>
</Relationship>
```

### 7. Replace the meaningless parser self-proof tests
The previous tests proved only that our own parser could read our own XML. That is not useful for P6 import compatibility.

Replace/add tests that compare the generated export against the known-good P6 Professional 17.7 export structure:

- namespace and `schemaLocation` must match P6 Professional 17.7
- required top-level reference objects must exist
- project must include required P6 defaults and `WBSObjectId`
- WBS objects must include the valid-export field set
- activities must include the valid-export field set
- nullable fields must use `xsi:nil="true"` instead of disappearing
- percentages must use P6’s exported numeric convention
- every activity references an existing project, WBS, and calendar
- every relationship references existing activities

These tests are not “proof that P6 will import it.” They are guardrails to stop me from producing another fake-minimal XML file.

### 8. Regenerate the actual deliverable
After updating `scripts/build-dev-pmxml.mjs`, regenerate:

```text
public/exports/takeoffpro-dev.xml
```

That file remains the deliverable for retrying the P6 import.

## Acceptance criteria
This is only done when the generated file is a P6 Professional 17.7-shaped schedule export for the TakeoffPro development project, with real progress/status/duration/relationship data preserved, and no longer a minimal XML hallucination that only satisfies local parser tests.