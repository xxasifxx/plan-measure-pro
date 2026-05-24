
# Full RE-approved daily report workflow

Stop shipping one slice at a time. This plan closes the entire loop: inspector drafts → submits → RE reviews → approves/rejects → downstream consumers (PM dashboard, exports, P6) only ever see approved numbers. Plus the audit trail, notifications, resubmission, and the role/seeding gaps that make the existing RE screen unreachable for most users.

## 1. Inspector submission flow (the missing half)

Build a real "Daily Report" experience instead of relying on whatever silently exists today.

- **`src/pages/DailyReport.tsx`** (new, route `/project/:projectId/daily-report`): inspector picks a `report_date` (defaults to today), sees a live preview of the snapshot that *would* be submitted — grouped by pay item, with delta, prior approved cumulative, new cumulative, % of contract. Notes field. Status badge: Draft / Submitted / Approved / Rejected (with RE's reject reason inline if rejected).
- **`src/lib/daily-report-snapshot.ts`** (new): `buildDailyReportSnapshot(projectId, inspectorId, date)` — pulls inspector's `annotations` whose `created_at::date = report_date`, groups by `pay_item_id`, sums `measurement` + `manual_quantity`, reads prior approved cumulative from `v_approved_pay_item_quantities`, returns the `SnapshotItem[]` shape `useReReviewQueue` already consumes.
- **Submit action**: upsert `daily_reports` row (`status='draft'`), then UPDATE → `status='submitted'`, `snapshot=<built>`, `submitted_at=now()`. The status trigger handles timestamps.
- **Resubmit after reject**: button "Reopen & Edit" sets `status='draft'`, clears reject fields (RLS already allows owner to update from `rejected`). Then user re-edits annotations, hits Submit again — new snapshot overwrites old.
- **Lock UI on submitted/approved**: annotations for that date are still editable in the takeoff tool, but the daily-report page shows a banner "Submitted — edits won't change the submitted snapshot" so inspector isn't confused.
- **Entry points**: add a "Daily Report" button on `Index.tsx` (project takeoff page) header and on `Dashboard.tsx` project card, visible to inspectors and PMs.

## 2. RE Review screen — finish what's there

- **Audit history**: load `daily_report_comments` for each card; render a collapsible "History" section showing RE reject reasons + inspector replies, oldest first.
- **Inspector reply box** on rejected reports (inspector-only): writes to `daily_report_comments` so the RE can see context before the resubmit.
- **Diff vs prior submission**: when a report was rejected and resubmitted, show `Δ from previous submission` per pay item (compare current `snapshot` to the most recent `daily_report_comments` JSON archive — see §3).
- **Bulk actions**: "Approve all visible" with confirm dialog for REs with multiple same-day inspector reports.
- **Filters**: inspector dropdown, date range, search by pay item code.
- **Empty/loading/error states**: already present, but add skeleton rows and a "No RE role assigned to anyone on this project — assign one in Team" CTA when the queue is empty *and* no project member has the role.
- **Sidebar link**: add "RE Review" entry in `ProjectSidebar.tsx`, gated on `isResidentEngineer || isAdmin || isProjectCreator`.

## 3. Snapshot archive on resubmit

When inspector reopens a rejected report, before flipping to `draft`, archive the existing snapshot:

- Insert a row into `daily_report_comments` with `body = '__snapshot_archive__' || jsonb` (or add a dedicated `daily_report_snapshots` table — see Technical Notes for the call). This preserves "what the RE rejected" for the diff view and for audit/legal.

## 4. Downstream consumers — actually use the approved-only view

Right now `v_approved_pay_item_quantities` exists but nothing reads from it. Wire it up:

- **`src/lib/export-utils.ts`**: cumulative quantities and progress % must come from `v_approved_pay_item_quantities`, not raw `annotations`. Inspector-only export keeps raw annotations (their working tally), but the "Owner Report" / contract progress export is approved-only with a clear footer note.
- **`src/pages/Dashboard.tsx` PM metrics**: project completion %, pay-item burn-down, inspector activity — switch to the view. Add a small "Pending RE review: N reports" chip per project card.
- **`src/lib/p6xml/apply-progress.ts`**: replace the TODO comment with a real `loadApprovedQuantities(projectId)` helper that queries the view and feeds `applyProgress`. Add a unit test that an unapproved annotation does *not* move a P6 activity's `PercentComplete`.
- **`src/pages/ProjectControls.tsx`** (if it shows cumulative): same swap.

## 5. Roles, seeding, and access

The RE screen is currently unreachable for almost everyone:

- **`src/components/TeamManager.tsx`**: add `resident_engineer` to the role dropdown when adding/editing project members, and surface it in the member list with a badge.
- **`src/pages/Admin.tsx`**: allow admins to grant/revoke the `resident_engineer` app role on any user.
- **`assign_owner_role` RPC**: no change — first user stays admin. But add a one-time backfill insert (via migration) that gives the current admin the `resident_engineer` role too, so the queue is testable out of the box.
- **`useAuth`**: already exposes `isResidentEngineer` — confirm `ReReview` and the new sidebar link use it consistently.

## 6. Notifications (lightweight, in-app only)

No email infra yet — keep it in-app:

- New `notifications` table (`user_id`, `kind`, `payload jsonb`, `read_at`, `created_at`) with RLS scoped to `auth.uid() = user_id`.
- Triggers on `daily_reports` status changes:
  - `submitted` → insert one row per project member with `resident_engineer` role.
  - `approved` / `rejected` → insert one row for the report's `user_id` (inspector).
- Bell icon in the Dashboard header with unread count + a popover list; clicking an item routes to `/re-review` or `/project/:id/daily-report`.

## 7. Tests

- **`src/test/daily-report-snapshot.test.ts`** — snapshot building handles: no annotations, mixed `measurement` + `manual_quantity`, multiple pay items, prior approved cumulative present/absent.
- **`src/test/re-review.test.ts`** — state machine transitions (draft→submitted→approved, submitted→rejected→draft), reject requires reason, RE-only update rights.
- **`src/test/approved-quantities-view.test.ts`** — pending and rejected snapshots excluded; approved sums correctly across multiple days/inspectors.
- **`src/test/p6xml-approved-only.test.ts`** — `applyProgress` driven by the view ignores pending work.

## 8. UX polish (small but worth doing in one pass)

- Toast on successful submit with link "View in RE queue" (visible only if the user can see it).
- Color-code status everywhere consistently: draft=muted, submitted=warning, approved=success, rejected=destructive — define tokens in `index.css` if missing.
- Mobile pass on `/re-review` cards (currently desktop-first; REs review in the field too).
- Empty-state CTA on `DailyReport.tsx` when inspector has no annotations for the date: "Open takeoff tool to add measurements."

## Out of scope (explicit)

- Per-pay-item approve/reject (already decided against).
- PDF generation of signed DCR.
- Email notifications.
- Realtime push (Supabase realtime channel) — can add later; polling on focus is fine for v1.
- Multi-RE co-sign workflow.

## Technical notes

- **Archive table vs comments hack**: prefer a dedicated `daily_report_snapshots` table (`daily_report_id`, `snapshot jsonb`, `archived_at`, `archived_reason`) over stuffing JSON into `daily_report_comments.body`. Cleaner queries, no string-prefix sniffing. New migration adds it with RLS mirroring `daily_reports`.
- **Notification trigger**: `SECURITY DEFINER` + `SET search_path = public`, fan-out via `INSERT … SELECT user_id FROM user_roles WHERE role='resident_engineer'` — keep it bounded; if the project later has many REs we revisit.
- **View performance**: `v_approved_pay_item_quantities` is fine as a plain view at current volumes. If it shows up in slow queries, swap to a materialized view refreshed on `daily_reports` status change via trigger.
- **RLS for `daily_report_snapshots`**: project members SELECT; INSERT only by the report's owner during the reopen flow (or via the trigger that fires on status leaving `rejected`).
- **No edits to `src/integrations/supabase/types.ts`** — regenerated after migration.

## File map

Create:
- `src/pages/DailyReport.tsx`
- `src/lib/daily-report-snapshot.ts`
- `src/components/DailyReportPreview.tsx`
- `src/components/NotificationBell.tsx`
- `src/hooks/useNotifications.ts`
- `src/hooks/useDailyReport.ts`
- `src/test/daily-report-snapshot.test.ts`
- `src/test/re-review.test.ts`
- `src/test/approved-quantities-view.test.ts`
- `src/test/p6xml-approved-only.test.ts`
- Migrations: `daily_report_snapshots` table + RLS, `notifications` table + RLS + triggers, admin backfill of RE role.

Edit:
- `src/App.tsx` — add `/project/:projectId/daily-report` route.
- `src/pages/Index.tsx` — "Daily Report" button.
- `src/pages/Dashboard.tsx` — pending-review chip, notification bell, switch metrics to approved view.
- `src/pages/ReReview.tsx` — history, diff, bulk approve, filters, mobile polish.
- `src/components/ReReviewCard.tsx` — comments thread, diff badges.
- `src/components/ProjectSidebar.tsx` — RE Review nav link.
- `src/components/TeamManager.tsx` — `resident_engineer` role option.
- `src/pages/Admin.tsx` — RE role grant.
- `src/lib/export-utils.ts` — approved-only cumulative.
- `src/lib/p6xml/apply-progress.ts` — real `loadApprovedQuantities`.
- `src/hooks/useReReviewQueue.ts` — comments fetch, archive on reopen.
- `src/index.css` — status color tokens if missing.

