

# Expanding Scope: Claims vs Reality Audit

## What We Claim (Landing Page + Features)

The landing page and feature cards promise:

1. **PDF Plan Viewer** — "navigate seamlessly between sheets with a table of contents"
2. **Precision Calibration** — "One calibration click and every measurement is accurate"
3. **Smart Annotations** — "Draw lines, polygons, and counts — quantities auto-calculate"
4. **Pay Item Management** — "Import pay items from specs, assign unit prices, track contract quantities vs. measured"
5. **Role-Based Collaboration** — "Project managers configure; inspectors measure. Everyone stays in sync"
6. **Real-Time Sync** — "Annotations appear instantly across all team members' screens. No refresh, no waiting"
7. **For PMs**: "Create projects, set calibrations, import pay items, assign inspectors, review progress, export summary reports for billing"
8. **For Inspectors**: "Open assigned projects, annotate with pre-configured pay items, override quantities with field actuals, export daily logs"

## What Actually Works vs What Doesn't

### Real-Time Sync — **Completely Missing**
The landing page headline feature. Zero implementation. No Supabase Realtime subscriptions. No `postgres_changes` listeners. Annotations are fetched once on project load and never update. Two users on the same project see stale data.

### "Review Progress" for PMs — **No Mechanism**
PMs cannot see what inspectors have done without opening each project, and even then there's no activity feed, no progress dashboard, no notification system. The Dashboard shows annotation count but not who did what or when.

### Contract Quantity vs Measured Tracking — **Incomplete**
The SummaryPanel shows measured quantities but doesn't display contract quantities side-by-side for comparison. The PDF export does show contract qty, but the in-app summary table has no "Contract Qty" column and no variance/percentage indicator. The whole value proposition of "track contract vs measured" is buried.

### Inspector Daily Export — **Partially Broken**
- `exportInspectorDaily` accepts `inspectorName` param but it's always passed as empty string `''`
- Filter logic is weak: `if (userId && a.userId && a.userId !== userId)` — if annotation has no `userId`, it's included in everyone's report
- No date picker — locked to today only, can't export yesterday's work

### Manual Quantities Not Persisted
`SummaryPanel` `manualQuantities` is React state only. Non-drawable items (TON, LS, USD, MNTH) let you type quantities, but they vanish on re-render. The `updateManualQty` function overwrites `contractQuantity` on the pay item as a workaround — this corrupts the original contract quantity.

### No Annotation Location/Notes on Mobile
The landing page shows mobile as a key use case (field inspectors). But annotation detail entry (Location, Notes) requires `select` mode which is hard to reach on mobile. No dedicated mobile annotation detail sheet.

### No Notification System
When an admin invites someone, when a PM assigns an inspector to a project — the user has no way to know unless they check the app. No email notifications, no in-app notifications.

### Missing "Progress Review" Dashboard
PMs see the same flat project list as everyone. No way to see: which pages have been annotated, percentage complete, which inspectors are active, annotation timeline.

### No Multi-Page Pay Item Import
`handleImportPayItems` extracts from current page only. Pay item tables in construction PDFs commonly span 2-5 pages. No way to append from additional pages.

## Proposed Fixes (Priority Order)

### 1. Real-Time Annotations (addresses the #1 headline claim)
- Add Realtime subscription in `useProject` for the `annotations` table filtered by `project_id`
- On `INSERT`/`UPDATE`/`DELETE` events from other users, merge into local state
- Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.annotations;`
- Show a subtle indicator when other users are active ("2 team members online")

### 2. Contract vs Measured Summary Column
- Add "Contract Qty" and "Variance %" columns to `SummaryPanel` table
- Color-code: green when measured ≤ contract, amber when close, red when over
- Same columns in CSV and PDF exports (PDF export already has contract qty)

### 3. Fix Daily Export
- Pass `profile.full_name` as `inspectorName` instead of empty string
- Add date picker to Summary panel (default today, allow selecting past dates)
- Strictly filter by `userId` — don't include annotations without a userId

### 4. Persist Manual Quantities as Annotations
- Instead of corrupting `contractQuantity`, save non-drawable quantities as annotations with `type: 'manual'` and `manualQuantity` field
- This makes them persist to the database and appear in realtime

### 5. Mobile Annotation Details Sheet
- When tapping an annotation on mobile, open a bottom sheet with Location, Notes, and Delete
- Replace the desktop-only absolute-positioned popup

### 6. PM Progress Dashboard
- Add a "Progress" tab or expandable section on Dashboard for PMs
- Per-project: pages annotated / total pages, annotation count by inspector, last activity timestamp
- Fetch via a simple query joining annotations + profiles grouped by project

### 7. Invitation Email Notifications
- When PM adds inspector to project via TeamManager, send a notification
- Use a backend function to send a simple "You've been added to [Project]" email

### 8. Multi-Page Pay Item Import
- Change "Import Pay Items" to scan current + next N pages (configurable, default 5)
- Merge by itemCode (already implemented for single page)

## Files Modified
1. `src/hooks/useProject.ts` — Realtime subscription for annotations
2. `src/components/SummaryPanel.tsx` — contract qty column, date picker, manual qty fix
3. `src/pages/Index.tsx` — pass inspector name to daily export, multi-page import
4. `src/pages/Dashboard.tsx` — progress indicators for PMs
5. `src/lib/export-utils.ts` — fix daily export filtering
6. `src/components/PdfCanvas.tsx` — mobile annotation detail sheet
7. **Migration** — enable realtime on annotations table

