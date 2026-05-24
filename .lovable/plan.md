## Documents & Folder Management

Replace the two hard-coded PDF slots (`pdf_storage_path`, `specs_storage_path`) with a real per-project document workspace that holds the full diversity of construction artifacts: plans, specs, RFIs, submittals, shop drawings, change orders, daily reports, photos, as-builts, correspondence — plus any custom folders a PM wants.

### Data model

Two new tables, one new bucket. Everything scoped to a project; all access through project membership.

- **`document_folders`**
  - `id`, `project_id`, `parent_id` (nullable, self-FK), `name`, `slug`, `is_system` (bool — protects seeded folders from accidental deletion of the system key, but PMs can still rename/move), `system_kind` (nullable enum: `plans`, `specs`, `rfis`, `submittals`, `shop_drawings`, `change_orders`, `daily_reports`, `photos`, `as_builts`, `correspondence`), `created_by`, timestamps.
  - Unique `(project_id, parent_id, lower(name))`.

- **`documents`**
  - `id`, `project_id`, `folder_id`, `name` (display), `storage_path` (key inside `project-documents` bucket), `mime_type`, `size_bytes`, `uploaded_by`, `version` (int, default 1), `replaces_document_id` (nullable, for version chains), `source_kind` (nullable: `legacy_plan_pdf`, `legacy_specs_pdf`, `daily_report_export`, `field_photo`, `manual_upload`), timestamps.

- **Storage bucket `project-documents`** (private). Path: `{project_id}/{document_id}.{ext}` — flat to avoid rename rewrites; folder is logical only.

### Permissions (RLS)

- **PMs** (`projects.created_by`) — full CRUD on folders and documents in their projects.
- **Admins** — full CRUD across all projects.
- **Project members** — view all folders/documents.
- **Inspectors** — can `INSERT` documents only into folders whose `system_kind IN ('photos','daily_reports')`. Cannot rename, move, or delete others' files. Cannot create or modify folders.
- Storage policies on `project-documents` mirror this: read for any project member, write gated by the same folder-kind rule for inspectors.

### Seeding & legacy surfacing

- On project creation (trigger or app-side), seed the 10 standard top-level folders with `is_system=true`, `system_kind` set. PMs can rename, add subfolders, or delete them — `is_system` is informational, not a lock.
- Backfill: for each existing project, create the seeded folders and insert one `documents` row per legacy `pdf_storage_path` → Plans folder, `specs_storage_path` → Specs folder, with `source_kind='legacy_plan_pdf' | 'legacy_specs_pdf'`. The takeoff/specs viewer keep reading `projects.pdf_storage_path` / `specs_storage_path` — the new rows are pointers to the same storage objects, so nothing breaks.
- New uploads to the Plans folder do **not** automatically become the active plan PDF. Switching the active plan stays an explicit action in project setup (out of scope for this slice).

### UI: Documents tab on the project page

New route `/project/:projectId/documents` and a Documents tab on the existing project header.

- **Two-pane layout**: folder tree (left, collapsible, with file counts) + file table (right, sortable by name/size/date/uploader).
- **Breadcrumbs** above the table; clicking a crumb navigates.
- **Toolbar** (right side): Upload (multi-file, drag-drop onto table), New Folder, Rename, Move (multi-select), Delete (multi-select with confirm), Download.
- **Per-row actions**: Download (signed URL), Rename, Move, Delete, View versions.
- **Inspector view**: tree is read-only; an Upload button is enabled only inside Photos or Daily Reports; non-permitted folders show a subtle lock icon and disabled Upload.
- **Versions**: uploading a file with the same name into the same folder bumps `version` and chains via `replaces_document_id`. Previous versions are accessible in a "Versions" drawer; the most recent is the "current" file.
- **Empty states** per folder kind with one-liner copy explaining what belongs there (e.g. Photos: "Field photos from inspectors. JPG/PNG/HEIC.").

Mobile: collapse to a single pane with a top folder picker (drop-down breadcrumbs) and stacked list view. Upload FAB respects role permissions.

### Out of scope for this slice

- Document approval workflows (RFI responses, submittal review/stamp). Folders are containers only.
- OCR/full-text search across uploads. Search is name + folder only.
- Linking documents to pay items or annotations.
- Changing the active plan PDF from the Documents UI.

### Technical notes

- Folder rename does not touch storage (paths are by document_id).
- Deleting a folder requires it to be empty (or move children up); cascade deletes are blocked to prevent accidents.
- Signed URLs (1h) for downloads; uploads via direct supabase-js to the bucket, then insert a `documents` row in a transaction-like sequence (insert row first to claim the id, upload to `{project_id}/{id}.{ext}`, then patch `size_bytes`/`mime_type`).
- React Query keys: `['documents', projectId, folderId]`, `['folders', projectId]`.