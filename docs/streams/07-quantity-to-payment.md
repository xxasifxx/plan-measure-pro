# Quantity to Payment

## Purpose
Aggregates RE-approved daily-report quantities into official contract totals and surfaces them as variance-coded exports (CSV, PDF, Excel). This stream answers the question "how much has been installed vs the contract?" and produces the payment-period deliverables that feed NJDOT/NJTA pay estimate submissions. It is intentionally downstream of daily-report-lifecycle: it only ever reads `approved` status rows.

## Surfaces (files)
- `src/lib/approved-quantities.ts` — Core helpers: `loadApprovedTotalsByPayItem` (sums `delta_quantity` from `v_approved_pay_item_quantities` per pay item), `loadPendingReviewCounts` (badge counts for dashboard)
- `src/lib/export-utils.ts` — Export functions: `exportApprovedCsv`, `exportApprovedPdfReport` (official), `exportInspectorDaily`, `exportApprovedInspectorDaily` (per-inspector Excel); all consume `loadApprovedTotalsByPayItem`
- `src/components/SummaryPanel.tsx` — Desktop quantity summary table with per-item variance % column, color coded green/amber/red via `getVarianceColor`, export button row (CSV, PDF, Daily Excel)
- `src/pages/ProjectControls.tsx` — "Variance" tab: derives `installed` from raw annotations (not approved), computes `pct = installed / contract_quantity`; separate from the approved rollup path
- `public.v_approved_pay_item_quantities` — DB view: rows = one per approved daily_report × pay_item; exposes `delta_quantity`, `approved_at`, `item_code`, `pay_item_name`, `unit`

## Acceptance criteria
- `loadApprovedTotalsByPayItem` returns a map containing only pay items with at least one approved report; draft/submitted/rejected deltas must not appear.
- `exportApprovedCsv` produces a file where each row's quantity equals the approved sum (not raw annotation measurement), labeled `_approved_summary.csv`.
- `exportApprovedPdfReport` title reads "RE-Approved Quantity Report" and `fileSuffix` is `approved_report`.
- `SummaryPanel` variance column shows green for ≤ 0 %, amber for 1–10 %, red for > 10 %, and `—` when `contract_quantity` is absent.
- `exportApprovedInspectorDaily` marks the export "RE-Approved Daily" when `status = 'approved'`; uses "PENDING" prefix otherwise.
- `loadPendingReviewCounts` returns a count only for `status = 'submitted'` rows.

## Current state vs criteria
- **Approved-only filter** — implemented via the `v_approved_pay_item_quantities` view; `loadApprovedTotalsByPayItem` does not add any extra filter — entirely trusts the view definition (`approved-quantities.ts:20-48`).
- **Approved CSV/PDF exports** — implemented (`export-utils.ts:101-108`, `207-222`); correctly use `loadApprovedTotalsByPayItem` as override map.
- **Per-inspector daily Excel** — implemented (`export-utils.ts:318-401`); handles approved/submitted/draft with "PENDING" labelling.
- **Variance color coding** — implemented in `SummaryPanel.tsx:115-120`; thresholds are ≤ 0 (green), ≤ 10 (amber), > 10 (red).
- **ProjectControls variance tab** — **partial**: derives installed from raw `annotations` table (not from approved view) (`ProjectControls.tsx:177-187`); this is an unapproved quantity, which may mislead PMs comparing to contract.
- **Pending counts** — implemented (`approved-quantities.ts:55-68`).
- **Payment-period date range export** — **missing**: no UI or helper to export quantities scoped to a specific payment period date range (e.g., NJDOT estimate period).

## Cross-stream handoffs
- **Feeds from**: daily-report-lifecycle — `v_approved_pay_item_quantities` view is populated only when `daily_reports.status = 'approved'`.
- **Feeds into**: P6/schedule export stream — `exportApprovedCsv`/`exportApprovedPdfReport` are the deliverable artifacts; `P6Export.tsx` page is a sibling consumer of pay-item data.
- **Feeds into**: Dashboard/Summary — `SummaryPanel` is embedded in `Index.tsx` (takeoff tool) and reads live annotations, not the approved view — a known inconsistency.

## Risks / debt
1. **ProjectControls variance uses raw annotations, not approved quantities** — `ProjectControls.tsx:180-187` sums `manual_quantity ?? measurement` from unfiltered annotations; a submitted-but-not-yet-approved report inflates the installed figure shown to PMs.
2. **SummaryPanel operates on live annotations, not `v_approved_pay_item_quantities`** — the embedded summary in the main takeoff tool does not reflect RE-approved totals, creating a two-source-of-truth problem.
3. **No payment-period scoping** — there is no date-range filter on approved quantity exports; a pay estimate must be computed manually by diffing two full exports.
4. **View definition not in repo** — `v_approved_pay_item_quantities` is consumed everywhere but its SQL is not in `supabase/migrations/`; a schema change could silently break all approved-quantity paths.
