# Product Engineering Plan — TakeoffPro / Draw-Quantify

**Generated:** 2026-05-29  
**Supersedes:** all prior phase plans, including `.lovable/plan.md` versions dated before 2026-05-29.

---

## 1. Header

This plan is derived from the L4 artifact set at
`docs/wbs-dev.agent-runs/L4/`:

- **intent-leaves.json** — 190 leaves across 20 streams (153 implemented, 30 partial, 5 missing, 2 todo)
- **intent-leaves.md** — human-readable index with gap annotations
- **lie-tax.md** — 17 audited marketing claims (3 fraud-risk, 10 misleading, 4 cosmetic)
- **snapshots/README.md** — 8 pivot snapshots from 2026-03-08 to 2026-05-29
- **L3/pivots.json** — 8 machine-detected pivots with blast-radius lists

No other plan document holds authority. Milestones from any Google Doc, Notion page, or earlier `.lovable/plan.md` commit are superseded and must not be used to schedule work.

---

## 2. Severity-Ordered Remediation Queue

### Tier 1 — Fraud-Risk (lie-tax)

| Rank | Item | Severity | Stream | Evidence | Effort |
|------|------|----------|--------|----------|--------|
| 1 | Register `support@takeoffpro.app`; publish `/privacy` and `/terms` pages | fraud-risk | 19 Marketing | lie-tax F-3 · `STORE_LISTING.md` legal URLs | M |
| 2 | Remove "99.9% uptime SLA" badge or back it with a written SLA | fraud-risk | 19 Marketing | lie-tax F-1 · `Landing.tsx:191` | M |
| 3 | Rewrite FAQ "Is there an API?" — remove current-availability implication | fraud-risk | 19 Marketing | lie-tax F-2 · `Landing.tsx:232` | S |

### Tier 2 — Silent Data Corruption (critical partials / missing migrations)

| Rank | Item | Severity | Stream | Evidence | Effort |
|------|------|----------|--------|----------|--------|
| 4 | Add `v_approved_pay_item_quantities` DDL to migrations — view consumed everywhere but absent from schema history | critical | 07 Quantity to Payment | s07.gap.GAP-04 | S |
| 5 | Fix `ProjectControls.tsx:180-187` — variance uses raw annotations, not approved totals; inflates installed figure for PMs | critical | 07 Quantity to Payment | s07.gap.GAP-01 | S |
| 6 | RLS missing on approve/reject daily reports — any authenticated user can approve | critical | 06 Daily Report / 18 Compliance | `06-L2-10` | M |
| 7 | `daily_reports` offline mirror hard-capped at 30 rows — older history silently truncated for offline inspectors | critical | 15 Offline & Native | `s15.risk.R1` · `s15.AC1_offline_serve` | M |
| 8 | IDB schema v2 has no forward migration path — v3 upgrade risks data loss | critical | 15 Offline & Native | `s15.risk.R3` | M |
| 9 | Offline conflict detection present in schema but `drainOnce` has no resolution logic — conflicting writes silently land in DB | critical | 17 Offline Sync | `s15.risk.R2` · `s17.offline-sync-loop` | L |
| 10 | `runEmptyTrash` uses stale in-memory trash array — if trash query is stale, storage objects may not be deleted | critical | 10 Document Management | `stream-10.soft-delete-trash` | S |
| 11 | `softDeleteWithUndo` bypasses `deleteDocument` mutation (no cache invalidation) — trash counter stays stale | critical | 10 Document Management | `stream-10.soft-delete-trash` | S |
| 12 | `fetchDocumentVersions` fetches ALL project documents to build version chain — O(n) scan risk on large projects | critical | 10 Document Management | `stream-10.version-history` | S |
| 13 | `submit()` uses two sequential non-transactional updates (draft → submitted) — partial failure leaves report in draft | high | 18 Compliance & Audit | `S18-7` | M |

### Tier 3 — Missing Backend with UI Consumers

