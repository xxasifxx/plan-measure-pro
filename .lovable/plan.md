## Plan: make `takeoffpro-dev.xml` importable in P6

The import log maps exactly to objects in `public/exports/takeoffpro-dev.xml`: 1 project, 1 calendar, 161 activities, 140 relationships, 1 UDF definition, and 65 UDF values. That means the file is being read, but P6 is rejecting the object graph. I’ll fix the generator instead of hand-editing the XML.

### 1. Remove the fragile inline UDF shape
- Replace the current project-nested `<UDFType>` plus activity-nested `<UDF>` entries with either:
  - no UDF objects at all, keeping QA status only in the activity name suffix, or
  - valid top-level `<UDFType>` / `<UDFValue>` objects with required object/project/activity references.
- For fastest import recovery, I’ll use the no-UDF path first because the import log shows `UserDefinedField` and `UserDefinedFieldValue` are part of the failed chain.

### 2. Make calendar and project references P6-safe
- Change the generated calendar from a global calendar with a hard-coded object id to a project-scoped/default calendar where needed.
- Ensure the project has a stable root WBS and all WBS nodes parent under that root instead of multiple top-level WBS nodes.
- Keep all object ids numeric and internally unique.

### 3. Repair activity fields for P6 import semantics
- Emit dates consistently in P6-friendly timestamp format.
- Keep `ProjectObjectId`, `WBSObjectId`, and `CalendarObjectId` on every activity.
- For milestones, use start/finish/planned dates consistently and zero durations.
- For completed and in-progress activities, avoid impossible date/status combinations.

### 4. Repair relationships after activity import is stable
- Keep relationships only between emitted activity object ids.
- Add required project references and numeric lag.
- If relationships still import-fail after activities import, temporarily emit an activity-only diagnostic XML variant so we can isolate relationship schema issues without losing the project/activity import.

### 5. Add a real structural QA test
- Extend `src/test/dev-pmxml.test.ts` beyond the app parser self-proof.
- Assert counts and invariants that P6 cares about: no inline UDFs, one calendar, one project, unique object ids per object type, every activity has project/WBS/calendar refs, every relationship references existing activities, and all activity WBS refs exist.

### 6. Regenerate the downloadable XML
- Re-run the generator to update `public/exports/takeoffpro-dev.xml`.
- Verify the emitted XML object counts match the expected import surface and that no rejected UDF objects remain.