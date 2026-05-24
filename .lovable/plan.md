
# RE review screen — whole-report approval

The Resident Engineer (RE) approves or rejects an inspector's entire daily report as a single unit, matching how paper DCRs actually work. Inspector quantities are invisible to the rest of the project (PM dashboards, exports, P6 round-trip) until the RE signs the report. Rejected reports go back to the inspector with comments for resubmission.

## Data model

Inspector quantities live on `annotations` today, but those are continuously edited as the inspector works. We need a **point-in-time snapshot** that the RE reviews — not a live view of whatever the inspector is currently drawing.

### Schema (migration)

1. Add to `daily_reports`:
   - `status` text default `'draft'` — one of `draft | submitted | approved | rejected`
   - `submitted_at` timestamptz (already exists, will be set on inspector submit)
   - `approved_at` timestamptz, `approved_by` uuid
   - `rejected_at` timestamptz, `rejected_by` uuid, `reject_reason` text
   - `snapshot` jsonb — frozen at submit time: array of `{ pay_item_id, item_code, name, unit, delta_quantity, prior_cumulative, new_cumulative, notes, annotation_ids[] }`
2. New table `daily_report_comments`:
   - `daily_report_id`, `user_id`, `body` text, `created_at`
   - Used for RE's reject-reason history and inspector's reply when resubmitting
3. Add `resident_engineer` to the `app_role` enum (additive).
4. RLS:
   - `daily_reports` SELECT: project members may see their own drafts; only `submitted`, `approved`, or `rejected` rows are visible to the RE and PM. PM/exports filter to `status = 'approved'`.
   - `daily_reports` UPDATE of `snapshot` and `submitted_at`: only the owner inspector, only while `status = 'draft'`.
   - `daily_reports` UPDATE of `status`/`approved_*`/`rejected_*`/`reject_reason`: only users with `resident_engineer` role on the project. Transitions allowed: `submitted → approved`, `submitted → rejected`, `rejected → draft` (inspector reopens to fix).
5. Trigger on `daily_reports` UPDATE: stamp `approved_at`/`approved_by` or `rejected_at`/`rejected_by` automatically based on `status` change, with `set search_path = public`.
6. Helper view `v_approved_pay_item_quantities` that flattens `snapshot` rows from `status = 'approved'` reports — exports, PM dashboard, and the P6 progress logic read from here. Nothing reads pending snapshots except the RE review screen.

## Inspector submit flow (small additions to existing field UI)

Once the inspector taps "Submit for RE Review" on a day:
- Build the `snapshot` from that inspector's annotations dated on `report_date` (group by `pay_item_id`, sum `measurement`/`manual_quantity`, compute `new_cumulative` from `v_approved_pay_item_quantities` + this day's delta).
- Write snapshot + set `status = 'submitted'`, `submitted_at = now()`.
- Lock the report on the UI: subsequent annotation edits do not change a submitted report's snapshot.

This plan does **not** ship the inspector-side submit button UI yet — it ships the schema and the RE review screen. A small "Submit for RE Review" affordance and the snapshot-builder utility (`buildDailyReportSnapshot`) are included so the RE screen has real data to review.

## UI: `/re-review` (new page)

Visible to anyone with `resident_engineer` role; PM/project creator gets a read-only version.

```text
┌──────────────────────────────────────────────────────────────────┐
│ RE REVIEW · NJTA-104-0001              [Submitted ▾] [Date ▾]    │
├──────────────────────────────────────────────────────────────────┤
│ 2026-05-18 · R. Patel · submitted 16:42      SUBMITTED           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Pay item               Today    New cumul.   vs Contract   │  │
│  │ 201-0006 Excavation    +120 CY  1,840 CY     61%           │  │
│  │ 502-0210 Class B Conc  +18 CY   96 CY        12%           │  │
│  │ 605-0001 RCP 18"       +220 LF  840 LF       42%           │  │
│  │ Notes: South abutment, Sta 412+00 to 414+50                │  │
│  └────────────────────────────────────────────────────────────┘  │
│  [ ✓ Approve Report ]   [ ✗ Reject with Comments ]               │
├──────────────────────────────────────────────────────────────────┤
│ 2026-05-17 · T. Nguyen   APPROVED  by J. Liu · 18:04 (audit)     │
└──────────────────────────────────────────────────────────────────┘
```

- One card per `daily_reports` row in `submitted` status, newest first.
- Approve and Reject act on the whole card. Reject opens a dialog requiring a comment; the comment is stored in `daily_report_comments` and `daily_reports.reject_reason`.
- Approved and rejected reports collapse into a compact audit row (filterable from the status dropdown).
- All actions toast on success and on RLS/transition errors.

## Files

- **Create**: `src/pages/ReReview.tsx`
- **Create**: `src/components/ReReviewCard.tsx`
- **Create**: `src/components/ReRejectDialog.tsx`
- **Create**: `src/hooks/useReReviewQueue.ts` (queue fetch + approve/reject mutations, optimistic updates)
- **Create**: `src/lib/daily-report-snapshot.ts` (`buildDailyReportSnapshot(projectId, inspectorId, date)`)
- **Edit**: `src/App.tsx` — add `/re-review` route, auth-guarded
- **Edit**: `src/components/ProjectSidebar.tsx` — add "RE Review" nav link, visible only to `resident_engineer` or project creator
- **Edit**: `src/lib/p6xml/apply-progress.ts` — add a comment noting it must source from `v_approved_pay_item_quantities` when wired to live data (no code change yet)

## Tests

- `src/test/re-review.test.ts`:
  - Submit transition writes a frozen `snapshot` and flips status to `submitted`.
  - Approving stamps `approved_at`/`approved_by` via trigger.
  - Rejecting without a comment is blocked; with a comment moves to `rejected` and records the comment.
  - PM-facing queries on `v_approved_pay_item_quantities` exclude `submitted` and `rejected` reports.

## Out of scope

- No per-pay-item approve/reject (explicit user decision in this iteration).
- No PDF of the signed DCR.
- No notifications/emails on submit/decision.
- No retroactive snapshot rebuild on annotation edits after submit — that is the point of the snapshot.

## Technical notes

- Snapshot is jsonb (not a child table) because it is immutable once written and never queried for joins — it represents what the RE was shown at decision time, even if pay item codes or annotation geometry later change.
- Trigger uses `SECURITY DEFINER` + `SET search_path = public`, matching existing helpers.
- `v_approved_pay_item_quantities` is a plain view (not materialized) — daily-report volume is low enough that recomputation cost is negligible.