| Rank | Item | Severity | Stream | Evidence | Effort |
|------|------|----------|--------|----------|--------|
| 14 | `demo_requests` DB migration missing — contact form on Landing silently fails in production | high | 20 Sales & Pitch | `stream-20.demo-requests-table` · `stream-20.landing-page` | S |
| 15 | Push notification wiring absent — `daily_reports_status_side_effects` not in migrations; no trigger from report status → `send-push` | high | 16 Push / 06 Daily Report | `06-L2-08` · `s16.notification-trigger-sync` | M |
| 16 | Web-Push (VAPID) subscriptions not implemented — no VAPID key, no SW `PushManager` logic | high | 16 Push Notifications | `s16.web-push-subscriptions` | L |
| 17 | `SummaryPanel` shows live annotations instead of `v_approved_pay_item_quantities` — two sources of truth vs export | high | 07 Quantity to Payment | `s07.gap.GAP-02` | M |
| 18 | No payment-period date-range scoping — pay-period estimate requires manual diff of two full exports | high | 07 Quantity to Payment | `s07.gap.GAP-03` | M |
| 19 | `stream-05.segmented-length` — no polyline ToolMode, no multi-segment geometry handler | high | 05 Field Capture | `stream-05.segmented-length` | M |
| 20 | `stream-11.schedule-to-pay-item-linking` — no UI and no `activity_pay_items` hook; activity→pay-item relation is dead schema | high | 11 Schedule Management | `stream-11.schedule-to-pay-item-linking` | L |
| 21 | No Admin UI for `demo_requests` submissions — operational gap (no table, no view) | medium | 19 Marketing | lie-tax coverage note · `s19.demo-requests-form` | S |

### Tier 4 — Misleading Marketing (lie-tax)

| Rank | Item | Severity | Stream | Evidence | Effort |
|------|------|----------|--------|----------|--------|
| 22 | Fix workflow step 1 copy — ProjectWise is roadmap, not current | misleading | 19 Marketing | lie-tax M-1 · `Landing.tsx:124` | S |
| 23 | Rename "Start Free Trial" → "Get Started" or "Request Access" | misleading | 19 Marketing | lie-tax M-2 · `Landing.tsx:382` | S |
| 24 | Change comparison row to "Automatic sync" — drop "real-time" | misleading | 19 Marketing | lie-tax M-6 · `Landing.tsx:173` | S |
| 25 | Remove photo/GPS-context claim from `STORE_LISTING.md` | misleading | 19 Marketing | lie-tax M-7 · `STORE_LISTING.md` | S |
| 26 | Qualify Monthly Estimate copy — DC-84 format is roadmap only | misleading | 19 Marketing | lie-tax M-8 · `Landing.tsx:97-100` | S |
| 27 | Relabel SOC 2 badge to "SOC 2 (planned)" | misleading | 19 Marketing | lie-tax M-9 · `Landing.tsx:189` | S |
| 28 | Add "(native app only)" qualifier to background-sync store bullet | misleading | 19 Marketing | lie-tax M-10 · `STORE_LISTING.md` | S |
| 29 | Remove / qualify "Dedicated onboarding for NJTA teams" badge | misleading | 19 Marketing | lie-tax M-3 · `Landing.tsx:192` | S |
| 30 | Add citation or qualifier to 30+ days payment-delay stat | misleading | 19 Marketing | lie-tax M-4 · `Landing.tsx:48` | S |
| 31 | Add citation or qualifier to 5–15% variance stat | misleading | 19 Marketing | lie-tax M-5 · `Landing.tsx:55` | S |

### Tier 5 — Orphans Worth Deleting or Wiring

| Rank | Item | Severity | Stream | Evidence | Effort |
|------|------|----------|--------|----------|--------|
| 32 | `stream-11.xer-import` — ImportP6Panel dialog still claims ".xer or .xml"; XER parser fully deleted 2026-05-29 | orphan | 11 Schedule Management | `stream-11.xer-import` · pivot 2026-05-29 | S |
| 33 | `stream-11.aace-classification` — `AACE_CLASSES` constant exists but is not wired to DCMA panel or compliance strip | orphan | 11 Schedule Management | `stream-11.aace-classification` | S |
| 34 | `stream-11.progress-spi-cpi` / `stream-13.progress-variance` — compareProgress implemented, no UI surface | orphan | 11/13 Schedule | `stream-11.progress-spi-cpi` · `stream-13.progress-variance` | M |
| 35 | `stream-13.tia-generator` / `stream-11.tia-generator` — `buildTia` has no UI entry point; only first successor traced | orphan | 13 DCMA / 11 Schedule | `stream-13.tia-generator` | M |
| 36 | `stream-13.re-memo-generation` — `memo-export.ts` not wired to "Download Memo" button in DcmaPanel | orphan | 13 DCMA | `stream-13.re-memo-generation` | S |

