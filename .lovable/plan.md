

# Incomplete Workflows Audit

## 1. Annotation Deletion on Mobile — No Way to Delete
On mobile, when a user taps an annotation in `select` mode, the selected annotation info popup appears (PdfCanvas lines 819-925). However, delete requires pressing `Delete`/`Backspace` keys (line 576-581), which don't exist on mobile. The popup has a "Delete" button, but the `select` tool isn't easily reachable on mobile — `MobileToolbar` auto-switches tools based on pay item unit. There's no dedicated select/edit mode toggle on mobile for managing existing annotations.

## 2. Specs PDF Not Persisted to Cloud
When a user uploads a Standard Specs PDF (`handleSpecsUpload` in Index.tsx), it's loaded into memory (`specsPdf`, `specsPageTexts`) but never saved to cloud storage. If the user closes and reopens the project, specs are gone. The `projects` table has a `specs_storage_path` column but it's never written to. The section page index is also lost.

## 3. Pay Items Import Only Works on Current Page
`handleImportPayItems` (Index.tsx line 308) calls `extractPayItemsFromPage` for the current page only. If pay items span multiple pages (common in construction docs), the user gets a partial import with no way to append from additional pages — calling import again replaces the entire list via `updatePayItems`.

## 4. Project Update Timestamp Never Written
`useProject.persist()` calls `setProject(updated)` locally but never updates `updated_at` in the database. The `projects` table `updated_at` stays frozen at creation time, making the "last updated" display on Dashboard cards misleading.

## 5. Daily Export Doesn't Filter by User
`exportInspectorDaily` (export-utils.ts line 184-191) filters by today's date but explicitly comments that it does NOT filter by user ID, despite accepting `userId` as a parameter. On a shared project, one inspector's daily report includes everyone's annotations.

## 6. Manual Quantities in Summary Not Persisted
`SummaryPanel` maintains `manualQuantities` as local React state (line 34). Non-drawable pay items (TON, LS, USD, MNTH) let users type quantities, but these vanish on re-render or page navigation. They're never saved to the database or project state.

## 7. No Annotation Location/Notes Entry on Mobile
The annotation detail popup (PdfCanvas lines 859-878) shows Location and Notes inputs when an annotation is selected. On mobile, accessing this popup requires select mode (see issue #1), and the popup is positioned `absolute top-3 right-3` which may be clipped or hard to reach. There's no mobile-optimized annotation detail sheet.

## 8. Calibration Copy Has No Granularity
`handleCopyCalibration` (Index.tsx line 320) copies calibration to ALL other pages indiscriminately. Construction plan sets often have different scales per sheet group (e.g., plans at 1"=20', details at 1"=10'). There's no UI to select which pages to copy to.

## 9. TOC Import Fires Twice on Touch
In `handleOverlayTouchEnd` (PdfCanvas line 735-746), when `tocSelect` drag ends, it calls `onTocRegionSelected` directly. But `handleImportToc` (line 545-550) also calls `onTocRegionSelected` when the user clicks "Import TOC" on the confirmation popup. The touch path bypasses the confirmation entirely — the TOC gets imported without the user confirming the selection.

## 10. Undo/Redo State Not Reactive
`canUndo`/`canRedo` (use