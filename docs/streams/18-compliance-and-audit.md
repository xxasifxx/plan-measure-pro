# Compliance & Audit

## Purpose
Provides NJDOT-mandated schedule quality checks (DCMA 14-point, M-code milestones, negative lag, open-ended activities) and an approval-chain record for daily quantity reports that can withstand FHWA or OIG audit. Distinct from general schedule editing because it produces artefacts — compliance badges, exportable audit reports, approval timestamps with reviewer identity — that are contract requirements, not productivity features.

## Surfaces (files)
- `src/components/schedule/ComplianceStrip.tsx` — always-visible footer bar: negative lags, open-ended tasks, logic cycles, missing NJDOT M-codes (M100–M950)
- `src/components/schedule/DcmaPanel.tsx` — modal: runs `runDcma()` in-memory; 14-point score; per-check failing IDs; exports `.txt`
- `src/lib/schedule/analysis/dcma.ts` — `runDcma`, `dcmaSummary`, `DcmaResult`
- `src/components/ReReviewCard.tsx` — RE review UI: approve/reject with reason, snapshot history, comment thread, stale-snapshot warning
- `src/components/ReRejectDialog.tsx` — modal for reject-reason text
- `src/hooks/useDailyReport.ts` — inspector report lifecycle; snapshot freeze on submit; drift detection
- `src/hooks/useReReviewQueue.ts` — RE queue; `approve`/`reject` mutations stamping timestamp + user ID
- `src/pages/ReReview.tsx` — RE-only page
- `src/integrations/supabase/types.ts` — `daily_reports` schema (status, approved_at, approved_by, rejected_at, rejected_by, reject_reason, snapshot JSONB)

## Acceptance criteria
- `ComplianceStrip` shows non-zero negative-lag count when any relationship has `lag_days < 0`.
- `ComplianceStrip` flags missing M-codes (M100/M200/M300/M400/M500/M600/M700/M800/M950).
- DCMA passes check #1 (logic) when all tasks have ≥ 1 predecessor and ≥ 1 successor.
- Exported `.txt` contains all 14 check names, metrics, and targets.
- Approved `daily_reports` row carries `approved_at` + `approved_by`.
- Rejected report carries `rejected_at`, `rejected_by`, non-null `reject_reason`.
- Inspector cannot approve their own report (role separation at UI and RLS level).
- Snapshot JSONB on an approved report matches quantities at moment of approval.

## Current state vs criteria
- **Negative lag / M-code check**: implemented — `ComplianceStrip` useMemo; M-code check uses `activity_id.toUpperCase().startsWith(m.code)`.
- **DCMA 14-point**: implemented — `DcmaPanel` + `lib/schedule/analysis/dcma.ts`; `.txt` export wired.
- **Approve/reject timestamps + reviewer**: implemented — `useReReviewQueue.approve`/`reject`.
- **Snapshot freeze**: implemented — `useDailyReport.submit` calls `buildDailyReportSnapshot`.
- **Drift detection**: implemented — `isStale` compares frozen vs live.
- **Role separation**: **partial** — UI routes inspectors to `/daily-report` and REs to `/re-review`; no RLS policy visible enforcing `approved_by ≠ user_id`.
- **DC-84 format export**: **missing** — listed as roadmap item; no DC-84 formatter in code.
- **Dedicated audit log table**: **missing** — no `audit_log` table; approvals are mutable columns on `daily_reports`.

## Cross-stream handoffs
- **Feeds from** schedule-management: `ComplianceStrip` + `DcmaPanel` receive `activities`, `relationships`, `meta` from `use-schedule`.
- **Feeds from** daily-report-lifecycle: `useReReviewQueue` consumes `daily_reports` rows.
- **Feeds into** notifications-and-presence: approve/reject mutations are the events that should trigger notification inserts.

## Risks / debt
- M-code detection relies on `activity_id` prefix; non-standard prefix (`AD-M100`) breaks check with no fallback to name matching.
- Approval fields are plain mutable columns; admin could UPDATE `approved_at` retroactively — no immutable audit trail.
- DCMA runs client-side on full activity set; 1000+ task schedules block JS thread with no web-worker offload.
- `reject_reason` is freeform with no character minimum at mutation layer; empty-string rejections allowed.