### Tier 6 — Cosmetic Claims

| Rank | Item | Severity | Stream | Evidence | Effort |
|------|------|----------|--------|----------|--------|
| 37 | Register `app.takeoffpro.com` or update hero mockup URL from placeholder | cosmetic | 20 Sales | lie-tax C-1 · `Landing.tsx:409` | S |
| 38 | Qualify "Zero Install" badge — "No install for browser access" | cosmetic | 19 Marketing | lie-tax C-2 · `Landing.tsx:388` | S |
| 39 | Fix Demo sign-up CTA copy — data does not persist post-signup | cosmetic | 20 Sales | lie-tax C-4 · `src/pages/Demo.tsx:64` | S |
| 40 | Add FAQ entry clarifying Supabase hosting / data-export options | cosmetic | 19 Marketing | lie-tax C-3 · `Landing.tsx:188` | S |

---

## 3. Stream-by-Stream Backlog

### 3.01 Identity & Access

One-line purpose: Auth lifecycle, role enum, RLS foundations, invitation delivery.

**Implemented**
- `s01.signup-login`: Email/password auth + assign_owner_role + redirect to Dashboard
- `s01.profile-creation`: profiles row auto-created on auth.users insert
- `s01.role-assignment`: 4-role app_role enum; useAuth exposes role booleans
- `s01.invitations`: invite-user edge function; token→localStorage→accept_invitation RPC
- `s01.project-membership`: project_members table + is_project_member() RLS helper
- `s01.biometric-gate`: Capacitor cold-start fingerprint gate (native only)

**Partial**
- `s01.password-reset`: Gap: indefinite spinner on direct navigation; no timeout/redirect
- `s01.rls-coverage`: Gap: storage bucket policies were initially broad; new tables (daily_report_snapshots, notifications) not confirmed to have admin bypass; no RLS integration tests
- `s01.biometric-gate`: Gap: web has no MFA / idle timeout; unenroll path has no UI

**Cross-stream deps:** gates S03-L01 (project creation); secures S03-L02 (storage upload)

---

### 3.02 Authentication & Membership

One-line purpose: Org-gated signup, invitation acceptance, RBAC enforcement, duplicate-call hygiene.

**Implemented**
- `s02.signup-organic`, `s02.invitation-acceptance`, `s02.rbac-model`, `s02.project-membership`, `s02.rls-enforcement`, `s02.biometric-gate`

**Partial**
- `s02.auth-double-fire-fix`: Gap: assign_owner_role still called in both Auth.tsx:103 and useAuth.tsx:~55

**Cross-stream deps:** overlaps s01.*; gates S03-L01

---

### 3.03 Project Onboarding

One-line purpose: Project creation → PDF upload → TOC/pay-item extraction → hydration seam.

**Implemented**
- `S03-L01`: Project creation dialog
- `S03-L02`: Plan PDF upload to storage
- `S03-L03`: Project load with offline IDB fallback
- `S03-L04`: Sheet/TOC drag-select; Gap: hardcoded 5px Y-tolerance; console.log noise in prod
- `S03-L05..L14`: TOC extraction, persistence, pay-item import/extraction/persistence, manual add, specs upload, calibration hydration, folder seeding, initProject seam

**Partial (gaps only)**
- `S03-L03`: IDB cache staleness not surfaced beyond toast
- `S03-L05`: Scanned pages silently return []
- `S03-L07`: Magic number +4 pages; regex fails on merged cells
- `S03-L14`: Partial hydration indistinguishable from fully onboarded state

**Cross-stream deps:** feeds S04 (canvas), S05 (measurement), S10 (document upload)

---

### 3.04 PDF Canvas Annotation

One-line purpose: Dual-canvas PDF + Fabric.js annotation layer with full gesture and tool support.

**Implemented**
- `s04.pdf-canvas-component`, `s04.canvas-handlers` (26 handlers), `s04.annotation-tools` (8 tool modes), `s04.dual-layer-rendering`, `s04.coordinate-normalization`, `s04.touch-and-gestures`, `s04.gps-plan-overlay`, `s04.data-persistence-bridge`

