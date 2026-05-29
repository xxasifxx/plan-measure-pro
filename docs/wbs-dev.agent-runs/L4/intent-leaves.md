# Intent-Leaves Index — L4 Unified Graph

**Generated:** 2026-05-29T18:19:18.173741+00:00  
**Streams:** 20  
**Leaves:** 190  
**Cross-stream links:** 53


## ✅ Implemented (153)


### Stream 01 — Identity & Access

- **`s01.invitations`** — Admin calls invite-user edge function with email+role; function inserts invitations row and emails token link. Invited u
  - ⚠ invite-user edge function accepts any string value for role (requestFields: [email, role]) with no server-side enum vali
  - ⚠ Stream doc Risk #3: resident_engineer is not exposed as an option in the invite-user frontend UI (confirmed: edge functi
- **`s01.profile-creation`** — A profiles row (id, full_name, email) is created for every new auth.users insert. useAuth fetches profile after session 
  - ⚠ profiles table lacks avatar_url or phone fields — no user-editable extended profile beyond full_name/email; downstream s
  - ⚠ has_seen_welcome column was added in a later migration (20260321164809) but is not surfaced in AuthContextType — onboard
- **`s01.project-membership`** — project_members table stores user_id + project_id. is_project_member() SQL function gates RLS policies for pay_items, ca
  - ⚠ project_members table has no role column — membership is binary (in/out); PM-vs-inspector distinctions inside a project 
  - ⚠ No migration or policy covers removing a user from a project (DELETE on project_members) except via 'Project creators ca
- **`s01.role-assignment`** — All four roles (admin, project_manager, inspector, resident_engineer) are members of the app_role enum. assign_owner_rol
  - ⚠ Doc-drift (critical): stream doc claims resident_engineer was added in migration 20260524015102, but L1 parser reports t
  - ⚠ isManager is true for both admin AND project_manager — this conflation means admins inherit all PM-gated UI without an e
- **`s01.signup-login`** — A new organic signup creates an account via email/password, receives admin role via assign_owner_role, and is redirected
  - ⚠ assign_owner_role is called in BOTH Auth.tsx:103 (after signInWithPassword) and useAuth.tsx:~55 (on SIGNED_IN event) — o
  - ⚠ No automated test coverage for signup or sign-in flows.

### Stream 02 — Authentication & Membership

- **`s02.biometric-gate`** — Protect stored sessions on native devices using biometric (fingerprint/FaceID) cold-start gate.
  - ⚠ Native only; no web-equivalent MFA or session idle timeout
- **`s02.invitation-acceptance`** — Allow users to join a team via a tokenized invitation link, applying target roles.
  - ⚠ New user invitations do not expose a resident_engineer invite option in invite-user function
- **`s02.project-membership`** — Define and manage the mapping between users and projects via explicit membership table.
- **`s02.rbac-model`** — Enforce application-wide capabilities based on user roles (admin, manager, inspector, resident_engineer).
- **`s02.rls-enforcement`** — Secure data access by enforcing ownership and membership checks at the database level using RLS.
  - ⚠ No migration audits cross-table joins or storage bucket policies
- **`s02.signup-organic`** — Handle organic user signups and assign the initial 'admin' role automatically.

### Stream 03 — Project Onboarding

- **`S03-L01`** — Project creation dialog
- **`S03-L02`** — Plan PDF upload to storage
- **`S03-L03`** — Project load with offline fallback
  - ⚠ IDB cache staleness not surfaced to user beyond toast
- **`S03-L04`** — Sheet/TOC drag-select (Index of Sheets parsing)
  - ⚠ Hardcoded 5px Y-grouping tolerance breaks dense or rotated text layouts
  - ⚠ console.log debug noise in production (pdf-utils.ts extractTextFromRegion)
- **`S03-L05`** — TOC extraction logic (text-layer heuristic)
  - ⚠ No parse-quality indicator returned to UI
  - ⚠ Scanned/rasterized pages silently return []
- **`S03-L06`** — TOC persistence (survives reload)
- **`S03-L07`** — Pay-item import from contract PDF
  - ⚠ Magic number +4 pages: no UI indication of scan extent or stop point
  - ⚠ Heuristic regex fails on non-standard table layouts (merged cells, scanned pages)
- **`S03-L08`** — Pay-item extraction logic (heuristic)
  - ⚠ Silently returns [] on rotated text or scanned pages
- **`S03-L09`** — Manual pay-item add dialog
- **`S03-L10`** — Pay-item persistence (survives reload)
- **`S03-L11`** — Standard Specs PDF upload and indexing
  - ⚠ upsert: true at fixed path {projectId}/specs.pdf — concurrent uploads silently overwrite previous specs
- **`S03-L12`** — Calibration hydration on project load
- **`S03-L13`** — Folder / section seeding from TOC
  - ⚠ No persistence model for section colors beyond in-memory assignment; color conflicts on large TOCs not handled
- **`S03-L14`** — initProject seam — single hydration entry point
  - ⚠ Partial hydration (e.g. specs not yet uploaded) is not distinguished from fully onboarded state

### Stream 04 — PDF Canvas Annotation

