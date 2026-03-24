

# Half Measures — Next Iteration

## What's Still Broken

### 1. Mobile Select Mode Unreachable
When a pay item is selected, `handleActivePayItemChange` (Index.tsx line 423-428) force-switches the tool to line/polygon/count based on unit. The MobileToolbar shows Select/Pan/Calibrate but there's no way to switch BACK to select after a pay item is active — tapping Select in the toolbar works, but the moment you tap a pay item again you lose it. More critically, there's no obvious UX affordance telling mobile users they CAN tap Select to edit existing annotations. Add a persistent floating "Edit" FAB on mobile that toggles select mode, visually distinct from the toolbar.

### 2. Annotation Updates Not Persisted to DB
`updateAnnotation` in `useProject.ts` (need to verify) — when a user changes Location, Notes, or manualQuantity on an annotation via the popup or MobileAnnotationSheet, the change is applied to local state but may not be written to the database. Every `onUpdate` call from the annotation editing UI needs to hit the DB.

### 3. Dashboard Has No PM Progress View
The plan called for an expandable project detail showing per-inspector annotation breakdown and pages-annotated-vs-total. Still just flat cards with aggregate counts. PMs clicking a project card navigate away — there's no way to see team activity without entering the workspace.

### 4. No Online Presence Indicator
Claimed "real-time sync" but no visual indicator that other team members are currently viewing the same project. Supabase Presence API is available but unused.

### 5. CSV/PDF Export Missing Contract & Variance Columns
SummaryPanel now shows Contract Qty and Variance % in the table, but `exportCsv` and `exportPdfReport` in `export-utils.ts` don't include these columns. The export doesn't match what users see on screen.

## Fixes

### File: `src/pages/Index.tsx`
- Add a floating "Edit" FAB on mobile (visible when `mobileTab === 'canvas'` and annotations exist) that sets `toolMode` to `'select'`
- Visual: a small circular button bottom-right above the tab bar with MousePointer2 icon, highlighted when in select mode

### File: `src/hooks/useProject.ts`
- Verify `updateAnnotation` persists to DB — if missing, add `supabase.from('annotations').update(...)` call
- Fields to sync: `manual_quantity`, `location`, `notes`, `pay_item_id`

### File: `src/pages/Dashboard.tsx`
- For PM/admin projects, add a collapsible detail section below each project card
- On expand, lazy-fetch: annotations grouped by `user_id` (join profiles for names), distinct pages with annotations vs total pages
- Show as a small table: Inspector | Annotations | Last Active

### File: `src/lib/export-utils.ts`
- Add `contractQuantity` and variance % columns to both `exportCsv` and `exportPdfReport`
- Pass `payItems` with their `contractQuantity` values (already available)

### File: `src/hooks/useProject.ts` (presence)
- Add Supabase Presence channel tracking for the project
- Track `{ userId, name }` in presence state
- Expose `onlineUsers` from the hook

### File: `src/pages/Index.tsx` (presence indicator)
- Show small avatars/dots in the toolbar area indicating other active users
- "2 others online" chip, subtle and non-intrusive

## Files Modified
1. `src/hooks/useProject.ts` — fix updateAnnotation DB sync, add presence
2. `src/pages/Index.tsx` — mobile select FAB, presence indicator
3. `src/pages/Dashboard.tsx` — expandable PM progress detail
4. `src/lib/export-utils.ts` — add contract qty & variance to exports

