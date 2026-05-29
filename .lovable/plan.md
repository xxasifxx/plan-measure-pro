## Why this revision

Previous plan treated "drop XerDemo" as deleting one page. Your correction: the *reason* is that PMXML is the import/export format, so the XER format itself is going away — the demo was just its only remaining visible surface. That means the entire `src/lib/xer/*` engine has to be reckoned with, not preserved. You also confirmed the engine's analytical capabilities (DCMA-14, TIA, AACE, RE memo) are real product value that should survive — just on PMXML rails.

You also approved 5 additional value streams. Total goes from 15 → 20.

---

## Track 1 — XER demolition + engine rehome onto PMXML

**Delete outright**
- `src/pages/XerDemo.tsx`, `src/components/XerLensTour.tsx`
- `/mcfa/demo` route in `src/App.tsx`, XerDemo CTA in `src/pages/McfaPitch.tsx`
- `src/lib/xer/parser.ts`, `sample.ts`, `sample-update.ts`, `types.ts`, `wbs.ts` (after extracting one constant)
- `.xer` file support in `src/components/schedule/ImportP6Panel.tsx` and `src/lib/schedule/import-p6.ts` — XML only
- `src/test/xer-parser.test.ts`, `src/test/tia.test.ts` (rewritten under PMXML)

**Inline trivial leftovers**
- Lift `NJDOT_REQUIRED_MILESTONES` from `lib/xer/wbs.ts` into `src/components/schedule/ComplianceStrip.tsx` (the only consumer)

**Rehome the engine onto PMXML** — move into `src/lib/schedule/analysis/`, refactored to consume the parsed PMXML tables (`P6Tables` from `src/lib/p6xml/parser.ts`) or the project's `ScheduleActivity[]`/`ActivityRelationship[]` shape (already normalized), not XER tables:
- `dcma.ts` → DCMA-14 schedule quality checks
- `tia.ts` → Time Impact Analysis
- `aace.ts` → AACE estimate-class bands
- `feedback.ts` + `memo-export.ts` → RE feedback memo (PDF/DOC)
- `progress.ts` → period-over-period progress comparison
- `chart-export.ts` → SVG-to-PNG chart export

These become first-class capabilities of the **Schedule Management** stream, surfaced inside `ProjectControls.tsx`'s Schedule workspace (not in a standalone demo). Tests rewritten against PMXML samples in `src/lib/p6xml/sample.ts`.

**Sanity check**
- Zero hits for `lib/xer`, `XerDemo`, `XerLensTour`, `.xer` after demolition (except possibly in `docs/` historical files, which is fine)
- `bun test` green
- `/mcfa/demo` returns 404; sitemap/llms.txt updated

---

## Track 2 — 20 value streams

Original 15 stand, with four splits and one addition. Reorganized:

**Operational value streams (deliver participant value)**
1. **Identity & Access** — auth, RLS, invite, reset, role membership
2. **Portfolio & PM Home** *(new)* — Dashboard, project list, cross-project switching, "where you land after login"
3. **Project Onboarding** *(narrowed)* — first-run setup wizard: org → project → plans → initial calibration → team → ready. Stops the moment ongoing operation begins.
4. **Pay Item Catalog** *(split from Onboarding)* — ongoing lifecycle: import from plans, manual add, contract mods, unit-code grouping, cascade deletes, measurable vs manual-entry
5. **Field Capture** *(narrowed)* — inspector on site: annotate, GPS-trace, capture quantities, offline-durable submission
6. **Daily Report Lifecycle** *(split from Q2P)* — inspector compose → submit → RE re-review queue → approve/reject. Surfaces: `DailyReport.tsx`, `ReReview.tsx`, snapshot library, useReReviewQueue
7. **Quantity-to-Payment** *(narrowed)* — payment-side: approved-quantity cumulation, contract-vs-measured variance, payment-period rollups
8. **Photo Evidence** — capture, AI-tag (tag-photo edge fn), link to pay item
9. **Standard Specifications** — upload, index, instant search, per-pay-item lookup
10. **Document Management** — folders, versions, trash, preview, search, star
11. **Schedule Management** *(expanded scope)* — PMXML ingest/export, CPM, Gantt, baselines, calendars, resources + the **rehomed engine** (DCMA-14, TIA, AACE, RE feedback memo)
12. **Project Health & Controls** — KPI tiles, quantity variance, inspector adoption, EOS scorecard (per-project scope only; portfolio scope is stream #2)
13. **Data Export & Interoperability** — CSV, approved-PDF, Excel daily report, PMXML round-trip, NJDOT format conformance. Its acceptance criteria are format-fidelity, not upstream content.

**Enabling streams (substrate with own acceptance criteria)**
14. **Measurement & Geometry Engine** *(split from Field Capture)* — scale calibration, geometric editing, SY/CY formulas, GPS georef + Kalman, annotation labels with leader lines, zoom-independence, manual-override preservation
15. **Offline & Native Durability** — IndexedDB, outbox, mirror, sync, PWA, biometric gate, background sync, push, first-run wizard
16. **Mobile Field Ergonomics** *(new)* — MobileTabBar, MobileToolbar, MobileAnnotationSheet, MobilePayItems, MobileSections, status chips, touch selection constraints. Distinct from #15: that's data durability, this is interaction design.
17. **Notifications & Presence** — NotificationBell, realtime channels, online users, push delivery
18. **Compliance & Audit** — traceable captures, spec citation per quantity, DC-84 conformance, immutability of approved snapshots

**Cross-cutting streams**
19. **Onboarding & Tutorials** — GuidedTour, useTour, WelcomeCarousel, NativeFirstRun, the 12-step interactive demo at `/demo`
20. **Sales & Pitch** — Landing, McfaPitch, FajarPitch, P6XmlDemo (kept as standalone PMXML pitch). Marketing stream.

---

## Track 3 — Comprehension pass (unchanged shape, new stream count)

**Phase 1** *(AI only)* — write one-page brief per stream in `docs/streams/<id>.md`: purpose, value delivered, primary persona + secondary/tertiary, jobs list, handoffs in/out, success metrics, format-fidelity criteria (for #13), audit criteria (for #18). Plus `docs/streams/00-overview.md` with the stream map and handoff graph.

**Phase 2** *(capable subagents in parallel, ~40–55 jobs total across 20 streams)* — one subagent per job, each reconstructing from code + the stream brief only. Output `docs/jobs/<stream-id>-<job-id>.md` with trigger, preconditions, steps (with surface/file evidence), acceptance criteria, current state (built / partial / planned), gaps, failure modes. Forbidden inputs: `wbs.json`, `wbs-leaves.yaml`, `wbs-proposals.reconciled.json`, `scope-inventory*`, old `commit-tag` artifacts, old `scripts/*.mjs` outputs.

**Phase 3** *(one capable subagent)* — `docs/functional-requirements.md`: cross-cutting requirements (RLS posture, offline guarantees, format-fidelity matrix, audit chain, NJTA 7th Ed. citation rules) that every stream must satisfy.

**Phase 4** *(AI synthesis)* — `docs/comprehension-report.md` as the presentation artifact: meta-pitch framing ("we're using TakeoffPro to comprehend TakeoffPro"), per-stream status, live handoffs, broken handoffs, headline gaps, cross-cutting requirements. Plus `docs/wbs-v2.json` mechanically derived from job files: status from acceptance-criteria satisfaction, durations estimated per unsatisfied criterion, dependencies from handoffs.

**Phase 5** *(AI only)* — `docs/wbs-diff.md`: old `wbs.json` kept as "before" baseline, diff'd against `wbs-v2.json`. Notes what's newly visible, newly retired, and what changed status.

---

## Files touched

**Deleted:** `XerDemo.tsx`, `XerLensTour.tsx`, `lib/xer/*` (all 13 files), `test/xer-parser.test.ts`, `test/tia.test.ts`
**Modified:** `App.tsx`, `McfaPitch.tsx`, `ImportP6Panel.tsx`, `lib/schedule/import-p6.ts`, `ComplianceStrip.tsx`, `public/sitemap.xml`, `public/llms.txt`, `ProjectControls.tsx` (mount engine panels)
**Created (engine rehome):** `src/lib/schedule/analysis/{dcma,tia,aace,feedback,memo-export,progress,chart-export}.ts`, `src/test/{dcma,tia-pmxml,aace}.test.ts`
**Created (comprehension):** `docs/streams/00-overview.md` + 20 stream briefs, `docs/jobs/*.md` (~40–55), `docs/functional-requirements.md`, `docs/comprehension-report.md`, `docs/wbs-v2.json`, `docs/wbs-diff.md`
**Untouched:** old `wbs.json`, `wbs-leaves.yaml`, `wbs-proposals.reconciled.json`, `scope-inventory*`, old `scripts/*.mjs` (kept as historical baseline for Phase 5 diff)

---

## Cost shape

- Track 1: small but real — engine rehome is a refactor with test rewrites, not a delete
- Track 3 Phase 1: AI only
- Track 3 Phase 2: dominant cost — ~40–55 capable subagents in parallel
- Track 3 Phases 3–5: AI only

## Out of scope (explicitly)

- Re-deriving file surfaces, recomputing critical path, estimating durations from git history, depth-audit of old artifacts
- Building any new product feature beyond the engine rehome required by Track 1
- Touching `src/lib/p6xml/*` beyond what the engine rehome needs to consume it