- **`s04.annotation-tools`** — Support multiple tool modes: select, calibrate, line, polygon, count, label, pan, tocSelect
- **`s04.canvas-handlers`** — Implement 26 event and interaction handlers for drawing, selection, and viewport management
- **`s04.coordinate-normalization`** — Maintain a normalized coordinate system (scale=1) for persistent storage and cross-device consistency
- **`s04.data-persistence-bridge`** — Interface with project state via callbacks for adding, updating, and removing annotations and calibrations
- **`s04.dual-layer-rendering`** — Render PDF background and interactive annotations using a dual-canvas architecture
- **`s04.gps-plan-overlay`** — Overlay live GPS position and breadcrumb traces onto the engineering plans
- **`s04.pdf-canvas-component`** — Core PdfCanvas component for interactive PDF annotation and measurement
- **`s04.touch-and-gestures`** — Provide comprehensive touch support including pinch-to-zoom, two-finger pan, and touch-optimized drawing

### Stream 05 — Field Capture

- **`stream-05.annotation-delete`** — Delete selected annotation via keyboard (Delete/Backspace): Pressing Delete or Backspace while an annotation is selected
- **`stream-05.annotation-metadata-edit`** — Edit annotation metadata (location, notes, manual quantity) on canvas panel: Inspector can set location string, notes, a
  - ⚠ MobileAnnotationSheet mobile-specific fields not fully cross-checked.
- **`stream-05.count-tool`** — Place count / point marker annotation (EA): Placing a count marker stores a count annotation keyed to the active pay ite
- **`stream-05.depth-prompt-cy`** — Prompt for depth on CY polygon and compute volume: Completing a CY polygon prompts for depth and stores the cubic yard r
  - ⚠ No automated test for CY volume.
- **`stream-05.drag-handle-editing`** — Select and drag vertex handles to edit placed annotations: Selecting an existing annotation shows drag handles; dragging
- **`stream-05.gps-overlay`** — Display GPS position dot and trace polyline on plan canvas: GPS calibration with ≥ 2 control points renders a position d
- **`stream-05.label-tool`** — Place text label annotation on canvas: Select Label tool, tap anchor point, tap label position, enter text — stored as a
- **`stream-05.line-tool`** — Draw two-point line measurement (LF): Placing a line on a calibrated page produces a length in linear feet stored as an 
  - ⚠ No automated tests.
- **`stream-05.mobile-touch-gestures`** — Touch pan/pinch-zoom and single-tap drawing on mobile: Mobile two-finger pinch zooms; single-finger taps place drawing p
  - ⚠ No automated touch-interaction tests.
- **`stream-05.pdf-render`** — Render PDF page on dual-canvas: PDF pages render on a PDF canvas layer with an overlay for annotation drawing.
- **`stream-05.polygon-tool`** — Draw multi-point polygon measurement (SF/SY): Placing a polygon on calibrated page shows live SF running total; completi
  - ⚠ No automated tests.
- **`stream-05.readonly-mode`** — Enforce read-only mode hiding edit controls: The readOnly flag disables the calibrate tool and hides pay-item edit contr
- **`stream-05.realtime-sync`** — Receive annotations from other users in real time without page reload: An annotation created by another user appears on 
  - ⚠ Undo stack not shared across users.
- **`stream-05.scale-calibration`** — Calibrate drawing scale (two-point distance entry): Setting calibration by clicking two points and entering a known dist
  - ⚠ No automated test for calibration correctness.
- **`stream-05.toc-import-canvas`** — Draw rectangle on canvas to import Table of Contents region: User drags a box around the sheet list; app parses sheet nu
- **`stream-05.undo-redo`** — Undo/redo annotation actions with DB sync: Undo (Ctrl+Z) removes the last-placed annotation from both local state and Su
  - ⚠ Per-session only; another user's view not rolled back.

### Stream 06 — Daily Report Lifecycle

