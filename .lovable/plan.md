

# Fix Half Measures — Comprehensive Iteration

## What's Still Broken or Half-Done

After auditing every file, here are the concrete problems remaining:

### 1. Manual Quantities for Non-Drawable Items Still Corrupt Data
**SummaryPanel.tsx line 89-95**: `updateManualQty` calls `onUpdatePayItems` and sets `contractQuantity` to the entered value — this **overwrites the original contract quantity**. The plan said to persist manual quantities as `type: 'manual'` annotations. Never done.

### 2. Mobile: No Select Mode Toggle → Can't Edit/Delete Annotations
`MobileToolbar` shows Select/Pan/Calibrate tools, but when a pay item is selected (`handleActivePayItemChange` line 405-416), the tool auto-switches to line/polygon/count. There's no way for a mobile user to switch back to select mode to tap and edit existing annotations. The `MobileAnnotationSheet` exists but is unreachable because `selectedAnnotationId` never gets set on mobile — the click handler in PdfCanvas only runs in `select` mode.

### 3. Desktop Annotation Popup Not Hidden on Mobile
**PdfCanvas.tsx line 818-925**: The selected annotation popup renders as `absolute top-3 right-3` regardless of viewport. On mobile, both this popup AND the `MobileAnnotationSheet` would render if `selectedAnnotationId` is set. The desktop popup should be hidden on mobile.

### 4. Multi-Page Pay Item Import Never Done
**Index.tsx line 341-363**: `handleImportPayItems` still only scans `currentPage`. The plan said to scan current + next N pages. Never implemented.

### 5. Realtime INSERT Doesn't Check for Duplicates
**useProject.ts line 339-355**: On INSERT event, the annotation is blindly appended. If the local user's own annotation hasn't been excluded (race condition with the `user_id !== userId` check and delayed DB insert), it could appear twice. Need a dedup check by annotation id.

### 6. No Online Presence Indicator
The plan called for "Show a subtle indicator when other users are active." Never done.

### 7. Invitation Redirect URL Uses Origin Header
**invite-user/index.ts line 111-113**: `const siteUrl = req.headers.get("origin") || req.headers.get("referer") || supabaseUrl` — this could resolve to the Supabase URL if Origin is missing, sending the user to a broken link. Should use the published app URL.

### 8. Dashboard Progress View for PMs is Shallow
Project cards show `latest_annotation_at` and `member_count` but no per-inspector breakdown, no pages-annotated-vs-total metric, no expandable detail view. The "review progress" claim remains mostly unmet.

---

## Fixes

### File: `src/components/SummaryPanel.tsx`
- Remove the `updateManualQty` function that corrupts `contractQuantity`
- For non-drawable items, save/load manual quantities as annotations with `type: 'manual'` via a new `onAddAnnotation` / `onUpdateAnnotation` prop
- On mount, read existing `type: 'manual'` annotations to populate the inputs
- When user changes value, upsert the manual annotation (one per pay item)

### File: `src/components/MobileToolbar.tsx`
- Always show the `select` tool in the tools list (it's already there but gets overridden)
- Add a visual indicator (e.g., long-press on canvas or a floating "edit" FAB) that switches to select mode

### File: `src/components/PdfCanvas.tsx`
- Accept an `isMobile` prop (or use the hook internally)
- Hide the desktop annotation popup when mobile (the MobileAnnotationSheet handles it)
- In touch end handler, when in `select` mode and a tap hits an annotation, call `onSelectAnnotation` — this triggers the MobileAnnotationSheet in Index.tsx

### File: `src/pages/Index.tsx`
- Pass `onAddAnnotation` and `onUpdateAnnotation` to SummaryPanel for manual quantity persistence
- Update `handleImportPayItems` to scan current page through current+4 (5 pages), merging by itemCode
- Filter out `type: 'manual'` annotations from the visible canvas annotations (they have no real points)

### File: `src/hooks/useProject.ts`
- In realtime INSERT handler, check `prev.annotations.some(a => a.id === record.id)` before appending to prevent duplicates

### File: `supabase/functions/invite-user/index.ts`
- Replace the origin-sniffing logic with a hardcoded app URL derived from the Referer header or a known constant, falling back to `req.headers.get("origin")`

### File: `src/types/project.ts`
- Add `'manual'` to the Annotation `type` union: `'line' | 'polygon' | 'count' | 'manual'`

### File: `src/pages/Dashboard.tsx`
- For PM/admin users, add an expandable project detail section showing:
  - Annotation count by team member (query `annotations` grouped by `user_id`, join profiles)
  - Pages with annotations vs total pages
- Fetch this data lazily when the user expands a project card

## Files Modified
1. `src/types/project.ts` — add `'manual'` annotation type
2. `src/components/SummaryPanel.tsx` — fix manual qty persistence, stop corrupting contractQuantity
3. `src/components/PdfCanvas.tsx` — hide desktop popup on mobile, improve mobile select-tap
4. `src/components/MobileToolbar.tsx` — ensure select mode is always reachable
5. `src/pages/Index.tsx` — multi-page import, pass annotation handlers to SummaryPanel, filter manual annotations from canvas
6. `src/hooks/useProject.ts` — dedup realtime inserts
7. `supabase/functions/invite-user/index.ts` — fix redirect URL
8. `src/pages/Dashboard.tsx` — expandable progress detail for PMs

