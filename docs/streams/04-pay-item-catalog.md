# Pay Item Catalog

## Purpose
Manages the lifecycle of pay items within a single project: initial import from the contract PDF, manual add/edit/delete via the sidebar dialog, unit-code grouping for visual distinction, the `drawable` flag that splits measurable items (SF/LF/CY/SY/EA) from manual-entry items (LS/TON/USD/MNTH), cascade deletion of associated annotations when an item is removed, and persistence to `public.pay_items`. This is the authoritative lookup table that field-capture, summary export, and RE review all query against.

## Surfaces (files)
- `src/types/project.ts` — `PayItem` interface, `PayItemUnit` enum, `DRAWABLE_UNITS`, `isDrawableUnit()`, `getPayItemSection()`, `UNIT_LABELS`
- `src/components/ProjectSidebar.tsx` (`savePayItem`, `deletePayItem`, pay-item section) — inline add/edit dialog with unit selector, color picker, unit price and contract quantity fields
- `src/hooks/useProject.ts` (`updatePayItems`, `removeAnnotationsForPayItem`) — persists full pay-item array via delete-all + re-insert; cascade-deletes annotations
- `src/lib/pdf-utils.ts` (`extractPayItemsFromPage`, `getColorForItem`, `SECTION_COLORS`) — heuristic PDF import; section-keyed colors
- `src/pages/Index.tsx` (`handleImportPayItems`) — orchestrates multi-page PDF scan
- `src/components/MobilePayItems.tsx` — mobile-first pay-item selector sheet
- `src/hooks/usePayItemActivityMap.ts` — per-pay-item annotation counts for summary display
- `public.pay_items` — `project_id`, `item_number`, `item_code`, `name`, `unit`, `unit_price`, `color`, `contract_quantity`, `drawable`
- `src/components/SummaryPanel.tsx` — consumes pay items + annotations to render quantity totals

## Acceptance criteria
- Adding a pay item with a drawable unit (SF/LF/CY/SY/EA) sets `drawable: true` and makes line/polygon/count tools available.
- Adding a pay item with a non-drawable unit (LS/TON/USD/MNTH) sets `drawable: false`; appears with a "manual" badge in Toolbar.
- Deleting a pay item removes all its annotations from both local state and `public.annotations`.
- Editing a pay item is reflected immediately in summary panel without page reload.
- Pay items survive a reload (fetched from `public.pay_items` in `Index.tsx:119–124`).
- Items imported from PDF are assigned section-keyed colors matching NJDOT unit code prefix.
- Contract quantity stored and displayed in SummaryPanel as comparison denominator.

## Current state vs criteria
- **drawable flag**: Implemented — `types/project.ts:10–14`; gated tools in `ProjectSidebar` and "manual" badge in `Toolbar.tsx:106–108`.
- **Delete cascade**: Implemented — `ProjectSidebar.tsx:75–78` → `useProject.ts:221–238`.
- **Edit inline**: Implemented — `ProjectSidebar.tsx:64–73`.
- **DB persistence**: Implemented but destructive — `useProject.ts:311` does full `DELETE … WHERE project_id = …` then bulk-insert on every save; concurrent edits clobber each other.
- **Section-keyed colors**: Implemented — `pdf-utils.ts:206–226`.
- **Contract quantity denominator**: Partial — stored and shown but no "% complete" or over-run warning.
- **Contract modifications**: Missing — no `contract_mods` table; quantity changes require manual edits with no audit trail.

## Cross-stream handoffs
- **Receives from project-onboarding**: `handleImportPayItems` produces seed `PayItem[]`.
- **Feeds field-capture**: `payItems` prop passed to `PdfCanvas` (color rendering) and `Toolbar` (active-item pill).
- **Feeds field-capture summary**: `SummaryPanel` receives `payItems` + `annotations`.
- **Feeds RE review**: `daily_report_entries` references `pay_item_id`; `approved-quantities.ts` queries by `item_code`.
- **Seam**: `useProject.updatePayItems(PayItem[])` is the single mutation path.

## Risks / debt
1. `updatePayItems` issues full `DELETE` + bulk `INSERT` on every change — data-loss race if two users edit pay items concurrently.
2. No contract-modification workflow exists; no audit trail for `contract_quantity` bumps.
3. Pay-item color auto-assigned from `SECTION_COLORS` at import; no per-item color picker on mobile.
4. Cascade deletion done client-side via N individual `offlineMutate` calls, not a single server-side DELETE; unreliable on poor connectivity.
