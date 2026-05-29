# Comprehension Report — v1

Date: 2026-05-29
Inputs: `docs/streams/01..20-*.md`, derived from a code-grounded read of `src/`, `supabase/`, `public/`.
Roll-up: `docs/wbs-v2.json`

## Headline

Across 20 value streams and 141 acceptance criteria, TakeoffPro currently sits at **~86% weighted completion**. Six streams are at 100%, and the bottom five — Compliance & Audit, Mobile Field Ergonomics, Notifications & Presence, Onboarding & Tutorials, Pay Item Catalog — are where the most contract-relevant gaps live.

## Strongest streams (≥ 1.00)

- **Project Onboarding** — full PDF + TOC + pay-item bootstrap path is implemented end-to-end.
- **Field Capture** — every drawing tool, undo/redo, realtime multi-user, and GPS overlay is in place.
- **Daily Report Lifecycle** — submit/freeze/reopen/approve/reject + drift detection all wired.
- **Standard Specifications** — virtualized PDF, three-tier section index, in-doc search all working.
- **Document Management** — versioning, soft-delete trash, signed-URL preview, version restore.

## Weakest streams (≤ 0.80) — prioritized work pool

### 1. Compliance & Audit (0.69)
- **Missing**: dedicated audit log table; DC-84 formatter.
- **Partial**: server-side role separation enforcement (no RLS preventing inspector self-approval).
- **Why it matters**: this is the contractual reason customers buy. Mutable approval columns + no audit log defeats the FHWA-survivability story.

### 2. Mobile Field Ergonomics (0.71)
- **Missing**: minimum touch-target enforcement on canvas handles; dedicated floating Edit FAB.
- **Partial**: gesture disambiguation for single-tap vs drag vs pinch.
- **Why it matters**: inspectors on tablets in the field are the daily user; small handles on overlapping annotations break the core workflow.

### 3. Notifications & Presence (0.75)
- **Partial**: no DB trigger auto-creates `notifications` on `daily_reports` status change; presence `name` is always `''`; FCM uses legacy server key when v1 needs OAuth2 service account.
- **Why it matters**: the inspector↔RE feedback loop is the second selling point after takeoff itself, and the wiring is incomplete on three sides.

### 4. Onboarding & Tutorials (0.75)
- **Missing**: tour replay/reset affordance.
- **Partial**: `data-tour` attributes are inconsistently present in the DOM, so the polling fallback silently fails.
- **Why it matters**: time-to-first-measurement is the demo conversion lever.

### 5. Pay Item Catalog (0.79) & Sales & Pitch (0.79)
- Pay Item Catalog: **missing** contract-modification workflow; `updatePayItems` does destructive DELETE+INSERT on every save (concurrent-edit data loss).
- Sales & Pitch: `demo_requests` table referenced by Landing form but no migration found — contact form may be silently broken in production.

## Cross-cutting themes

These risks appear in 3+ stream briefs and warrant systemic, not stream-local, fixes:

1. **Role enforcement is mostly client-side.** `useApproveReport`, pay-item edits, role gating in `Documents` — all rely on UI guards. Server-side RLS audit is overdue (compliance-and-audit, daily-report-lifecycle, pay-item-catalog, identity-and-access).
2. **Notifications pipeline is broken at the trigger layer.** `send-push` exists, `useNotifications` exists, but nothing inserts into `notifications` automatically. Adding a DB trigger or wiring the relevant mutations to `supabase.functions.invoke('send-push')` would unblock the entire feedback loop (notifications-and-presence, daily-report-lifecycle, compliance-and-audit).
3. **PDF export silently bypasses native filesystem.** `jsPDF.save()` is called directly in `writePdfFromRows`, ignoring `saveExport`. On Capacitor builds, generated PDFs land in browser download not Documents (data-export-and-interoperability, offline-and-native-durability).
4. **Two sources of truth for installed quantity.** `SummaryPanel` reads live annotations; `ProjectControls` variance tab also reads live annotations; `loadApprovedTotalsByPayItem` reads the approved view. PMs see different numbers depending on tab (quantity-to-payment, project-health-and-controls).
5. **Concurrent-write races.** Schedule drag-mutation mutates `cpm.byId` in place; `updatePayItems` does DELETE+INSERT for the whole table; calibration copy-to-pages does bulk delete+re-insert. Each is a quiet last-writer-wins (pay-item-catalog, schedule-management, field-capture).
6. **Untyped Supabase access.** `as any` casts blanket the schedule layer; `daily_report_snapshots` is queried with the same cast in re-review. Type safety is gone for the largest two persistence surfaces (schedule-management, daily-report-lifecycle).

## Suggested next-cycle backlog (in priority order)

1. Add server-side RLS for approval mutations (inspector ≠ approver). Compliance-and-audit + identity-and-access.
2. Wire `daily_reports` status-change trigger → `notifications` insert → `send-push`. Fix FCM v1 OAuth. Notifications-and-presence.
3. Replace `updatePayItems` destructive flow with diff/upsert per row. Pay-item-catalog.
4. Route `writePdfFromRows` through `saveExport` so native PDF exports land in Documents. Data-export + offline.
5. Make `SummaryPanel` and `ProjectControls` variance read from `v_approved_pay_item_quantities`. Quantity-to-payment + project-health.
6. Add `audit_log` append-only table; mirror approval/rejection events. Compliance-and-audit.
7. Enforce 44 × 44 px minimum touch targets on annotation handles; add gesture disambiguation. Mobile-field-ergonomics.
8. Create `demo_requests` migration; confirm Landing form writes succeed. Sales-and-pitch.

## How this report should be used

This document is the "what is real today" baseline. Pair it with `docs/wbs-v2.json` to weight roadmap items, and re-score each affected stream when shipping a fix. The 20 stream briefs are designed to be diffed PR-by-PR — when a `## Current state vs criteria` bullet flips from `partial` to `implemented`, the overall completion in `wbs-v2.json` should move with it.
