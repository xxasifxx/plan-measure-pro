# End-to-end pipeline: Inspector takeoff → RE approval → P6 XML export

What follows is a reconciliation of the **stated design** and **what the code actually does today**. The codebase is patchwork; where the code is silent or contradictory, I describe the logical user activity and flag the gap.

---

## Stage 1 — Inspector does the takeoff

**Pages/files:** `src/pages/Index.tsx`, `src/components/PdfCanvas.tsx`, `src/components/MobileToolbar.tsx`, table `public.annotations`.

**Logical user activity**
1. Inspector opens a project, the contract PDF loads, scale or GPS is already calibrated by the PM.
2. They pick the active pay item from the sidebar (or mobile sheet), draw a polygon/line/count/point, optionally enter depth or a manual quantity override, add notes/location/station.
3. Each shape inserts one row into `annotations` with `user_id = auth.uid()`, normalized coordinates (scale: 1), and a server `created_at`.

**What the code actually does**
- `annotations` has no per-row status, no `report_date`, and no link to a daily report. The only thing that "becomes part of a day" is the row's `created_at` UTC timestamp.
- RLS lets the author do everything to their own rows forever; other project members can only read.

**Gap vs narrative**
- "Submitted" only ever exists at the daily-report level. An inspector can edit yesterday's annotation tonight and it will silently change yesterday's preview if yesterday's report is still draft (and silently do nothing if it's already submitted).

---

## Stage 2 — Inspector compiles a Daily Report

**Pages/files:** `src/pages/DailyReport.tsx`, `src/hooks/useDailyReport.ts`, `src/lib/daily-report-snapshot.ts`, table `public.daily_reports`.

**Logical user activity**
1. At the end of shift, inspector opens `/project/:projectId/daily-report`. The date picker defaults to today (local).
2. The page shows a "live preview" rolling up everything they drew today into pay-item lines: today's delta, prior approved cumulative, new cumulative, % of contract.
3. They review, then hit **Submit for RE Review**. The snapshot is frozen and the row flips `draft → submitted`.
4. If the RE later rejects it, they fix annotations and resubmit; the prior frozen snapshot is archived for audit.

**What the code actually does**
- One `daily_reports` row per `(project_id, user_id, report_date)`.
- `buildDailyReportSnapshot` fetches `pay_items`, that inspector's `annotations` where `created_at` falls in the UTC day window of `dateISO`, plus the approved view for prior dates. `annotationQty` applies unit conversion (manual override > count=1 > SF×depth → CY > SF→SY > raw).
- `submit` calls `buildDailyReportSnapshot` again, writes it to `snapshot`, then flips status to `submitted`. For a rejected row it first flips `rejected → draft` (which fires the snapshot-archive trigger on the rejected payload) and then `draft → submitted`.
- Trigger `daily_reports_status_transition` enforces the state machine and stamps `submitted_at` / `approved_at` / `rejected_at` / clears prior review fields. `daily_reports_status_side_effects` archives prior snapshots on reopen and writes notifications.

**Gaps vs narrative**
- **UTC day bucketing.** `dateISO` comes from a local `<input type="date">` but the annotations query uses `created_at` between `dateISO T00:00:00Z` and `T23:59:59Z`. An East‑Coast inspector working past 7–8 pm sees today on the picker, but those annotations have already rolled into tomorrow UTC. Common-sense fix later: filter on a project-local day, or stamp a deliberate `work_date` on each annotation.
- **Snapshot staleness signal is missing.** After submit, editing the underlying annotations does not invalidate the submitted snapshot and the inspector gets no visual cue.
- **Same-day cross-inspector blind spot.** `prior_cumulative` filters `report_date < dateISO`. If two inspectors work the same pay item on the same day, neither sees the other in their preview; after both are approved, the approved view sums them correctly.
- **Empty-day submit is blocked.** `submit` throws when the snapshot has zero lines, so an inspector cannot file a "nothing happened today" record.

---

## Stage 3 — Notifications fan out to REs

**Pages/files:** trigger `daily_reports_status_side_effects`, `src/hooks/useNotifications.ts`, `src/components/NotificationBell.tsx`.

**Logical user activity**
- The moment a report is submitted, every project member with the `resident_engineer` role gets a bell notification linking to the report.
- On approve/reject, the inspector gets a notification linking back to their daily report page.

