# Snapshot · 2026-05-29 — PMXML-Only + Analysis Engines + Value-Stream Documentation

## What Existed
- Full P6 XML schedule engine with CPM, baselines, calendars, resources.
- XER parser co-existing as an alternative ingest path.
- Daily reports with draft→submitted→approved/rejected workflow, RE approval gate.
- PDF annotation, pay-item catalog, offline queue, presence tracking.
- Analysis modules scattered across `src/lib/xer/` (dcma, tia, aace, progress).

## What Just Changed
1. **XER format permanently dropped (sha `d3a455d7`):**
   - `src/lib/xer/` directory deleted entirely (parser.ts, types.ts, wbs.ts, dcma.ts, progress.ts, sample files).
   - `XerLensTour` component deleted.
   - `XerDemo` page (1302 LOC) deleted.
   - XER-specific tests removed.
   - `detectAndImport()` hardcoded to PMXML only; `importFromXer()` and all XER mappers excised (197 lines deleted).

2. **Analysis engines relocated + expanded (sha `69d18ee`, +752 lines):**
   - `src/lib/schedule/analysis/dcma.ts` — DCMA 14-Point Assessment (logic, leads/lags, float thresholds, BEI, CPLI, hard-constraint checks).
   - `src/lib/schedule/analysis/tia.ts` — Time Impact Analysis (float-diff windows, impacted-path).
   - `src/lib/schedule/analysis/aace.ts` — AACE metrics (SPI, CPI, TSPI stubs).
   - `src/lib/schedule/analysis/progress.ts` — earned-value / percent-complete rollup.
   - `src/lib/schedule/analysis/feedback.ts` — plain-English RE memo (hard-blocker / advisory).
   - `src/lib/schedule/analysis/memo-export.ts` — jsPDF + Word-compatible HTML download.
   - `src/lib/schedule/analysis/chart-export.ts` — PNG/SVG Gantt export.
   - `DcmaPanel` wired into `ScheduleWorkspace`.

3. **Security hardening (migration `20260528155528`):**
   - Storage RLS tightened on all buckets.
   - REVOKE EXECUTE on SECURITY DEFINER functions from PUBLIC/anon.
   - `realtime.messages` RLS with project-channel subscriber policy.
   - Input-validation CHECK on `demo_requests` INSERT.

4. **Value-stream documentation:** 20 stream briefs (01–20) written to `docs/streams/`. `docs/wbs-v2.json` and `docs/comprehension-report.md` generated (86% weighted score).

5. **`seed_demo_users()` SECURITY DEFINER** function added for demo environment seeding.

## What Was Abandoned
- XER (.xer flat-file) format — permanently. PMXML is the sole schedule ingest format.
- `XerDemo` page / `XerLensTour` onboarding — the XER demo experience is gone.

## Product Thesis at This Moment
> "A Resident Engineer–grade construction management platform. Import P6 XML schedules; run DCMA 14-point compliance checks, TIA, and AACE metrics; receive auto-generated advisory memos. Field inspectors submit daily reports through a draft→RE-approval workflow. Quantity take-off runs on plan PDFs with offline-first durability. Twenty named value streams document the full product surface. PMXML is the canonical schedule interchange format."
