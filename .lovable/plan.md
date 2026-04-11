
# Demo walkthrough reset

## Core correction
The demo should stop teaching tools in isolation and instead mirror the real setup flow already present in the main workspace.

What already exists in the product and must be visible in `/demo`:
- TOC import / section navigation
- automatic pay-item extraction from the current page plus the next 4 pages
- one-time scale calibration that can be propagated across the set
- label annotations
- measurement by drawing first, with GPS as a later branch once the sheet is ready

## Real demo workflow to implement
1. Upload the PDF
2. Go to the index / TOC sheet
3. Import the TOC by boxing the sheet list
4. Open Sections and jump to the Estimate of Quantities sheet
5. Import pay items automatically from the current page + next 4 pages
6. Open Sections and jump to the work sheet to measure
7. Calibrate one known dimension on that sheet
8. Apply that calibration as the document default
9. Select a pay item
10. Measure it:
   - draw manually, or
   - if geolocation is available, continue into GPS calibration + trace
11. Add a text label / note
12. Unlock free use of the demo

## UI changes
- Replace the demo’s custom mobile nav with the real workflow nav: Plans / Items / Sections / Summary
- Keep Scale and Label as visible tools, not hidden behind walkthrough wording
- Add explicit demo actions for:
  - Import TOC
  - Import Pay Items
  - Apply Scale to All Sheets
- On desktop, show a real sections/items rail instead of a pay-item-only panel
- Manual “Add Item” remains fallback, not the primary path

## Implementation approach
Use the same workflow logic already in the main workspace, but keep state local/browser-only in the demo.

In `src/pages/Demo.tsx`:
- reuse TOC import flow from the main workspace (`tocSelect` + region extraction)
- reuse pay-item import flow (`extractPayItemsFromPage` on current page through current+4)
- reuse calibration propagation via `copyCalibrationToPages`
- wire Sections and Items into the demo layout instead of a custom stripped-down panel
- keep GPS as the measurement branch after scale + item selection, not as the opening experience

## Walkthrough behavior
Use manual “Next” only when the app cannot infer intent:
- user is on the TOC sheet
- user is on the Estimate of Quantities sheet
- user is on the target work sheet

Auto-advance only on real milestones:
- PDF loaded
- TOC imported
- pay items imported
- calibration created
- calibration applied beyond the current page
- pay item selected
- first measurement created
- first label created

If extraction fails, do not skip ahead. Keep the user on that step and explain the correction:
- TOC step: tighten the selection around the sheet list
- pay-item step: navigate to the Estimate of Quantities page and retry

## Important UX correction
The first successful scale calibration in the demo should immediately surface a clear choice:
- Apply to all sheets
- Apply to a range

That makes the “document default scale” behavior obvious instead of hiding it behind a tiny copy affordance.

## Files likely affected
- `src/pages/Demo.tsx`
- `src/components/MobileSections.tsx` or demo mobile wiring
- `src/components/MobilePayItems.tsx` or demo mobile wiring
- possibly `src/components/Toolbar.tsx` / `src/components/MobileToolbar.tsx` to make scale propagation explicit

## End state
`/demo` becomes a guided version of the real product workflow: structure the plan set, import contract items, set the default scale once, then measure and label. That is the correct mental model for the app.