**What the code actually does**
- Trigger inserts into `notifications` for each RE member on submit, and one notification to the inspector on approve/reject. `notifications` has no INSERT policy by design — only the SECURITY DEFINER trigger writes.
- `NotificationBell` polls/subscribes and routes both `report_submitted` and `report_approved/rejected` to `/project/:id/daily-report` (not `/re-review`).

**Gap vs narrative**
- An RE clicking a "report submitted" notification lands on their *own* daily-report page for that project, not on the queue card for the submitting inspector. Logical user expectation: deep-link to `/re-review?report=<id>`. Today it doesn't.

---

## Stage 4 — RE reviews and decides

**Pages/files:** `src/pages/ReReview.tsx`, `src/hooks/useReReviewQueue.ts`, `src/components/ReReviewCard.tsx`, `src/components/ReRejectDialog.tsx`, tables `daily_reports`, `daily_report_comments`, `daily_report_snapshots`.

**Logical user activity**
1. RE opens `/re-review`, picks a project, filters by status / inspector / date range.
2. Each card shows the frozen snapshot (item, delta, prior, new cumulative, % of contract), comment thread, and any archived prior snapshots from earlier reject cycles for diffing.
3. RE either approves (singly or bulk over the visible queue) or rejects with a written reason. Reject auto-posts a "Rejected: …" comment.

**What the code actually does**
- `useApproveReport` / `useBulkApproveReports` simply `update daily_reports set status='approved'`. The trigger handles `approved_at`/`approved_by` stamping.
- `useRejectReport` requires a reason, updates status + `reject_reason`, then inserts the audit comment.

**Gaps vs narrative**
- **PM (project creator) can silently approve via DB.** The Approve/Reject buttons in the UI are gated on `isResidentEngineer || isAdmin`, but the RLS policy *"Project creator updates report"* allows any update — including `status='approved'` — by `projects.created_by`. The "RE-only" gate is therefore UI-only. Pick one: either tighten RLS so only `resident_engineer` (+project member) can transition to `approved`, or accept that the PM is a valid approver and relax the UI.
- **No "request changes without rejecting"** path. Comments exist but adding a comment does not change status; an inspector won't see a notification for a plain comment, only for reject. Common-sense user activity (RE wants to ping the inspector to clarify station numbers without rejecting the whole day) is unsupported today.
- **Approval re-derivation is intentionally absent.** Once approved, the snapshot is what it was at submit time — even if annotations have changed since. That's the right audit behavior; stating it because the rest of the app would mislead you into expecting recomputation.

---

## Stage 5 — Approved view becomes the single source of truth

**Pages/files:** view `public.v_approved_pay_item_quantities`, `src/lib/approved-quantities.ts`, `src/lib/export-utils.ts`.

**Logical user activity**
- Anything "official" — PM dashboard totals, CSV/PDF exports, P6 round‑trip — must read only RE‑approved quantities so unreviewed inspector work cannot leak into contract reporting.

**What the code actually does**
- The view `CROSS JOIN LATERAL`s `daily_reports.snapshot` filtered to `status='approved'`, exposing per-pay-item delta and new_cumulative per date.
- `loadApprovedTotalsByPayItem` powers dashboard badges and the approved CSV/PDF helpers.
- `exportApprovedCsv`, `exportApprovedPdfReport`, `exportApprovedInspectorDaily` are wired into `Index.tsx` so the main toolbar's official exports never touch raw `annotations`.

**Gaps vs narrative**
- `exportApprovedInspectorDaily` writes a "no approved report" notice if the day isn't approved yet — meaning an inspector can't export their own pending day for personal records.
- The approved CSV/PDF's "Count" column is meaningless (synthetic `1` per pay item); only delta/cumulative are trustworthy in approved exports.

---

## Stage 6 — Push approved work back into Primavera P6

**Pages/files:** `src/lib/p6xml/{parser,apply-progress,serializer,load-approved,types}.ts`, `src/pages/P6XmlDemo.tsx`.

**Logical user activity (the intent)**
1. PM downloads the contractor's PMXML from P6 ("Update existing project" baseline).
2. PM opens a "Generate P6 XML" page for their project, uploads the PMXML.
3. The app loads all RE‑approved daily reports through `asOfDate` (or all-time), groups them by P6 Activity Id, and mutates each `<Activity>` node to set Status / PhysicalPercentComplete / RemainingDuration, plus ActualStart on first activity, ActualFinish on completion, and the project DataDate to the latest report date.
4. PM downloads the mutated XML and imports it back into P6.