**Partial:** none

**Cross-stream deps:** implements stream-05.pdf-render; feeds s09.gps-panel-ui

---

### 3.05 Field Capture

One-line purpose: Inspector measurement tools, GPS overlay, calibration, undo, realtime sync.

**Implemented**
- `stream-05.pdf-render`, `stream-05.scale-calibration`, `stream-05.line-tool`, `stream-05.polygon-tool`, `stream-05.depth-prompt-cy`, `stream-05.count-tool`, `stream-05.label-tool`, `stream-05.drag-handle-editing`, `stream-05.annotation-metadata-edit`, `stream-05.annotation-delete`, `stream-05.undo-redo`, `stream-05.realtime-sync`, `stream-05.gps-overlay`, `stream-05.toc-import-canvas`, `stream-05.mobile-touch-gestures`, `stream-05.readonly-mode`

**Partial**
- `stream-05.copy-calibration-pages`: Gap: no confirmation dialog before overwriting
- `stream-05.gps-calibration-wizard`: Gap: silent throw on degenerate transforms; no accuracy test
- `stream-05.gps-trace-recording`: Gap: Kalman filter wiring unverified end-to-end

**Missing**
- `stream-05.segmented-length`: Why blocked: no polyline ToolMode; no multi-segment geometry function (Rank 19)

**Cross-stream deps:** feeds 06-L2-01 (daily report snapshot); implements stream-14 geometry primitives

---

### 3.06 Daily Report Lifecycle

One-line purpose: Inspector submit → RE review (approve/reject) → snapshot archive → FSM.

**Implemented**
- `06-L2-01..07`, `06-L2-09`: Full draft→submitted→approved/rejected→draft FSM; live preview; stale-detection; archive query

**Partial**
- `06-L2-08`: Gap: `daily_reports_status_side_effects` function missing from migrations; no status→push-notification wiring (Rank 15)
- `06-L2-10`: Gap: no RLS on approve/reject (Rank 6); `daily_report_snapshots` absent from generated types; non-atomic submit (Rank 13)

**Cross-stream deps:** triggers S18-2, S18-3; feeds s07.AC-01; receives push from S16

---

### 3.07 Quantity to Payment

One-line purpose: RE-approved quantity rollups, CSV/PDF exports, variance display.

**Implemented**
- `s07.AC-01..06`: Approved totals view, CSV export, PDF export, variance colors, approved-daily label, pending count

**Partial**
- `s07.gap.GAP-02`: SummaryPanel uses live annotations, not v_approved totals (Rank 17)
- `s07.gap.GAP-03`: No payment-period date-range export (Rank 18)
- `s07.gap.GAP-04`: v_approved_pay_item_quantities DDL missing from migrations (Rank 4)

**Missing**
- `s07.gap.GAP-01`: ProjectControls variance uses raw annotations (Rank 5)

**Cross-stream deps:** feeds from 06-L2-04; depends on s07.gap.GAP-04 view DDL

---

### 3.08 Takeoff & Quantities

One-line purpose: Geometry measurement, unit conversion, geo-transform, AACE reference, PMXML export.

**Implemented**
- `08:takeoff:measurement-tools`, `08:takeoff:unit-conversion`, `08:takeoff:geo-transform`, `08:takeoff:estimate-error`, `08:takeoff:aace-classes`, `08:takeoff:export`

**Gaps (implemented but notable)**
- `08:takeoff:estimate-error`: `estimatedErrorFt` field name is misleading — value is plan-pixel residual, not feet (see stream-14.affine-3pt)

**Cross-stream deps:** implements stream-05 measurement tools; depends on stream-14 geometry engine

---

### 3.09 GPS & Field Mode

One-line purpose: Geolocation permissions, GPS panel UI, Kalman filter, calibration wizard.

**Implemented**
- `s09.gps-panel-ui`, `s09.geo-transform-logic`, `s09.location-accuracy-mgmt`, `s09.field-mode-ui`

**Partial**
- `s09.gps-calibration-wizard`: Gap: silent degenerate-transform throw; no accuracy test
- `s09.photo-capture-gps`: Gap: GPS metadata embedding in photo blobs not fully visible in capture shim

