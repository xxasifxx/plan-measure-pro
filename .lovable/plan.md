# Finish Documents polish + UI/UX pass

## 1. Single-file delete confirmation copy
Update the per-row delete confirm dialog in `src/pages/Documents.tsx` to clearly say the file is moving to Trash (recoverable for now), not permanently deleted. Mirror wording for the bulk delete confirm so they're consistent. No logic change.

## 2. Empty Trash confirmation dialog
Currently "Empty Trash" hard-deletes immediately. Add an AlertDialog before `hardDeleteDocument` loops, naming the file count and warning the action is permanent and irreversible. Same component pattern as existing bulk delete dialog. Frontend only.

## 3. Uploader avatars in Versions dialog
The Versions dialog lists historical rows with timestamp + version number only. Add the uploader avatar + display name beside each version row, reusing `useUploaderProfiles`, `initialsOf`, `displayName`, and `relativeTime` helpers already added in `Documents.tsx`. No new query — the profiles map already covers these user IDs.

## 4. UI/UX review pass
After 1-3 ship, walk the Documents page at desktop (1440) and mobile (390) viewports:
- Folder tree: spacing, counts alignment, Trash node styling vs regular folders, drop-target highlight contrast.
- File table: sort header affordance, checkbox column width, uploader column truncation, action button density.
- Bulk action bar: sticky offset, contrast on dark/light surfaces, mobile wrap behavior.
- Trash view: clear visual distinction from normal folder view, restore/delete-forever button hierarchy.
- Mobile FAB: doesn't overlap bulk bar; folder selector readable.
- Empty states for: no folders, empty folder, empty trash.

Capture screenshots, list concrete issues, and propose fixes in a follow-up (no code in this step).

## Technical notes
- All changes in `src/pages/Documents.tsx`; helpers/hooks already exist in `src/hooks/useDocuments.ts`.
- No schema, no new dependencies.
- AlertDialog component already imported.