**What the code actually does**
- `applyDailyReportsToP6(tables, approvedReports)` does exactly the DOM mutations above. Math: per activity, `ratio = lastCumulative / contractQty`; if `>= 1` → Completed, else In Progress with `pct = round(min(99, max(1, ratio*100)),1)` and `remain = planned*(1-pct/100)`. ActualStart = first report's date, DataDate = latest report's date (all stamped at `T07:00:00`, no timezone).
- `loadApprovedDailyReports(projectId)` strictly queries the approved view, so the helper is "approved‑only" by construction.

**Gaps vs narrative**
1. **The P6 page is still a demo.** `P6XmlDemo` is initialized with `SAMPLE_DAILY_REPORTS` and `SAMPLE_P6_XML`. It has no `projectId` binding and never calls `loadApprovedDailyReports`. So in production today the P6 export is decorative — no real approved data reaches it.
2. **No pay-item → P6 activity mapping is persisted.** `loadApprovedDailyReports` defaults `activityIdForItemCode = identity`, i.e. it assumes the P6 Activity Id literally equals the NJTA item code like `201-0006`. Real PMXMLs use schedule activity IDs (e.g. `A1010`), so the join `activitiesById.get(activityId)` will silently return undefined and the loop `continue`s — yielding an XML where nothing changed and an empty change log. The schema has `activity_pay_items` and `schedule_activities` tables that would carry this mapping, but no UI populates them and `load-approved.ts` ignores them.
3. **One activity ↔ one pay item assumption.** `applyDailyReportsToP6` keys by `activityId` only. An activity backed by several pay items, or a pay item that feeds several activities, isn't representable.
4. **Completion is inferred, not asserted.** `isComplete` is always set to `false` and the apply step infers completion from `ratio >= 1`. A small over-quantity on the last day flips the activity to Completed and zeros remaining duration. There is no explicit "inspector/RE marks activity complete" channel.
5. **Date semantics.** `T07:00:00` is hard-coded with no timezone suffix — fine for round-tripping in the same client locale, brittle for cross-tz contractors.

---

## End-to-end reality, in one diagram

```text
annotations (mutable, no status)
   │   filter: same inspector, created_at within UTC day of dateISO
   ▼
daily_reports.snapshot   ── frozen JSON on submit, archived on reopen-after-reject
   │   state machine: draft → submitted → approved | rejected; rejected → draft
   │   RLS lets RE-role members AND project creators flip status (UI gates only REs/Admins)
   ▼
v_approved_pay_item_quantities (status='approved' only)
   ├─► dashboards & pending-review badges            ✅ wired
   ├─► approved CSV / PDF / inspector-daily exports  ✅ wired (Index.tsx)
   └─► loadApprovedDailyReports → applyDailyReportsToP6 → P6 PMXML
       ⚠ helper is correct & approved-only
       ⚠ but the only caller is the SAMPLE demo page; no production UI binds it
         to a real projectId, and identity item_code→ActivityId mapping will
         match nothing in a real contractor schedule
```

---

## Issues you'll likely want to fix in priority order

1. **Wire P6 export to real data.** Replace the sample-only `/p6-xml` route with a per-project page that calls `loadApprovedDailyReports(projectId, { asOfDate, activityIdForItemCode })`, accepts a PMXML upload, shows the change log, downloads the mutated XML.
2. **Persist the pay-item → activity crosswalk.** Use `activity_pay_items` + `schedule_activities` (already in the schema) with a small mapping UI, and pass that mapper into `loadApprovedDailyReports`.
3. **Decide who can approve.** Tighten RLS so only `resident_engineer` project members can set `status='approved'`, OR show Approve/Reject to PMs in the UI. Today the two layers disagree.
4. **Honest day boundaries.** Either bucket annotations by a project-local date or add an explicit `work_date` column on `annotations`. Same fix removes the East‑Coast-evening data loss.
5. **Surface snapshot drift.** When the inspector edits annotations after submit, show a "preview no longer matches submitted snapshot — reopen to refresh" banner.
6. **Deep-link RE notifications** to the relevant `/re-review` card, not the inspector's own daily-report page.
7. **Allow zero-activity submissions** and **let inspectors export their own pending day** for personal records.

These are the gaps; once you confirm priorities I'll plan the actual fixes.
