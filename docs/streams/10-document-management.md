---
stream_key: 10-document-management
paths:
  - src/pages/Documents.tsx
  - src/hooks/useDocuments.ts
  - supabase/storage/project-documents
shared_paths: []
---
# Document Management

## Purpose
Provides a full project file repository — folder tree, versioned document upload, inline preview (PDF and images), soft-delete trash with undo, and bulk operations — for all formal construction documents (plans, specs, RFIs, submittals, shop drawings, change orders, daily reports, photos, as-builts, correspondence). It is the "filing cabinet" layer; distinct from photo-evidence (which is annotation-centric) and standard-specifications (which parses a single spec PDF for in-app lookup).

## Surfaces (files)
- `src/pages/Documents.tsx` — Primary page (1,312 lines): three-pane layout (folder tree, breadcrumb, document list), upload queue with per-file progress, inline preview modal (PDF via `<iframe>`/`<img>`), multi-select bulk download/delete, version history drawer, move-to-folder drag-less modal, empty-trash dialog
- `src/hooks/useDocuments.ts` — Data layer: `useFolders` (CRUD on `document_folders`), `useDocuments` (query + version-chain dedup, `uploadFiles`, `renameDocument`, `moveDocument`, `deleteDocument`/soft, `restoreDocument`, `hardDeleteDocument`, `uploadNewVersion`, `getDownloadUrl`), `useTrash`, `useUploaderProfiles`, `fetchDocumentVersions`
- `public.document_folders` — Table: `parent_id` (self-referential tree), `is_system` (boolean), `system_kind` (enum: plans, specs, rfis, submittals, shop_drawings, change_orders, daily_reports, photos, as_builts, correspondence)
- `public.documents` — Table: `folder_id`, `storage_path`, `version` (integer), `replaces_document_id` (self-referential chain), `source_kind` (manual_upload / restore), `deleted_at` / `deleted_by` (soft delete)
- `supabase/storage/project-documents` — Storage bucket; paths follow `{projectId}/{docId}.{ext}`

## Acceptance criteria
- Uploading a file with the same name as an existing document in the same folder automatically creates a new version (`version + 1`) linked via `replaces_document_id`; only the latest version is shown in the list.
- Soft-deleting a document moves it to Trash (sets `deleted_at`); an Undo toast within the session restores it; "Empty Trash" permanently removes DB rows and storage blobs.
- Inspectors may only upload to `photos` or `daily_reports` system folders; managers/admins can upload anywhere.
- Folder tree correctly renders nested hierarchy from `parent_id`; system folders sort before user folders alphabetically.
- PDF and image documents open in a signed-URL preview modal without downloading; non-previewable types trigger download.
- Version history drawer shows the full chain of `replaces_document_id` links in descending order; clicking "Restore" creates a new head version pointing at the older blob.
- Folder file counts in the sidebar reflect only non-deleted, non-superseded (head) documents.

## Current state vs criteria
- **Automatic versioning on same-name upload** — implemented in both `useDocuments.uploadFiles` and the inline `runUploads` in `Documents.tsx`; deduplication by `replaces_document_id` is correct (`useDocuments.ts:141-142`).
- **Soft delete + undo toast** — implemented; `softDeleteWithUndo` in `Documents.tsx:255-280` uses `ToastAction` with inline undo mutation.
- **Role-based upload restriction** — implemented; `inspectorCanUploadHere` checks `system_kind` (`Documents.tsx:168-170`); PMs/admins bypass.
- **Folder tree hierarchy** — implemented; `buildTree` + recursive `pathOf` (`Documents.tsx:83-109`); system folders sorted first (`useDocuments.ts:62-64`).
- **PDF/image preview** — implemented; `isPreviewable` gate, signed URL via `getDownloadUrl` (`useDocuments.ts:300-304`), rendered in modal.
- **Version history / restore** — implemented; `fetchDocumentVersions` walks the `replaces_document_id` chain; `restoreVersion` inserts a new head row (`Documents.tsx:302-322`).
- **Folder counts** — implemented; counts only head (non-replaced), non-deleted rows (`Documents.tsx:172-193`).
- **Folder move** — `moveFolder` mutation present in `useFolders` but drag-and-drop UI is absent; move is available only for documents via a modal.

## Cross-stream handoffs
- **Feeds from**: authentication stream — `useAuth` provides `isManager`/`isAdmin` for upload gating; `uploaded_by` is `user.id`.
- **Feeds into**: standard-specifications — `projects.specs_storage_path` can be set to a document's `storage_path` to enable SpecViewer; no automated bridge currently.
- **Feeds into**: daily-report-lifecycle — `daily_reports` system folder is the intended home for exported daily report Excel files; no automated insertion from `exportApprovedInspectorDaily`.

## Risks / debt
1. **`fetchDocumentVersions` fetches all project documents** — the version-chain query selects the entire `documents` table for a project (`useDocuments.ts:364`) and walks the chain in JS; for large projects this is O(N) on every version drawer open.
2. **Blob orphan risk on insert failure** — `runUploads` in `Documents.tsx` does a best-effort `remove` on insert failure, but the `useDocuments.uploadFiles` mutation does the same; the duplicate path means two slightly different cleanup paths could diverge.
3. **No folder-level permission model** — all folders within a project share the same manager/inspector role split; there is no per-folder ACL (e.g., RFIs visible only to RE).
4. **Preview uses signed URLs with 1-hour TTL** — if a user keeps a preview modal open for > 1 hour (e.g., reviewing a large plan set), the `<iframe>` src expires silently; no refresh mechanism exists.
