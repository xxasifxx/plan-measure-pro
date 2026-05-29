---
stream_key: 02-portfolio-and-pm-home
paths:
  - src/pages/Dashboard.tsx
  - src/hooks/useProjects.ts
  - src/components/WelcomeCarousel.tsx
  - src/components/GuidedTour.tsx
  - src/components/NotificationBell.tsx
  - src/lib/approved-quantities.ts:loadPendingReviewCounts
shared_paths: []
---
# Portfolio & PM Home

## Purpose
Provides the top-level project list and the entry point for project management oversight. Owners/admins create, open, and delete projects here; managers see per-project annotation activity and pending RE review counts across all projects. This stream is distinct from per-project work: it operates without a loaded PDF and is the only surface that shows cross-project KPIs.

## Surfaces (files)
- `src/pages/Dashboard.tsx` — full-screen portfolio view: project card grid, "New Project" dialog (name + contract number + PDF upload), delete confirmation, expandable inspector-activity detail, pending RE review badges; also mounts `WelcomeCarousel` and `GuidedTour`
- `src/hooks/useProjects.ts` — `useProjects()`: fetches owned + member projects, decorates with `annotation_count`, `latest_annotation_at`, `member_count`; exposes `createProject` and `deleteProject` mutations
- `src/components/WelcomeCarousel.tsx` — first-run onboarding carousel shown once per profile (`has_seen_welcome`)
- `src/components/GuidedTour.tsx` — role-aware guided tooltip tour (`useTour('dashboard')`)
- `src/components/NotificationBell.tsx` — per-user notification feed (bell icon in header)
- `src/lib/approved-quantities.ts:loadPendingReviewCounts` — queries `daily_report_entries` for items awaiting RE approval across a list of project IDs
- `public.projects` — `id`, `name`, `contract_number`, `pdf_storage_path`, `specs_storage_path`, `toc`, `created_by`
- `public.project_members` — `project_id`, `user_id`, `role`; used to union non-owned projects into the list
- `public.annotations` — queried in bulk to compute `annotation_count` and `latest_annotation_at` per project

## Acceptance criteria
- An admin/manager user sees all projects they own plus all projects where they appear in `project_members`.
- Each project card shows annotation count, latest activity date, member count (owners only), and a pending-RE badge when `loadPendingReviewCounts` > 0.
- "New Project" dialog requires name + PDF; contract number is optional; on success the user is navigated to `/project/:id`.
- Only the project `owner` sees the delete trash icon; clicking it shows a destructive confirmation dialog.
- Expanding a project card shows a ranked list of inspectors and the pages-annotated count.
- Role badge in the header reflects the user's first role from `useAuth.roles`.
- An inspector with no project assignments sees an empty state containing their email address.

## Current state vs criteria
- **Ownership + member union**: Implemented — `useProjects.ts:30–69`.
- **Card stats**: Implemented — `useProjects.ts:71–104`; `annotation_count/50` progress bar is a placeholder heuristic, not a real completion percentage (`Dashboard.tsx:299`).
- **New Project dialog**: Implemented — `Dashboard.tsx:54–74`; PDF required (`newPdf` guard line 55).
- **Delete guard**: Implemented — `Dashboard.tsx:76–90`; gated by `member_role === 'owner'`.
- **PM inspector detail**: Partial — `Dashboard.tsx:113–157` fetches annotations and profiles but `totalPages` is always set to `0` because the project PDF is not re-loaded in this context (`line 154`).
- **Role badge**: Implemented — `Dashboard.tsx:92`.
- **Inspector empty state**: Implemented — `Dashboard.tsx:278–284`.

## Cross-stream handoffs
- **Receives from identity-and-access**: `useAuth` user, role flags, and `profile` drive card visibility and empty-state copy.
- **Feeds project-onboarding**: `createProject` mutation uploads PDF to `project-pdfs` storage and inserts the `projects` row.
- **Feeds field-capture**: clicking a project card navigates to `src/pages/Index.tsx` at `/project/:id`.
- **Seam**: `useProjects.createProject` → `public.projects` INSERT + `project-pdfs` storage upload; `navigate('/project/:id')`.

## Risks / debt
1. `useProjects` fetches all annotations for all user projects in a single unbounded query — will be slow/expensive at scale; no pagination or count aggregate.
2. `totalPages` in the PM inspector detail panel is hardcoded to `0` (`Dashboard.tsx:154`), making the "pages annotated" denominator permanently wrong.
3. No React Query cache invalidation when a team member adds annotations in another session; `staleTime` defaults cause stale counts until manual refetch.
4. `loadPendingReviewCounts` fires per-project-list render with all project IDs as a comma-joined cache key, recomputing on every re-render.
