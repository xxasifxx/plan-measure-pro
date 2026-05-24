## Plan — finish the Documents workspace, in order

Three remaining items from the prior assessment. I'll build them in this sequence so each one stands alone and can be reviewed before the next.

---

### 1. Drag-to-move (file rows → folder tree)

**Goal:** PMs can grab a file row (or several selected rows) and drop it on any folder in the left tree to move it. Inspectors don't get this — read-only on non-uploadable folders stays enforced.

**Behavior**
- Each file row becomes `draggable`. If the row is part of the current multi-select, dragging moves the whole selection; otherwise just that row.
- Folder tree nodes become drop targets. On `dragover` the hovered folder gets a highlighted ring + background tint; the current folder and any folder the user lacks write access to reject the drop (cursor = `not-allowed`, no highlight).
- On drop: call existing `moveDocument` mutation per file (already in `useDocuments`), then invalidate. Toast: "Moved N file(s) to {folder}".
- Mobile: skipped — touch drag is unreliable; the existing Move dialog stays the mobile path.

**Files**
- `src/pages/Documents.tsx` — add `onDragStart` on rows, `onDragOver`/`onDrop` on tree nodes, a `dragOverFolderId` state for the highlight.

---

### 2. Uploader metadata (avatar + name on every row)

**Goal:** Replace the bare timestamp in the "Uploaded" column with `<avatar> Name · relative time`, so the audit trail is legible at a glance. Versions dialog gets the same treatment.

**Approach**
- Add a `useProjectMembers(projectId)` helper (or extend `useDocuments`) that pulls `profiles` (id, full_name, email) for every distinct `uploaded_by` in the current folder + version chains. RLS already lets project creators read profiles; for inspectors we'll fall back to "Team member" if a name isn't visible.
- Build initials from `full_name` (or email local-part) for the `AvatarFallback`. No avatar image field exists today, so initials only — clean and consistent.
- Row layout: small (24px) avatar, name in `text-sm`, timestamp in `text-xs text-muted-foreground` underneath, stacked. Keeps column compact.

**Files**
- `src/hooks/useDocuments.ts` — export a small `useUploaderProfiles(ids)` hook, or inline the query in the page.
- `src/pages/Documents.tsx` — swap the timestamp cell; reuse in the Versions dialog list.

---

### 3. Trash / undo (soft delete with restore)

**Goal:** Deletes go to a Trash bin instead of being permanent. PMs can restore or empty. Inspectors can't see Trash.

**Schema change (migration)**
- Add `deleted_at timestamptz null` and `deleted_by uuid null` to `documents`.
- Add `deleted_at timestamptz null`, `deleted_by uuid null` to `document_folders` (optional — keeps folder deletes recoverable too).
- Update RLS for `documents`:
  - SELECT policy unchanged (members still see rows), but the page query filters `deleted_at IS NULL` by default.
  - Add UPDATE policy so PMs/admins can set/clear `deleted_at` (already covered by existing "PMs manage documents" ALL policy).
- No destructive DROP; the existing hard-delete code path is replaced with an UPDATE setting `deleted_at = now()`.

**UI**
- Tree gains a virtual "Trash" node at the bottom (PM/admin only) with a count badge. Selecting it shows all soft-deleted docs for the project across folders, with the original folder shown in a column.
- Each trashed row gets **Restore** (clears `deleted_at`, returns to original folder) and **Delete forever** (the current hard delete: storage `remove` + row `delete`).
- Header action: **Empty Trash** (confirm dialog).
- Replace the current single-delete and bulk-delete with soft delete. Toast: "Moved to Trash" with an **Undo** action that calls restore inline (5s).
- Storage blobs stay in place while in Trash; only "Delete forever" / "Empty Trash" remove them.

**Files**
- New migration: add columns, no policy churn beyond what's listed.
- `src/hooks/useDocuments.ts` — `softDeleteDocument`, `restoreDocument`, `hardDeleteDocument`, `useTrash(projectId)` query, filter main query by `deleted_at IS NULL`.
- `src/pages/Documents.tsx` — Trash node in tree, Trash view, undo toast wiring.

---

### Order of execution

1. **Drag-to-move** — frontend only, no schema. Ship first.
2. **Uploader metadata** — frontend + one small profiles query.
3. **Trash/undo** — migration + hook + UI; biggest change, lands last so the earlier two are already in users' hands.

Approve and I'll build #1, then pause for the OK before moving to #2 and #3 — or say "all three" and I'll chain them.