**Cross-stream deps:** implements s04.gps-plan-overlay; depends on stream-14.kalman-filter

---

### 3.10 Document Management

One-line purpose: Seeded folder tree, upload versioning, soft-delete/trash, PDF/image preview.

**Implemented**
- `stream-10.seeded-folders`, `stream-10.folder-tree`, `stream-10.documents-page`, `stream-10.upload`, `stream-10.soft-delete-trash`, `stream-10.pdf-image-preview`, `stream-10.bulk-operations`, `stream-10.version-history`, `stream-10.block-nonempty-delete-trigger`, `stream-10.system-kind`

**Notable gaps (all implemented)**
- `stream-10.soft-delete-trash`: stale-trash and cache-invalidation bugs (Ranks 10, 11)
- `stream-10.version-history`: full-project scan per version fetch (Rank 12)
- `stream-10.folder-tree`: `moveFolder` mutation exists but no drag UI
- `stream-10.pdf-image-preview`: Safari iOS inline PDF blocked; signed URL expires after 1 h silently

**Cross-stream deps:** receives S03-L11 (specs upload); feeds storage RLS from s01

---

### 3.11 Schedule Management

One-line purpose: Activity grid, CPM, Gantt, WBS, PMXML import, DCMA, milestone, calendar.

**Implemented**
- `stream-11.activity-grid`, `stream-11.baseline-management`, `stream-11.calendar-manager`, `stream-11.compliance-strip`, `stream-11.cpm-computation`, `stream-11.dcma-14-audit`, `stream-11.milestone-tracking`, `stream-11.pmxml-import`, `stream-11.wbs-tree`

**Partial (orphan-adjacent)**
- `stream-11.aace-classification`: Gap: AACE_CLASSES orphaned; not wired to DCMA (Rank 33)
- `stream-11.gantt-image-ai-import`: Gap: no frontend invocation of parse-schedule edge function
- `stream-11.gantt-rendering`: Gap: milestone diamonds / dependency arrows need verification
- `stream-11.memo-export`: Gap: DcmaPanel exports .txt; memo-export.ts wiring unverified (Rank 36)
- `stream-11.progress-spi-cpi`: Gap: no UI surface (Rank 34)
- `stream-11.resource-manager`: Gap: ResourceManager UI is thin
- `stream-11.tia-generator`: Gap: no UI entry point (Rank 35)

**Missing**
- `stream-11.xer-import`: XER parser fully deleted 2026-05-29; dialog still claims ".xer or .xml" (Rank 32)
- `stream-11.schedule-to-pay-item-linking`: no hook, no UI for activity→pay-item (Rank 20)

**Cross-stream deps:** feeds stream-13 DCMA; overlaps s12.*

---

### 3.12 Schedule Engine (CPM)

One-line purpose: CPM engine, PMXML ingest, Gantt, baselines, calendars, resources, AI parse.

**Implemented**
- `s12.cpm-engine`, `s12.p6-pmxml-import`, `s12.baseline-manager`, `s12.gantt-visualization`, `s12.calendar-management`, `s12.resource-management`, `s12.parse-schedule-ai`

**Notable gaps**
- `s12.resource-management`: Resource leveling not implemented in runCpm

**Cross-stream deps:** overlaps stream-11.*; feeds stream-13 DCMA audit

---

### 3.13 DCMA & Schedule Quality

One-line purpose: DCMA 14-point audit, compliance strip, progress variance, TIA fragnet.

**Implemented**
- `stream-13.dcma-14-audit`, `stream-13.schedule-health-panel`

**Partial**
- `stream-13.re-memo-generation`: Gap: not wired to "Download Memo" button (Rank 36)
- `stream-13.progress-variance`: Gap: compareProgress has no UI surface (Rank 34)
- `stream-13.tia-generator`: Gap: buildTia has no UI entry point; only first successor traced (Rank 35)

**Notable audit bugs (implemented)**
- `S18-9`: CPLI uses sum-of-TF instead of path-level float; BEI denominator counts all completions not baseline-window completions

**Cross-stream deps:** overlaps stream-11.*; receives CPM output from s12.cpm-engine

---

### 3.14 Measurement & Geometry Engine

One-line purpose: Affine transforms, hit-testing, Kalman filter, area/length/unit helpers.

