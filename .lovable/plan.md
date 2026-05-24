## Remaining Work from the Reconciliation

P6 export wiring (priority 1) shipped last turn. Three priorities remain from the original four-bucket plan:

### 2. Lock approval to REs at the DB layer

Today's RLS lets the project creator (PM) silently `UPDATE daily_reports SET status='approved'` even though the UI gates it. Tighten so only `resident_engineer` project members can transition `submitted → approved`.

- Drop "Project creator updates report" policy (or narrow it so PMs cannot touch `status`).
- Keep "RE updates submitted report" as the only path to `approved`.
- Add a trigger guard: if `NEW.status='approved'` and caller is not an RE project member, raise.
- Verify PM-driven flows that still need write access (reopen after reject?) keep working — owner-update policy already covers inspector reopen.

### 3. Project-local day bucketing for snapshots

`buildDailyReportSnapshot` currently windows by UTC `created_at`, so East-Coast evening edits land on the wrong report.

- Add `work_date date` to `annotations` (nullable, backfill from `created_at AT TIME ZONE 'America/New_York'`).
- Set `work_date` on insert (client passes project-local date; default trigger as fallback).
- Update `buildDailyReportSnapshot` to filter by `work_date = report_date` instead of UTC window.
- Update `v_approved_pay_item_quantities` source query if it relies on the same window.

### 4. Smaller UX fixes (bundle)

- **Stale-snapshot banner**: after submit, if annotations for `report_date` change, show "Snapshot is out of date — resubmit?" on the daily report page.
- **Notification deep-link**: `NotificationBell` routes `report_submitted` to `/project/:id/re-review` instead of `/daily-report`.
- **Allow empty submissions**: remove the "no items" block in submit flow; REs can still reject.
- **Inspector pending-day export**: let inspectors export their own draft/submitted day (current code blocks unless approved). Mark the file clearly as "PENDING — not RE-approved".

---

### Recommended order

I suggest tackling them in this sequence, each as its own scoped turn:

1. **DB approval lock** (small, security-critical, no UI churn)
2. **UX bundle** (fast wins, mostly frontend)
3. **Project-local day bucketing** (largest — schema change + backfill + snapshot logic + view)

Confirm the order or pick a different starting point and I'll implement.