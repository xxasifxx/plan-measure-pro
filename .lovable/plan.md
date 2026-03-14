

## Annotation System: Failure Analysis

After reviewing the full codebase, the annotation system has several bugs and missing guardrails that prevent it from completing its objective of accurately measuring quantities from PDF plans.

### Critical Bugs

**1. SY measurement is wrong**
In `PdfCanvas.tsx` line 363, when a polygon is closed on an SY pay item, the raw SF value is stored as the measurement but labeled as SY. The `÷ 9` conversion is never applied. Every SY annotation reports 9x the correct value.

**2. No guard against drawing without a pay item selected**
`activePayItemId` can be an empty string. Drawing a line, polygon, or count marker with no pay item silently creates an orphaned annotation that has `payItemId: ""` — it renders with fallback color `#999`, can't be found in the summary, and pollutes the data.

**3. No guard against drawing without calibration**
For lines: clicking two points with no calibration silently discards the drawing (line 317-320) with no feedback.
For polygons: same silent discard on double-click (line 343). The user draws an entire polygon and it vanishes.
For count: no calibration needed, but there's no validation that the pay item is EA — the toolbar blocks tool *selection* but not the actual *click action* if tool state gets out of sync.

**4. Polygon label rendering ignores actual unit**
Lines 189-191 only check for `depth` to decide between "CY" and "SF". A SY polygon shows "SF". The stored `measurementUnit` field is ignored in the rendering.

**5. Deleting a pay item orphans its annotations**
`deletePayItem` in the sidebar removes the pay item but leaves all associated annotations in the project. These become unselectable ghost shapes with no pay item reference.

### Missing Capabilities

**6. No annotation list in sidebar**
Users can't see what's been drawn per pay item — no count of annotations, no running total. The only way to review is to visually scan each page.

**7. No way to reassign an annotation to a different pay item**
`updateAnnotation` exists in `useProject` but is never exposed to the UI. If you draw on the wrong pay item, you must delete and redraw.

**8. Edit/delete buttons on pay items are invisible**
The edit and delete buttons use `opacity-0 group-hover:opacity-100` but the parent `div` doesn't have the `group` class, so the buttons never appear on hover.

### Plan

**Fix the bugs first, then add the missing sidebar annotation list.**

#### A. Fix SY conversion (PdfCanvas.tsx)
When creating a polygon annotation for an SY pay item, divide `areaSF` by 9 before storing as measurement.

#### B. Add drawing guards (PdfCanvas.tsx)
- Before any draw action (line click, polygon click, count click), check that `activePayItemId` is non-empty and maps to a valid pay item. Show a toast if not.
- When a line or polygon is silently discarded due to missing calibration, show a toast telling the user to calibrate first.

#### C. Fix polygon label rendering (PdfCanvas.tsx)
Use `ann.measurementUnit` instead of checking `ann.depth` to decide the label text. This correctly handles SF, SY, and CY.

#### D. Cascade-delete annotations when a pay item is deleted (ProjectSidebar.tsx / useProject.ts)
Add a `removeAnnotationsForPayItem(payItemId)` function to `useProject`, and call it when a pay item is deleted.

#### E. Fix pay item edit/delete button visibility (ProjectSidebar.tsx)
Add `group` class to the parent div of each pay item row so hover-reveal works.

#### F. Add annotation summary per pay item in sidebar (ProjectSidebar.tsx)
Below each pay item in the sidebar, show a small count: "3 annotations · 245.2 SF" derived from filtering `project.annotations` by `payItemId`. This requires passing `annotations` to the sidebar.

#### G. Expose annotation reassignment (PdfCanvas.tsx)
In the selected annotation popup, add a pay item dropdown to reassign the annotation to a different pay item (calling `updateAnnotation`).

