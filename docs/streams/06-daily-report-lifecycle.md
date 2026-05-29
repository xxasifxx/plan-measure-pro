# Daily Report Lifecycle

## Purpose
Enables inspectors to compose a frozen daily quantity summary and submit it to a Resident Engineer (RE) for approval or rejection. The stream implements a four-state workflow (draft → submitted → approved/rejected) that provides auditability and separation of duties required for NJDOT/NJTA contract administration. It is distinct from quantity-to-payment: this stream owns the *gating* (approval decision) while that stream owns the *rollup* (approved totals).

## Surfaces (files)
- `src/pages/DailyReport.tsx` — Inspector-facing page; date picker, live preview vs frozen snapshot table, submit/reopen actions, status banners
- `src/hooks/useDailyReport.ts` — Data layer: fetches `daily_reports` row, runs `buildDailyReportSnapshot`, detects snapshot drift, exposes `submit` / `reopen` mutations
- `src/lib/daily-report-snapshot.ts` — Pure snapshot builder: groups annotations by pay item, applies unit conversion, attaches prior approved cumulative from `v_approved_pay_item_quantities`
- `src/pages/ReReview.tsx` — RE-facing queue page; project/status/inspector/date filters, bulk approve action
- `src/components/ReReviewCard.tsx` — Card per report: snapshot table with resubmission diff column, history/comments accordion, approve/reject footer buttons
- `src/components/ReRejectDialog.tsx` — Modal requiring a non-empty rejection reason before `useRejectReport` fires
- `src/hooks/useReReviewQueue.ts` — RE data layer: `useReReviewQueue`, `useApproveReport`, `useRejectReport`, `useBulkApproveReports`, `useReportComments`, `useReportArchives`, `useAddComment`
- `public.daily_reports` — Primary table: `status`, `snapshot` (JSONB), `submitted_at`, `approved_at`, `rejected_at`, `reject_reason`
- `public.daily_report_comments` — Thread attached to a report (used by reject mutation to auto-post a comment)
- `public.daily_report_snapshots` — Snapshot archive table queried by `useReportArchives` (cast as `any`, type not in generated types)
- `public.v_approved_pay_item_quantities` — View consumed by `buildDailyReportSnapshot` for prior cumulative

## Acceptance criteria
- Inspector can navigate to `/project/:id/daily-report`, select any past date, and see a live preview of their annotations for that date.
- Submitting transitions status from `draft` → `submitted`, freezes the `snapshot` JSONB column, and shows an amber "awaiting RE" banner.
- If annotations change after submission, an "out of date" alert appears with a Resubmit button; resubmitting replaces the snapshot atomically.
- Rejected report shows RE's reason; "Reopen & Edit" returns status to `draft` without data loss.
- RE queue at `/re-review` lists only `submitted` reports for the selected project; RE can filter by inspector and date range.
- RE approving a report sets `status = 'approved'`; the report no longer appears in the pending queue and the quantities become visible to `v_approved_pay_item_quantities`.
- Bulk approve correctly transitions all visible pending IDs in a single `update … in (ids)` call.
- Rejection requires a non-empty reason; the reason is stored in `reject_reason` and auto-posted as a comment.

## Current state vs criteria
- **Live preview** — implemented; `buildDailyReportSnapshot` fetches annotations + approved prior and returns `SnapshotItem[]` (`daily-report-snapshot.ts:98`).
- **Submit/freeze** — implemented; `useDailyReport.submit` builds snapshot, upserts row, flips to `submitted` (`useDailyReport.ts:54-101`).
- **Drift detection / resubmit** — implemented; `isStale` compares frozen vs live quantity per item (`useDailyReport.ts:121-133`).
- **Reopen after rejection** — implemented (`useDailyReport.ts:103-117`); however reopen only sets `status = 'draft'` — does not explicitly clear `rejected_at`, leaving a stale timestamp visible.
- **RE queue filters** — implemented in `ReReview.tsx`; client-side filtering for inspector/date, server-side for status.
- **Approve / bulk approve** — implemented (`useReReviewQueue.ts:153-185`); no server-side RLS check that `approved_by` is an RE — role enforcement is client-side via `isResidentEngineer`.
- **Reject with reason** — implemented; reason stored and auto-commented (`useReReviewQueue.ts:187-212`).
- **Snapshot archive** — `useReportArchives` queries `daily_report_snapshots as any` (`useReReviewQueue.ts:117`) — table not in generated Supabase types; fragile cast may silently return empty arrays if table is missing.

## Cross-stream handoffs
- **Feeds from**: annotation/takeoff stream — `annotations` table rows keyed by `work_date` and `user_id` are the raw inputs to `buildDailyReportSnapshot`.
- **Feeds into**: quantity-to-payment — once `status = 'approved'`, `v_approved_pay_item_quantities` includes the snapshot's `delta_quantity`; `approved-quantities.ts:loadApprovedTotalsByPayItem` reads from this view.
- **Notification seam**: `send-push` edge function may receive invalidation triggers (not wired in this stream directly — gap).

## Risks / debt
1. **`daily_report_snapshots` table missing from generated types** — queried with `as any` cast; if the table doesn't exist in prod the archive panel silently shows nothing with no error surfaced to the user.
2. **Role enforcement is client-only** — `useApproveReport`/`useRejectReport` do a plain `update` with no server-side RLS policy shown; any authenticated user who knows a report ID could approve it.
3. **`rejected_at` not cleared on reopen** — `useDailyReport.reopen` only sets `status: 'draft'`; `rejected_at` and `rejected_by` remain set, which could confuse downstream audits.
4. **No push notification to inspector on RE decision** — `useApproveReport` and `useRejectReport` only invalidate React Query caches; inspector has no real-time signal unless they reload the page.
