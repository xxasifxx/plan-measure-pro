## Plan: make the MCFA/P6 schedule reflect what is actually built

### Objective
The P6 XML import should show that the application already has substantial working functionality, while still being honest that much of it needs QA/E2E verification. The current schedule is underreporting because code-present features are being downgraded to generic `In Progress / 50%` when they are really `Built — Requires QA`.

### What I will change

1. **Fix the source status model**
   - Update the development WBS generator so `implemented + code present + not E2E verified` becomes:
     - `status: Completed`
     - `pctComplete: 100`
     - `qaStatus: Requires QA`
   - Keep truly partial items as `In Progress`, but label them `Requires QA` instead of burying that fact.
   - Keep genuinely missing/unbuilt items as `Not Started`.

2. **Preserve QA truth in the P6 XML**
   - Add a clear QA marker to exported PMXML activities, either as a P6 user-defined field if supported by the import structure, and definitely in the activity notes.
   - Notes will make the distinction obvious:
     - `Built — Requires QA`
     - `Verified`
     - `Partial — Requires QA`
     - `Not Started`

3. **Regenerate the planning artifacts**
   - Regenerate `docs/wbs-dev.activities.json`.
   - Regenerate `public/exports/takeoffpro-dev.xml`.
   - Expected effect: many activities currently shown as `In Progress` will become `Completed` with `Requires QA`, instead of making the project look less built than it is.

4. **Update the MCFA pitch wording**
   - Replace language that says the core loop merely “works end-to-end” with a more precise planning message:
     - built features are code-inspected and demonstrable;
     - remaining work is QA, polish, role walkthrough hardening, and deeper P6 integration.
   - Adjust the work breakdown labels so MCFA sees grouped delivery status, not jargony internal scoring.

5. **Verify the result**
   - Inspect the regenerated JSON totals.
   - Inspect the generated XML status distribution.
   - Confirm the downloadable XML at `/exports/takeoffpro-dev.xml` contains the corrected status/QA signal.

### Technical details
Files to update:
- `scripts/build-dev-wbs.mjs`
- `scripts/build-dev-pmxml.mjs`
- `docs/wbs-dev.activities.json` after regeneration
- `public/exports/takeoffpro-dev.xml` after regeneration
- likely small copy/status refinements in `src/pages/McfaPitch.tsx`

Core logic change:
```text
implemented + codePresent + verifiedE2E     -> Completed, 100%, Verified
implemented + codePresent + not verified    -> Completed, 100%, Requires QA
partial + codePresent                       -> In Progress, partial %, Requires QA
missing / no code                           -> Not Started, 0%
```

This keeps the schedule honest: it shows the app is much farther along, but does not pretend QA is complete.