**Implemented**
- `stream-14.affine-2pt`, `stream-14.affine-3pt`, `stream-14.distance-px`, `stream-14.format-measurement`, `stream-14.gps-to-local-ft`, `stream-14.gps-to-plan`, `stream-14.hit-testing`, `stream-14.kalman-filter`, `stream-14.line-length`, `stream-14.polygon-area-sf`, `stream-14.sf-conversions`

**Partial**
- `stream-14.coordinate-normalization`: Gap: no `normalizeToScale1()` helper; callers must divide manually
- `stream-14.vertex-drag-recalc`: Gap: coupling lives in PdfCanvas; not unit-testable in isolation

**Notable gaps (implemented)**
- `stream-14.affine-3pt`: `estimatedErrorFt` is plan-pixel residual, not feet
- `stream-14.gps-to-local-ft`: flat-earth approximation; no range guard for >5 mi extents
- `stream-14.kalman-filter`: KalmanState never persisted; cold-starts on every remount

**Cross-stream deps:** implements stream-05 tools; feeds s09 GPS calibration

---

### 3.15 Offline & Native Durability

One-line purpose: IDB mirror, PWA service worker, PDF cache, optimistic writes, PWA update toast.

**Implemented**
- `s15.AC2_optimistic_idb`, `s15.AC3_serial_per_row_4_workers`, `s15.AC4_backoff_sync_panel`, `s15.AC5_capacitor_no_sw`, `s15.AC6_pwa_update_toast`, `s15.AC7_pdf_cache`

**Partial**
- `s15.AC1_offline_serve`: Gap: daily_reports hard-capped at 30 rows (Rank 7)
- `s15.risk.R1`: silent truncation of older daily report history (Rank 7)
- `s15.risk.R2`: conflict resolution absent (Rank 9)
- `s15.risk.R3`: IDB schema v2 no forward migration path (Rank 8)
- `s15.risk.R4`: jsPDF.save() bypasses warmPdf; generated PDFs unavailable offline

**Cross-stream deps:** implements s17.offline-*; interacts with s03 IDB cache

---

### 3.16 Push Notifications

One-line purpose: FCM/APNs mobile push + web-push, triggered by report status changes.

**Implemented**
- `s16.daily-reports-status-side-effects` (edge function exists)
- `s16.mobile-push-delivery`, `s16.notification-inserts`, `s16.send-push-edge-fn`

**Todo**
- `s16.notification-trigger-sync`: Why blocked: missing DB trigger on public.notifications (Rank 15)
- `s16.web-push-subscriptions`: Why blocked: no VAPID key; no SW PushManager logic (Rank 16)

**Cross-stream deps:** feeds 06-L2-08; depends on device_tokens table

---

### 3.17 Offline Sync

One-line purpose: IDB schema, mirror snapshots, outbox drain loop, service worker, optimistic mutations.

**Implemented**
- `s17.offline-idb-schema`, `s17.offline-mirror`, `s17.offline-mutate`, `s17.offline-service-worker`, `s17.offline-sync-loop`, `s17.use-project-offline-pivot`

**Partial (all)**
- `s17.offline-mirror`: Gap: no auto periodic re-snapshot; manual call only
- `s17.offline-mutate`: Gap: _pendingSync not exposed in types; UI cannot show pending state
- `s17.offline-service-worker`: Gap: NetworkFirst 3s timeout — slow network treated as offline
- `s17.offline-sync-loop`: Gap: no cross-row dependency ordering; conflict items silently retried forever
- `s17.use-project-offline-pivot`: Gap: calibrations/pay_items still use direct DB updates; realtime can overwrite optimistic state

**Cross-stream deps:** implements s15 ACs; depends on Supabase RLS from s01

---

### 3.18 Compliance & Audit

One-line purpose: Daily-report snapshot library, FSM trigger, RE review workflow, DCMA audit component.

**Implemented**
- `S18-1..S18-10` (all implemented or partial)

**Notable partial gaps**
- `S18-1`: _excludeDailyReportId param unused; `as any` cast on v_approved_pay_item_quantities
- `S18-2`: trigger fires on ANY UPDATE (not just status changes); service-role bypass risk on approved_by
- `S18-3`: approved transition does NOT archive submitted snapshot; archived_reason is free-text
- `S18-5`: Approve/Reject buttons render even when readOnly=true
- `S18-6`: single-character reject reason passes validation
- `S18-7`: non-transactional submit (Rank 13); reopen() side-effect not surfaced to UI
- `S18-9`: CPLI/BEI calculation errors (see stream-13 note)