- **`06-L2-01`** — Inspector selects a work date; useDailyReport fetches or lazily creates a daily_reports row (status='draft'). buildDaily
- **`06-L2-02`** — On submit: (1) buildDailyReportSnapshot is called fresh to produce the frozen snapshot; (2) if no row exists it is inser
- **`06-L2-03`** — After submit, previewQuery continues running. isStale compares frozen snapshot vs live preview: length mismatch or any p
- **`06-L2-04`** — RE calls useApproveReport(reportId) which issues update({status:'approved'}) on daily_reports. Approved rows are exclude
- **`06-L2-05`** — RE opens ReRejectDialog which enforces a non-empty reason before calling useRejectReport. The mutation: (1) updates dail
- **`06-L2-06`** — Inspector calls reopen() on a rejected report. Mutation issues update({status:'draft'}) only. Inspector can then edit an
- **`06-L2-07`** — useReportArchives queries the daily_report_snapshots table (cast as `any` due to missing generated types) and returns hi
- **`06-L2-09`** — Four-state FSM: draft → submitted (inspector submit) → approved (RE approve) or rejected (RE reject) → draft (inspector 

### Stream 07 — Quantity to Payment

- **`s07.AC-01`** — loadApprovedTotalsByPayItem returns only pay items with at least one approved report; draft/submitted/rejected deltas mu
  - ⚠ Enforced by view definition.
- **`s07.AC-02`** — exportApprovedCsv row quantities equal approved sum; file labeled _approved_summary.csv.
- **`s07.AC-03`** — exportApprovedPdfReport title = 'RE-Approved Quantity Report'; fileSuffix = 'approved_report'.
- **`s07.AC-04`** — SummaryPanel variance column: green ≤ 0%, amber 1–10%, red > 10%, dash when contract_quantity absent.
- **`s07.AC-05`** — exportApprovedInspectorDaily marks 'RE-Approved Daily' when status = 'approved'; 'PENDING' prefix otherwise.
- **`s07.AC-06`** — loadPendingReviewCounts returns count only for status = 'submitted' rows.

### Stream 08 — Takeoff & Quantities

- **`08:takeoff:aace-classes`** — Integrate AACE International cost estimate classification reference data for maturity curve communication.
- **`08:takeoff:estimate-error`** — Calculate estimated georeferencing error in feet by back-projecting control points through the solved transform.
- **`08:takeoff:export`** — Export takeoff quantities and progress to CSV, PDF, and P6 XML (PMXML) formats.
- **`08:takeoff:geo-transform`** — Provide georeferencing via affine transforms to map GPS coordinates to plan pixels using control points.
- **`08:takeoff:measurement-tools`** — Implement geometric measurement tools for area (polygon), length (line), and count markers with live quantity calculatio
- **`08:takeoff:unit-conversion`** — Apply unit conversion logic to derive cubic yardage (CY) from area/depth and square yardage (SY) from SF.

### Stream 09 — GPS & Field Mode

- **`s09.field-mode-ui`** — Optimize mobile UI for field usage
- **`s09.geo-transform-logic`** — Develop georeferencing and Kalman filter for coordinate transformation
- **`s09.gps-calibration-wizard`** — Implement multi-point GPS-to-plan calibration wizard
- **`s09.gps-panel-ui`** — Implement GPS panel and trace controls for field measurement
- **`s09.location-accuracy-mgmt`** — Handle geolocation permissions and accuracy monitoring
- **`s09.photo-capture-gps`** — Integrate camera capture with GPS metadata capability
  - ⚠ Explicit GPS metadata embedding in photo blobs before upload is not fully visible in the current capture shim.

### Stream 10 — Document Management

- **`stream-10.block-nonempty-delete-trigger`** — block-nonempty-delete trigger prevents deleting non-empty folders: DELETE on document_folders raises an exception if the
  - ⚠ The trigger checks documents WHERE folder_id = OLD.id with no deleted_at filter, meaning a folder containing only soft-d
  - ⚠ The exception message includes the folder name via OLD.name concatenation. If the folder name contains a percent sign or
- **`stream-10.bulk-operations`** — Multi-select bulk download and bulk soft-delete: Multi-select checkboxes allow select-all and per-row selection. Bulk do
  - ⚠ bulkDownload uses window.open() per file — browsers with popup blockers will suppress all but the first window.open() ca
  - ⚠ selectedIds is cleared when selectedFolderId changes (line 225 effect) but not when filteredDocs changes due to search —
- **`stream-10.documents-page`** — Documents page — three-pane layout: Three-pane layout: folder tree (left), breadcrumb + document list (centre), no persi
  - ⚠ Folder drag-and-drop is absent; moveFolder mutation exists in useFolders (line 96) but no drag-source or drop-target UI 
  - ⚠ Tree auto-expansion opens ancestors of the auto-selected 'plans' folder (line 148-153) but does not persist expanded sta
- **`stream-10.folder-tree`** — Folder tree — recursive render, counts, create/rename/delete: Folder tree correctly renders nested hierarchy from parent
  - ⚠ folderCountsQuery fetches the entire project documents table (all columns) to compute counts — a SELECT * equivalent. A 
  - ⚠ deleteFolder on the client calls supabase.from('document_folders').delete() without a prior empty-check in the hook — th
- **`stream-10.pdf-image-preview`** — Inline PDF and image preview modal via signed URL: PDF and image documents open in a signed-URL preview modal without do
  - ⚠ PDF preview uses <iframe src=signedUrl>. Safari on iOS does not support inline PDF rendering in iframes — the PDF trigge
  - ⚠ Signed URL TTL is 3600 s. If a user keeps the preview modal open for >1 hour the iframe src silently expires; no refresh
- **`stream-10.seeded-folders`** — 10 standard seeded folders auto-created on project insert: Every new project automatically receives 10 system folders: P
  - ⚠ The backfill block also inserts legacy PDF rows into plans/specs folders — if projects.pdf_storage_path or specs_storage
  - ⚠ ON CONFLICT DO NOTHING relies on the partial unique indexes uq_document_folders_top_name and uq_document_folders_child_n
- **`stream-10.soft-delete-trash`** — Soft-delete to Trash with Undo toast and Empty Trash: Soft-deleting a document sets deleted_at; an Undo toast within the
  - ⚠ softDeleteWithUndo in Documents.tsx bypasses the deleteDocument mutation in useDocuments.ts (which invalidates trash/fol
  - ⚠ runEmptyTrash collects storage_path values from the in-memory trash array — if the trash query is stale when Empty Trash
- **`stream-10.system-kind`** — system_kind enum on document_folders controls role-gated upload: system_kind column is a CHECK-constrained text column a
  - ⚠ system_kind is stored as text not a Postgres enum; the CHECK constraint enforces valid values but the Supabase-generated
  - ⚠ The inspector upload RLS policy grants INSERT to any authenticated project member when the target folder's system_kind i
- **`stream-10.upload`** — File upload with per-file progress queue and same-name versioning: Uploading a file with the same name as an existing do
  - ⚠ runUploads in Documents.tsx and uploadFiles in useDocuments.ts are duplicate upload implementations with slightly differ
  - ⚠ The same-name version check queries deleted_at-filtered documents implicitly (it does not filter .is('deleted_at', null)
- **`stream-10.version-history`** — Version history drawer and restore: Version history drawer shows the full chain of replaces_document_id links in descend
  - ⚠ fetchDocumentVersions fetches ALL documents for a project (line 362: .eq('project_id', projectId) with no folder filter)
  - ⚠ Circular replaces_document_id chains (possible if DB rows are manipulated outside the app) would cause fetchDocumentVers

### Stream 11 — Schedule Management

- **`stream-11.activity-grid`** — Editable activity grid (ID, name, start, duration, % complete, float)
  - ⚠ Grid does not show early_start/early_finish (CPM dates).
  - ⚠ No column sorting or filtering.
- **`stream-11.baseline-management`** — Capture, name, and delete schedule baseline snapshots
  - ⚠ compareProgress implemented but no UI surface exposes SPI/CPI or slipping activity table — orphaned.
- **`stream-11.calendar-manager`** — Manage project calendars (workweek + exceptions)
- **`stream-11.compliance-strip`** — Show real-time NJDOT compliance pill bar
- **`stream-11.cpm-computation`** — Compute CPM critical path (calendar-aware, constraint-aware)
  - ⚠ CPM not auto-persisted — persistCpm is manual mutation; tab close leaves is_critical/total_float_days stale.
  - ⚠ No unit tests.
- **`stream-11.dcma-14-audit`** — Run DCMA 14-point schedule health audit and export .txt
  - ⚠ No unit tests.
  - ⚠ DCMA check #6 (resources) always returns pass=true — informational only.
- **`stream-11.milestone-tracking`** — Track NJDOT required milestone activities (M100–M950)
  - ⚠ Milestone detection uses startsWith — M code must be first token; no normalization beyond .toUpperCase().
- **`stream-11.pmxml-import`** — Import P6 PMXML schedule file
  - ⚠ No automated test for importFromPmxml.
  - ⚠ onImport replace flag ignored — replace is always atomic via RPC.
- **`stream-11.wbs-tree`** — Navigate and manage WBS hierarchy tree

### Stream 12 — Schedule Engine (CPM)

- **`s12.baseline-manager`** — Manage project baselines, including setting, comparing, and tracking variances
- **`s12.calendar-management`** — Define and manage work calendars, including workweeks and exceptions (holidays)
- **`s12.cpm-engine`** — Robust CPM engine with forward/backward pass, calendar awareness, and constraint support
- **`s12.gantt-visualization`** — Interactive Gantt chart for visualizing and editing the project schedule
- **`s12.p6-pmxml-import`** — Import schedule data from Oracle P6 PMXML files with high fidelity
  - ⚠ XER support explicitly removed in favor of PMXML for better round-tripping reliability
- **`s12.parse-schedule-ai`** — AI-powered extraction of schedule activities from Gantt chart images/screenshots
- **`s12.resource-management`** — Manage labor, material, and equipment resources assigned to schedule activities
  - ⚠ Resource leveling (automated CPM adjustments based on resource availability) is not explicitly implemented in runCpm

### Stream 13 — DCMA & Schedule Quality

- **`stream-13.dcma-14-audit`** — DCMA 14-Point Schedule Health Audit
  - ⚠ No unit tests for the complex check logic.
- **`stream-13.re-memo-generation`** — Resident Engineer (RE) Feedback Memo
  - ⚠ Unwired to the 'Download Memo' button in the UI (DcmaPanel currently only exports raw results).
- **`stream-13.schedule-health-panel`** — NJDOT Compliance & Health Strip
  - ⚠ Milestone detection depends on exact prefix match (starts with M###).

### Stream 14 — Measurement & Geometry Engine

- **`stream-14.affine-2pt`** — Solve 2-point similarity transform (scale + rotation + translation)
- **`stream-14.affine-3pt`** — Solve 3+ point full affine via least-squares normal equations
  - ⚠ estimateError returns plan-pixel residual, not feet — docstring and field name estimatedErrorFt are misleading (confirme
- **`stream-14.distance-px`** — Compute pixel distance between two points
- **`stream-14.format-measurement`** — Format measurement value with unit string and K-abbreviation
  - ⚠ No unit enum/validation; caller passes arbitrary string — typos silently pass through
- **`stream-14.gps-to-local-ft`** — Convert GPS lat/lng to local Cartesian feet relative to origin
  - ⚠ Flat-earth approximation — valid only for small project extents (<5 mi); no range guard
- **`stream-14.gps-to-plan`** — Apply affine calibration to convert live GPS to plan pixel coordinates
- **`stream-14.hit-testing`** — Hit-test points against polyline segments and polygon fills
- **`stream-14.kalman-filter`** — Kalman filter for GPS trace smoothing (predict + update)
  - ⚠ KalmanState is never persisted — cold-starts on every GpsTraceControls remount (confirmed debt)
- **`stream-14.line-length`** — Calculate polyline length in real-world feet
- **`stream-14.polygon-area-sf`** — Compute polygon area via shoelace formula (px² → SF)
- **`stream-14.sf-conversions`** — Convert SF to SY and CY

### Stream 15 — Offline & Native Durability

- **`s15.AC2_optimistic_idb`** — implemented — mutate() writes _pendingSync:true to IDB before enqueue
- **`s15.AC3_serial_per_row_4_workers`** — implemented — drainOnce groups by rowId, runs up to 4 concurrent row-groups serially
- **`s15.AC4_backoff_sync_panel`** — implemented — BACKOFF_MS=[1000,4000,15000,60000,180000]; SyncPanel exposes retryItem
- **`s15.AC5_capacitor_no_sw`** — implemented — shouldRegisterSW() returns false when Capacitor.isNativePlatform()
- **`s15.AC6_pwa_update_toast`** — implemented — registerSWWithUpdates uses Workbox; PwaShell wires setReloadFn on waiting event
- **`s15.AC7_pdf_cache`** — implemented — warmPdf stores in pdf-cache-v1; evictIfNeeded enforces 500 MB LRU cap

### Stream 16 — Push Notifications

- **`s16.daily-reports-status-side-effects`** — Trigger notifications and snapshots on daily report status changes
- **`s16.mobile-push-delivery`** — Deliver push notifications to mobile devices via Capacitor and FCM
- **`s16.notification-inserts`** — Ensure in-app notifications are inserted into public.notifications table
- **`s16.send-push-edge-fn`** — Implement and maintain send-push Edge Function for FCM/APNs delivery

### Stream 17 — Offline Sync

- **`s17.offline-idb-schema`** — IndexedDB schema for project mirroring and write outbox
- **`s17.offline-mirror`** — Snapshotting Supabase project data to IndexedDB for offline access
  - ⚠ mirrorProject is called manually in Index.tsx:128; there is no automatic periodic re-snapshotting if the app stays open 
- **`s17.offline-mutate`** — Online-first mutation wrapper with optimistic UI and outbox fallback
  - ⚠ applyMirror (line 24) does not support all tables found in IDB schema (e.g., pdf_cache_meta, meta are missing from store
  - ⚠ Optimistic flag _pendingSync is set in IDB but not exposed in types/project.ts, so UI components cannot visually disting
- **`s17.offline-service-worker`** — PWA Service Worker for asset caching and offline navigation
  - ⚠ Runtime caching for Supabase REST (line 72) uses NetworkFirst with 3s timeout; if the network is extremely slow but not 
- **`s17.offline-sync-loop`** — Reliable outbox drain loop with backoff and causality preservation
  - ⚠ Serial processing (line 36) preserves causality per rowId, but there is no mechanism to handle cross-row dependencies (e
  - ⚠ Conflict detection (baseUpdatedAt) is present in the schema but no resolution logic exists in drainOnce; items that fail
- **`s17.use-project-offline-pivot`** — Pivot useProject to use offlineMutate for all write operations
  - ⚠ useProject still accepts supabaseProjectId/userId and performs manual DB updates for calibrations (line 92) and pay_item
  - ⚠ Realtime subscription (line 341) does not check the outbox; incoming remote changes could overwrite local optimistic sta

### Stream 18 — Compliance & Audit

- **`S18-1`** — daily-report-snapshot library
  - ⚠ _excludeDailyReportId parameter is accepted but never used in the query — its original intent (exclude the being-edited 
  - ⚠ v_approved_pay_item_quantities is cast `as any` due to Supabase generated-type lag — once types are regenerated the cast
- **`S18-10`** — DcmaPanel component
  - ⚠ idLookup resolves activity IDs to names but the failing-activity list in the expanded row shows only IDs, not names — th
  - ⚠ No 'copy to clipboard' option for individual check failure lists.
- **`S18-2`** — daily_reports status FSM (DB trigger)
  - ⚠ approved_by = auth.uid() inside a trigger assumes the caller is the approving RE. If a server-side function using servic
  - ⚠ The trigger fires on ANY UPDATE, not just status changes. The IS DISTINCT FROM OLD.status guard avoids false positives, 
- **`S18-3`** — daily_report_snapshots archive table + side-effects trigger
  - ⚠ Archive only fires on rejected→draft (reopen). A submitted→approved transition does NOT archive the submitted snapshot —
  - ⚠ archived_reason is free-text, not a CHECK constraint enum — nothing prevents a programmatic caller from inserting an unr
- **`S18-4`** — useReReviewQueue hook
  - ⚠ useApproveReport approves via .update({ status: 'approved' }) — it does NOT supply reject_reason, which is correct, but 
  - ⚠ useRejectReport does a client-side trim check on reason but does NOT enforce a minimum length — a single space character
- **`S18-5`** — ReReviewCard component
  - ⚠ diffByItem useMemo depends on archivesQ.data and report.snapshot but archivesQ is only enabled when historyOpen=true — t
  - ⚠ Approve/Reject buttons are always rendered even when readOnly=true in the component's Props — the readOnly prop is passe
- **`S18-6`** — ReRejectDialog component
  - ⚠ No minimum character count enforced (e.g. 10 chars) — a single character reason ('x') passes. The DB trigger only checks
  - ⚠ No character counter or max-length cap — very long reasons are accepted without UX warning.
- **`S18-7`** — useDailyReport hook — submit / reopen / isStale
  - ⚠ submit() performs a multi-step mutation (build snapshot → upsert draft → set submitted) without a DB transaction. If the
  - ⚠ reopen() flips to draft via a direct UPDATE — the side-effects trigger (which archives the snapshot) fires in the DB, bu
- **`S18-8`** — v_approved_pay_item_quantities view
  - ⚠ No RLS policy directly on the view — access is controlled entirely by the underlying daily_reports table's SELECT polici
  - ⚠ new_cumulative in the view is the cumulative as-of the report's snapshot freeze date. If a report is retroactively corre
- **`S18-9`** — DCMA 14-Point Schedule Audit — analysis library
  - ⚠ CPLI uses sum of TF across critical activities rather than the path-level float of the longest critical chain — this ove
  - ⚠ BEI denominator counts ALL completed activities (any status), not just those completed within the baseline window — infl

### Stream 19 — Marketing

- **`s19.landing-page-implementation`** — Professional landing page with NJTA-specific messaging and lead capture
- **`s19.llms-txt-context`** — Provide machine-readable project context for LLM assistants
- **`s19.pricing-communication`** — Convey value-based, per-project pricing model
  - ⚠ No self-service pricing calculator or tier selection
- **`s19.public-claims-alignment`** — Verify that marketing claims (Landing.tsx) match technical capabilities (Demo.tsx, Index.tsx)
  - ⚠ ProjectWise and SiteManager integrations are claimed as roadmap items but not yet implemented

### Stream 20 — Sales & Pitch

- **`stream-20.demo-cta-linkage`** — Landing → /demo CTA linkage: /demo reachable from Landing CTA; begins interactive walkthrough
- **`stream-20.fajar-pitch`** — FajarPitch partner page (/fajar): /fajar renders partner content without login
  - ⚠ Seed-based fake fleet data may mislead during live demos.
  - ⚠ Pricing hard-coded.
- **`stream-20.interactive-demo`** — Interactive /demo mode (unauthenticated 12-step walkthrough): /demo accessible without auth
- **`stream-20.llms-txt`** — llms.txt LLM-readable site description: llms.txt accurately describes product and links correct routes
  - ⚠ Hard-coded domain incorrect on staging.
- **`stream-20.mcfa-pitch`** — McfaPitch partner page (/mcfa): /mcfa renders partner content without login
  - ⚠ Pricing hard-coded in source — no CMS.
- **`stream-20.p6xml-demo`** — P6XmlDemo (/p6-xml and /mcfa/p6-xml): Live PMXML round-trip demo: parse sample, show DCMA, export RE memo
- **`stream-20.roi-calculator`** — ROI / Pricing Calculator (McfaPitch): McfaPitch pricing calculator present with phase-based ROI projection
  - ⚠ Values hard-coded.
- **`stream-20.sitemap-robots`** — sitemap.xml and robots.txt SEO assets: sitemap.xml includes all six public routes
  - ⚠ Hard-coded production domain — staging serves incorrect canonical URLs.

## ⚠️ Partial (30)


### Stream 01 — Identity & Access

- **`s01.biometric-gate`** — On cold start (native only), BiometricGate checks stored credential via lib/native/biometric.getStatus; if enrolled, ren
  - ⚠ Web sessions have no equivalent MFA, idle timeout, or re-auth challenge — browser sessions remain valid indefinitely aft
  - ⚠ BiometricGate imports from @/lib/native/biometric but no lib/native/biometric file is visible in L1 frontend AST file li
- **`s01.password-reset`** — Forgot-password sends email with redirectTo=/reset-password. ResetPassword.tsx detects PASSWORD_RECOVERY event and allow
  - ⚠ ResetPassword.tsx shows 'Loading recovery session...' spinner indefinitely (line 50) if PASSWORD_RECOVERY never fires — 
  - ⚠ No automated test for the PASSWORD_RECOVERY event path.
- **`s01.rls-coverage`** — Supabase RLS is enabled on profiles, user_roles, projects, project_members, pay_items, calibrations, annotations, invita
  - ⚠ No migration audits cross-table join correctness — e.g., is_project_member() correctness under concurrent role changes i
  - ⚠ Storage bucket policies were initially set as 'Authenticated users can upload/read' (broad) in migration 20260321160419 

### Stream 02 — Authentication & Membership

- **`s02.auth-double-fire-fix`** — Prevent race conditions and redundant network/database calls during the authentication lifecycle.
  - ⚠ assign_owner_role redundant call persists in both Auth.tsx and useAuth.tsx

### Stream 05 — Field Capture

- **`stream-05.copy-calibration-pages`** — Copy calibration to all / range of pages: User can apply calibration to all sheets or a range.
  - ⚠ No confirmation dialog before overwriting pages.
  - ⚠ No automated test.
- **`stream-05.gps-calibration-wizard`** — Calibrate GPS-to-plan affine transform via 2–3 control-point wizard: GPS calibration with ≥ 2 control points produces a 
  - ⚠ buildGeoCalibration silently throws on degenerate transforms — no user-visible diagnostic.
  - ⚠ No GPS affine accuracy test.
- **`stream-05.gps-trace-recording`** — Start/stop GPS trace recording: User can start and stop GPS trace recording; trace polyline is stored and rendered.
  - ⚠ No automated test.
  - ⚠ Kalman filter wiring not verified end-to-end.

### Stream 06 — Daily Report Lifecycle

- **`06-L2-08`** — The daily_reports_status_side_effects DB function is referenced in the stream spec as the notification seam but is NOT p
- **`06-L2-10`** — Consolidated open-risk debt items for daily report lifecycle
  - ⚠ daily_report_snapshots missing from generated types — archive panel silently broken if table absent.
  - ⚠ No server-side RLS on approve/reject — any authenticated user can approve reports.

### Stream 07 — Quantity to Payment

- **`s07.gap.GAP-02`** — SummaryPanel uses live annotations instead of v_approved_pay_item_quantities
  - ⚠ The embedded summary in the main takeoff tool does not reflect RE-approved totals, creating a two-source-of-truth proble
- **`s07.gap.GAP-03`** — No payment-period date-range scoping for exports
  - ⚠ No UI or helper exists to export quantities scoped to a specific payment period. A pay estimate must be computed by manu
- **`s07.gap.GAP-04`** — v_approved_pay_item_quantities SQL not in migrations
  - ⚠ The view is consumed everywhere but its DDL is absent from supabase/migrations/; a schema change could silently break al

### Stream 11 — Schedule Management

- **`stream-11.aace-classification`** — AACE cost estimate class reference
  - ⚠ AACE_CLASSES is orphaned.
  - ⚠ No AACE classification integrated into DCMA panel or compliance strip.
- **`stream-11.gantt-image-ai-import`** — Import schedule activities from Gantt chart image via AI
  - ⚠ No frontend invocation of parse-schedule.
  - ⚠ Returned activities not mapped to ImportedSchedule shape.
- **`stream-11.gantt-rendering`** — Render Gantt chart with dependency arrows and milestone diamonds
  - ⚠ In-place mutation can be confusing.
  - ⚠ Milestone diamonds and dependency arrows referenced but need verification.
- **`stream-11.memo-export`** — Export RE feedback memo as PDF or DOCX
  - ⚠ DcmaPanel exports .txt not PDF/DOCX; memo-export.ts wiring unverified.
- **`stream-11.progress-spi-cpi`** — Compare baseline vs forecast and compute SPI/CPI
  - ⚠ No UI surface — progress analysis unreachable.
  - ⚠ CPI is duration proxy.
- **`stream-11.resource-manager`** — Manage resources and activity assignments
  - ⚠ ResourceManager UI is thin.
  - ⚠ ActivityInspector may handle per-activity assignment — not separately verified.
- **`stream-11.tia-generator`** — Generate TIA fragnet and NJDOT 108-03 narrative
  - ⚠ No UI entry point.
  - ⚠ Only first successor traced.

### Stream 13 — DCMA & Schedule Quality

- **`stream-13.progress-variance`** — Baseline vs Forecast Variance Analysis (compareProgress)
  - ⚠ No UI surface exposing SPI/CPI or slipping activities table.
- **`stream-13.tia-generator`** — Time Impact Analysis (TIA) Frag-net Generator
  - ⚠ No UI surface to invoke buildTia.
  - ⚠ Only first direct successor traced.

### Stream 14 — Measurement & Geometry Engine

- **`stream-14.coordinate-normalization`** — Normalize plan coordinates to scale=1 for geo control points
  - ⚠ No normalizeToScale1() helper; callers must manually divide by current scale — contract not enforced
- **`stream-14.vertex-drag-recalc`** — Live measurement recalculation on polygon vertex drag
  - ⚠ Vertex-drag recalculation coupling lives in PdfCanvas, not testable in isolation

### Stream 15 — Offline & Native Durability

- **`s15.AC1_offline_serve`** — partial — mirrorProject snapshots 8 tables but daily_reports is hard-capped at 30 rows, silently truncating older histor
- **`s15.risk.R1`** — daily_reports mirrored at 30-row cap — inspectors reviewing older history offline see silent data gaps
  - ⚠ daily_reports mirrored at 30-row cap — inspectors reviewing older history offline see silent data gaps
- **`s15.risk.R2`** — No conflict resolution UI — OutboxStatus includes 'conflict' but mutation-client never sets it; conflicts silently land 
  - ⚠ No conflict resolution UI — OutboxStatus includes 'conflict' but mutation-client never sets it; conflicts silently land 
- **`s15.risk.R3`** — IDB schema v2 has no forward migration path — getDB only handles oldVersion < 1 and < 2; v3 upgrade risks data loss
  - ⚠ IDB schema v2 has no forward migration path — getDB only handles oldVersion < 1 and < 2; v3 upgrade risks data loss
- **`s15.risk.R4`** — jsPDF.save() bypasses warmPdf — generated PDFs are not cacheable and will be unavailable offline
  - ⚠ jsPDF.save() bypasses warmPdf — generated PDFs are not cacheable and will be unavailable offline

### Stream 19 — Marketing

- **`s19.demo-requests-form`** — Capture potential customer data for sales follow-up
  - ⚠ User reports 'missing migration' for demo_requests table despite existence in migration files
  - ⚠ No Admin UI for viewing or managing submitted demo requests

### Stream 20 — Sales & Pitch

- **`stream-20.landing-page`** — Landing Page (marketing surface): /landing renders without auth
  - ⚠ demo_requests table migration missing — contact form silently fails in production.
  - ⚠ Mobile framer-motion staggerContainer may cause layout shift.

## ❌ Missing (5)


### Stream 05 — Field Capture

- **`stream-05.segmented-length`** — Draw segmented / polyline length measurement: Segmented length tool accumulates intermediate points and sums segment len
  - ⚠ No 'polyline' ToolMode.
  - ⚠ No drawing handler for multi-segment line.

### Stream 07 — Quantity to Payment

- **`s07.gap.GAP-01`** — ProjectControls variance uses raw annotations, not approved quantities
  - ⚠ ProjectControls.tsx:180-187 sums manual_quantity ?? measurement from unfiltered annotations. A submitted-but-not-yet-app

### Stream 11 — Schedule Management

- **`stream-11.schedule-to-pay-item-linking`** — Link schedule activities to pay items
  - ⚠ No UI to link activities to pay items.
  - ⚠ No hook or mutation reads/writes activity_pay_items.
- **`stream-11.xer-import`** — Import XER (Primavera binary export) schedule file
  - ⚠ DialogTitle misleadingly claims '.xer or .xml'.
  - ⚠ No XER parser exists.

### Stream 20 — Sales & Pitch

- **`stream-20.demo-requests-table`** — demo_requests Supabase table (contact form backend): Demo-request form submits to demo_requests with email, name, messag
  - ⚠ Missing DB migration.
  - ⚠ Contact form silently broken in production.

## 🔲 Todo (2)


### Stream 16 — Push Notifications

- **`s16.notification-trigger-sync`** — Connect public.notifications inserts to the send-push Edge Function
  - ⚠ Missing trigger on public.notifications to invoke the send-push edge function
- **`s16.web-push-subscriptions`** — Support Web-Push (VAPID) subscriptions in the frontend and database
  - ⚠ No VAPID public key configuration found
  - ⚠ No Service Worker PushManager subscription logic for web

---

## Cross-Stream Links

| From | To | Kind |
|------|----|------|
| `s01.signup-login` | `S03-L01` | gates |
| `s01.rls-coverage` | `S03-L02` | secures |
| `s02.project-membership` | `S03-L01` | gates |
| `S03-L01` | `stream-05.scale-calibration` | prerequisite |
| `S03-L02` | `stream-05.pdf-render` | feeds |
| `S03-L03` | `stream-05.pdf-render` | feeds |
| `S03-L07` | `stream-05.line-tool` | feeds |
| `S03-L12` | `stream-05.scale-calibration` | feeds |
| `stream-05.line-tool` | `06-L2-01` | feeds |
| `stream-05.polygon-tool` | `06-L2-01` | feeds |
| `stream-05.count-tool` | `06-L2-01` | feeds |
| `stream-05.depth-prompt-cy` | `06-L2-01` | feeds |
| `06-L2-04` | `s07.AC-01` | feeds |
| `06-L2-09` | `s07.AC-02` | feeds |
| `stream-14.line-length` | `stream-05.line-tool` | implements |
| `stream-14.polygon-area-sf` | `stream-05.polygon-tool` | implements |
| `stream-14.sf-conversions` | `stream-05.depth-prompt-cy` | implements |
| `stream-14.hit-testing` | `stream-05.drag-handle-editing` | implements |
| `stream-14.gps-to-plan` | `s09.gps-calibration-wizard` | implements |
| `s04.pdf-canvas-component` | `stream-05.pdf-render` | implements |
| `s04.annotation-tools` | `stream-05.line-tool` | implements |
| `s04.annotation-tools` | `stream-05.polygon-tool` | implements |
| `s04.gps-plan-overlay` | `s09.gps-panel-ui` | implements |
| `stream-11.cpm-computation` | `stream-13.dcma-14-audit` | feeds |
| `stream-11.compliance-strip` | `stream-13.schedule-health-panel` | overlaps |
| `stream-11.dcma-14-audit` | `stream-13.dcma-14-audit` | overlaps |
| `stream-11.tia-generator` | `stream-13.tia-generator` | overlaps |
| `stream-11.progress-spi-cpi` | `stream-13.progress-variance` | overlaps |
| `stream-11.baseline-management` | `stream-13.progress-variance` | feeds |
| `s12.cpm-engine` | `stream-11.cpm-computation` | overlaps |
| `s12.p6-pmxml-import` | `stream-11.pmxml-import` | overlaps |
| `s12.baseline-manager` | `stream-11.baseline-management` | overlaps |
| `s12.gantt-visualization` | `stream-11.gantt-rendering` | overlaps |
| `s12.calendar-management` | `stream-11.calendar-manager` | overlaps |
| `s17.offline-idb-schema` | `s15.AC2_optimistic_idb` | implements |
| `s17.offline-mutate` | `s15.AC2_optimistic_idb` | implements |
| `s17.offline-sync-loop` | `s15.AC3_serial_per_row_4_workers` | implements |
| `s17.offline-mirror` | `s15.AC1_offline_serve` | implements |
| `s17.offline-service-worker` | `s15.AC5_capacitor_no_sw` | implements |
| `s01.signup-login` | `s02.signup-organic` | overlaps |
| `s01.invitations` | `s02.invitation-acceptance` | overlaps |
| `s01.biometric-gate` | `s02.biometric-gate` | overlaps |
| `s01.project-membership` | `s02.project-membership` | overlaps |
| `s01.rls-coverage` | `s02.rls-enforcement` | overlaps |
| `06-L2-04` | `S18-2` | triggers |
| `06-L2-05` | `S18-3` | triggers |
| `06-L2-07` | `S18-3` | feeds |
| `S18-1` | `06-L2-01` | implements |
| `s16.daily-reports-status-side-effects` | `06-L2-08` | implements |
| `s16.send-push-edge-fn` | `06-L2-08` | implements |
| `s19.landing-page-implementation` | `stream-20.landing-page` | overlaps |
| `s19.demo-requests-form` | `stream-20.demo-requests-table` | overlaps |
| `S03-L11` | `stream-10.upload` | feeds |