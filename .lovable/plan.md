# Apply Documents UI/UX fixes + broader functionality review

## Part A — Apply the UI/UX fixes (Documents page)

All changes in `src/pages/Documents.tsx` unless noted. No schema, no new deps.

1. **Folder tree polish**
   - Trash node: amber accent on icon + count badge when `trash.length > 0`; muted when empty.
   - Drop target highlight: brighten ring to `ring-2 ring-primary` and add `bg-primary/10` while `dragOverFolderId === node.id`.

2. **File table polish**
   - Sortable headers: always render a faint chevron (up/down/neutral) beside Name / Size / Uploaded; add `title` tooltip.
   - Checkbox column: fixed `w-8 shrink-0`.
   - Uploader column: collapse to single line `Name · 3m ago` below `md`; full two-line stack at `md+`.

3. **Bulk action bar**
   - Bump background to `bg-primary/15` with `border-b border-primary/30` for contrast on dark navy.
   - Below `lg`, hide button label spans, keep icons only; keep "X selected" + Clear text visible.

4. **Trash view distinction**
   - Persistent amber strip above the table when `viewingTrash`: "Viewing Trash — items can be restored or permanently deleted." with Trash2 icon.
   - Table wrapper gets a subtle dashed `border-amber-500/30` while in Trash.

5. **Distinct empty states**
   - No folders at all: "No folders yet — create one to start organizing project documents."
   - Empty regular folder: existing copy.
   - Empty Trash: "Trash is empty. Deleted files will appear here for recovery."

6. **Versions dialog uploader resolution**
   - Extend `useUploaderProfiles` call to also include uploader IDs from the currently-open `versions` list (merge into the `uploaderIds` memo when `versionsFor` is set), so historical version rows show real names instead of "Unknown".

## Part B — Functionality review pass (read-only)

After fixes ship, walk through the live app end-to-end as Admin / PM / Inspector and report a single consolidated findings list (no code in this step). Areas to inspect:

- **Auth & onboarding**: signup → role assignment → invitation acceptance → first-project landing.
- **Project setup**: PDF upload, calibration, TOC parsing, pay items import, standard specs link-up.
- **Takeoff workflow**: tool auto-activation by unit, annotation creation/edit/reassign, geometric vertex editing, undo/redo, real-time sync.
- **Documents (just polished)**: upload, folder ops, versions, trash/restore, drag-to-move, mobile FAB.
- **Daily reports**: draft → submit → RE approve/reject → withdraw; quantity overrides; Excel export.
- **Field mode**: GPS calibration, mobile annotation bottom sheet, status chip shortcuts.
- **Admin Panel**: user/role/project assignment, demo requests inbox.
- **Cross-cutting**: 404s, broken links, console errors, network failures, slow queries, role-gated empty states.

Deliverable: a categorized findings list (Critical / High / Medium / Low) with file/route references and a recommended next-step list. The user decides what to fix.

## Technical notes

- Part A edits are isolated to `src/pages/Documents.tsx`; uploader merge needs the `versionsFor` state already in scope.
- Part B uses code reading + browser navigation; no migrations or writes.