**Cross-stream deps:** triggers from 06-L2-04/05; feeds s07 approved quantities

---

### 3.19 Marketing

One-line purpose: Landing page, LLM context file, pricing communication, claim alignment.

**Implemented**
- `s19.landing-page-implementation`, `s19.llms-txt-context`, `s19.pricing-communication`

**Partial**
- `s19.public-claims-alignment`: Gap: multiple live claims contradict roadmap (all lie-tax items)
- `s19.demo-requests-form`: Gap: missing migration; no Admin UI for submissions (Ranks 14, 21)

**Cross-stream deps:** overlaps stream-20.landing-page; feeds stream-20.demo-requests-table

---

### 3.20 Sales & Pitch

One-line purpose: /demo walkthrough, partner pages (/fajar, /mcfa), P6XML demo, SEO assets.

**Implemented**
- `stream-20.demo-cta-linkage`, `stream-20.interactive-demo`, `stream-20.fajar-pitch`, `stream-20.mcfa-pitch`, `stream-20.p6xml-demo`, `stream-20.roi-calculator`, `stream-20.sitemap-robots`, `stream-20.llms-txt`

**Partial**
- `stream-20.landing-page`: Gap: demo_requests migration missing; mobile stagger layout shift
- `stream-20.demo-requests-table`: Why blocked: DB migration absent (Rank 14)

**Notable gaps (implemented)**
- All partner pages have hard-coded pricing (no CMS)
- `stream-20.sitemap-robots` and `stream-20.llms-txt`: hard-coded production domain; staging serves incorrect canonical URLs
- `stream-20.fajar-pitch`: seed-based fake fleet data may mislead during live demos

**Cross-stream deps:** overlaps s19.landing-page-implementation; overlaps s19.demo-requests-form

---

## 4. Pivot Ledger

| Date | Abandoned | Replaced With | Scars (affected leaf IDs) |
|------|-----------|---------------|--------------------------|
| 2026-03-15 | Static SpecViewer text-dump (specs-utils.ts pre-parse) | PDF.js direct rendering pipeline | `S03-L05`, `S03-L11` (specs path) |
| 2026-03-21 | Local/in-memory only state | Supabase-backed schema (migrations 20260321*) | `s01.*`, `s02.*`, `s17.*` baseline |
| 2026-03-21 | Plain PDF.js canvas | Fabric.js annotation layer over PDF.js | `s04.*`, `stream-05.*` tool handlers |
| 2026-03-23 | Auto-assign PM on signup | Org-based invitation RBAC | `s01.invitations`, `s02.invitation-acceptance` |
| 2026-03-27 | No brand / no GPS hero | TakeoffPro brand + GPS georeferencing hero workflow | `s09.*`, `stream-14.kalman-filter`, `stream-05.gps-*` |
| 2026-05-05 | TakeoffPro brand; GPS field-measurement page | Brand reset; daily-report + jsPDF workflow introduced | `s01.biometric-gate` (BiometricGate.tsx still shows "TakeoffPro"), `06-L2-*`, `s07.*` |
| 2026-05-05 | No client PDF generation | jsPDF added for summaries and PNG export | `s07.AC-03`, `s15.risk.R4` |
| 2026-05-26 | Manual/ad-hoc schedule entry | P6 PMXML pipeline (import-p6.ts, CPM engine, Gantt) | `s12.*`, `stream-11.*` |
| 2026-05-29 | XER flat-file parser (src/lib/xer/, XerDemo, XerLensTour) | PMXML-only; analysis modules under src/lib/schedule/analysis/ | `stream-11.xer-import` (dialog label scar), pivot 2026-05-29 |

---

## 5. Out-of-Scope / Explicitly Deferred

