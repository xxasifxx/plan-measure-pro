
# Demo vs Real App — Bug Fix Pass

## Bugs Found

### 1. TOC region scaling is wrong (critical)
**Demo** (line 183): passes `rect` directly to `extractTextFromRegion`
**Real app** (line 339): scales the rect first: `const scaledRect = { x1: rect.x1 * scale, y1: rect.y1 * scale, x2: rect.x2 * scale, y2: rect.y2 * scale }`
Result: TOC import silently extracts from the wrong region and returns nothing or garbage.

### 2. Missing mobile GPS setup button
**Real app** (lines 584-596): shows a floating "GPS" button at bottom-right when `!geoCalibration`
**Demo**: only shows GPS trace controls when `geoCalibration && activePayItem && currentCalibration` — there's no way to *start* GPS calibration on mobile

### 3. Missing mobile select/edit FAB
**Real app** (lines 658-677): floating MousePointer2 button to toggle select mode when annotations exist
**Demo**: missing entirely — no way to tap-select annotations on mobile

### 4. Missing MobileAnnotationSheet
**Real app** (lines 701-710): shows annotation detail/edit sheet when an annotation is selected on mobile
**Demo**: missing — selecting an annotation on mobile does nothing useful

### 5. MobileTabBar sectionCount falls back wrong
**Real app** (line 684): `sectionCount={(project?.toc || []).length || totalPages}` — shows total pages as fallback
**Demo** (line 782): `sectionCount={toc.length}` — shows 0, making Sections tab look empty/broken

### 6. MobilePayItems gets filtered annotations
**Real app** (line 607): passes `project?.annotations || []` (all annotations including manual)
**Demo** (line 587): passes `annotations.filter(a => a.type !== 'manual')` — manual quantities won't show in item totals

### 7. Desktop sidebar is a dead stub
**Demo** (lines 539-561): hardcoded "Sections" tab header with no switching to Items. Real app uses `ProjectSidebar` with full tab navigation.

### 8. Missing `readOnly` prop on MobileToolbar
**Real app** (line 527): passes `readOnly={isReadOnly}`
**Demo** (line 531): doesn't pass `readOnly` — not a crash but inconsistent

## Changes

### File: `src/pages/Demo.tsx`

1. **Fix TOC scaling** — add `scale` multiplication to rect before passing to `extractTextFromRegion`, matching Index.tsx line 339

2. **Add mobile GPS setup button** — floating Navigation button at bottom-right when `!showGpsCal && !geoCalibration && pdf`, same as Index.tsx lines 584-596

3. **Add mobile select FAB** — floating MousePointer2 button when canvas tab is active and annotations exist, matching Index.tsx lines 658-677

4. **Add MobileAnnotationSheet** — import and render when `selectedAnnotationId` is set on mobile, matching Index.tsx lines 701-710

5. **Fix MobileTabBar sectionCount** — change from `toc.length` to `toc.length || totalPages`

6. **Fix MobilePayItems annotations prop** — pass unfiltered `annotations` instead of filtering out manual type

7. **Fix desktop sidebar** — add a second column for Items (matching the existing dual-panel layout) with tab switching between Sections and Items, instead of the dead stub

8. **Import MobileAnnotationSheet** — add to imports at top of file