- **ProjectWise integration** — claimed roadmap; no code exists. (lie-tax M-1; snapshot 2026-05-29)
- **SiteManager / AASHTOWare API** — claimed FAQ; no API surface in codebase. (lie-tax F-2; snapshot 2026-05-29)
- **DC-84 Monthly Estimate format** — roadmap item; generic XLSX export exists. (lie-tax M-8; Landing.tsx:181)
- **Photo annotation with GPS metadata** — roadmap item; camera.ts shim exists but attachment is not wired. (lie-tax M-7; snapshot 2026-05-29)
- **Resource leveling in CPM** — not in runCpm; deferred. (s12.resource-management; snapshot 2026-05-26)
- **SOC 2 compliance** — aspirational trust badge only; no audit, no controls documentation. (lie-tax M-9)
- **GPS hero / TakeoffPro brand** — abandoned 2026-05-05 (pivot c1559f62); do not reintroduce.
- **XER flat-file parsing** — permanently dropped 2026-05-29 (pivot d3a455d7); do not reintroduce.
- **Self-service pricing calculator or tier selection** — deferred per current per-project quote model. (s19.pricing-communication)
- **Per-project membership roles** — project_members table is binary (in/out); per-project PM-vs-inspector distinction is global only. Scoped role is explicitly deferred. (s01.project-membership)

---

## 6. Open Questions

1. **SLA badge (F-1): remove vs draft SLA document.**
   Trade-off: removing the badge costs one line of JSX and eliminates procurement risk immediately; drafting a real SLA backed by Supabase's 99.9% commitment takes 1–2 weeks of legal/ops work and may still be rejected if Supabase's SLA has carve-outs. Recommendation: remove badge now, add SLA as a separate milestone.

2. **"Start Free Trial" CTA (M-2): rename vs build a trial flow.**
   Trade-off: renaming to "Get Started" takes 30 seconds and removes false expectation; building a real 14-day trial requires billing infrastructure, trial-to-paid conversion hooks, and data-isolation decisions. Rename now; trial flow is a separate product decision.

3. **XER import dialog label (Rank 32): fix label vs delete the import flow entirely.**
   Trade-off: changing one string from ".xer or .xml" to ".xml" fixes the cosmetic scar with no risk; deleting the ImportP6Panel removes dead UI but touches schedule import flow. Fix the label; do not delete the panel.

4. **Orphaned analysis (TIA, progress SPI/CPI): wire to UI vs delete the code.**
   Trade-off: wiring requires new UI routes and PM sign-off on UX; deleting removes untested code surface but may surprise a future sprint. Recommended: add a "Schedule Analysis" tab stub now, wire TIA and progress variance behind a feature flag — do not delete.

5. **AACE_CLASSES orphan (Rank 33): integrate into DCMA panel vs delete the constant.**
   Trade-off: integration would add maturity-curve context to DCMA output (low complexity); deletion simplifies codebase. Since the constant is already written and AACE classification is a value-add for RE users, wire it to DCMA panel before deleting.

6. **Offline conflict resolution (Rank 9): build UI vs silent last-write-wins.**
   Trade-off: a conflict-resolution UI is high UX complexity and rarely needed for inspection workflows where each inspector owns their own pay items; silent last-write-wins is pragmatic for the current team size. Implement a "conflict detected, reloading from server" toast as minimum viable resolution before shipping to multi-inspector teams.

7. **demo_requests migration (Rank 14): apply migration vs disable the contact form.**
   Trade-off: applying a missing migration in production is low risk (additive table); disabling the form means leads are lost. Apply the migration; build Admin UI as Rank 21.

8. **Web-push vs mobile-only push (Rank 16): ship VAPID web-push vs defer to native only.**
   Trade-off: VAPID web-push requires HTTPS + SW subscription management + key rotation; mobile FCM is already partially wired. Defer VAPID web-push; ship the DB-trigger→send-push wiring for mobile first (Rank 15).

9. **v_approved_pay_item_quantities DDL (Rank 4): add migration vs keep in manual runbook.**
   Trade-off: adding the DDL to migrations makes schema reproducible and unbreakable during future deploys; keeping it out is a silent time-bomb. Add the migration; cast removal from `as any` follows automatically once Supabase types are regenerated.

10. **DC-84 export (M-8): downgrade marketing copy vs ship the format.**
    Trade-off: shipping DC-84 requires understanding NJDOT form specifications, potentially months of effort; downgrading copy to "CSV/XLSX export (DC-84 format on roadmap)" takes minutes. Downgrade the copy immediately; schedule DC-84 as a funded milestone.
