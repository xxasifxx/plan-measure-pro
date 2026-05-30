
# MCFA Pitch — Detailed Build Plan

Goal: one page (`/mcfa`) that shows MCFA (a) progress on building the app, (b) a tentative schedule to finish it, (c) what the finished app does across roles, on an imagined NJTA project. Everything reads from existing data — no new tables, no new scripts, no agent runs.

The fix is **presentation + grouping**, not new systems. The current 22 streams are kept as-is on disk; the pitch reads them through a 5-phase rollup so the audience sees structure, not jargon.

---

## Section A — "What I've built so far" (top of page, ~1 screen)

Purpose: in 10 seconds, prove this is a real, sizeable codebase — not a slideware demo.

Five stat tiles, hard-coded numbers pulled once from existing artifacts (no runtime queries):

| Tile | Number | Source |
|---|---|---|
| Application screens | count of files in `src/pages/**` | static |
| Database migrations | count of files in `supabase/migrations/**` | static |
| Edge functions | count of dirs in `supabase/functions/**` | static |
| Lines of TypeScript | `wc -l src/**/*.ts*` | static |
| P6 XML round-trip | "Verified — see /p6-xml" | link |

Below tiles: one paragraph (3 sentences) — "Six months of build. The core takeoff loop works end-to-end on web, mobile, and offline. The remaining work is QA, polish, and the scheduling integration MCFA cares about most."

No animation, no gradients. Mono font, left-aligned, engineering-report look.

---

## Section B — "The work breakdown" (the WBS, regrouped)

Purpose: show MCFA you understand WBS structure. This replaces the current 22-row jargon dump.

**Two-level structure rendered as a collapsible tree:**

```text
Phase 1 — Foundation                    [Built]
  01 Identity & Access
  02 Portfolio & PM Home
  03 Project Onboarding
  10 Document Management

Phase 2 — Field Capture                 [Built · QA in progress]
  04 Pay Item Catalog
  05 Field Capture
  08 Photo Evidence
  14 Measurement & Geometry Engine
  15 Offline & Native Durability
  16 Mobile Field Ergonomics

Phase 3 — Office Workflow               [In Progress]
  06 Daily Report Lifecycle
  07 Quantity to Payment
  09 Standard Specifications
  17 Notifications & Presence
  19 Onboarding & Tutorials

Phase 4 — Scheduling & Reporting        [In Progress — MCFA focus]
  11 Schedule Management
  12 Project Health & Controls
  13 Data Export & Interoperability
  18 Compliance & Audit

Phase 5 — Go-to-Market                  [Planned]
  20 Sales & Pitch
```

**Per stream, the row shows:**
- Stream code + name
- Status pill: `Built` / `In Progress` / `Needs QA` / `Planned` (translated from the source-type jargon — see Rollup section)
- One-sentence plain-English deliverable (curated, not auto-extracted)
- Click-to-expand: shows the existing 2–4 acceptance criteria from `docs/streams/NN-*.md`, rewritten as user outcomes ("Inspector can mark a pay item complete offline and it syncs when reconnected") instead of file paths

**Phase header rows** show: count of streams Built / In Progress / Planned, and a date range from `schedule.json`.

No 22-stream flat list. No `capability_partial` / `verification_gap` / `placeholder_per_leaf` language anywhere on the page.

---

## Section C — "Baseline, actuals, forecast" (the schedule)

Purpose: prove you can read and produce a real P6-shaped schedule, which is exactly what MCFA evaluates.

**Layout: a single Gantt-style chart, 5 rows (one per phase) + 7 milestone diamonds.**

For each phase row, draw three bars stacked thin:
- **Baseline** (gray, planned start → planned finish from `schedule.json`)
- **Actual** (solid colored, from `wbs-dev.activities.json` — sum of "implemented" leaves' first-commit dates to today)
- **Forecast** (outlined, today → projected finish from `schedule.json` remaining-days estimate)

Above the chart, three numbers, big mono:
- **Elapsed:** days since T0 (use first commit date in repo as T0)
- **Remaining:** sum of `defaults_days.planned + partial` across non-implemented leaves
- **Variance vs baseline:** delta in days, signed, color-coded

Milestone diamonds from `schedule-config.json`: M0–M6. Each diamond labeled with its name (already plain English: "Foundation verified", "Field capture pilot-ready", etc.). Tooltip on hover shows the gate condition translated to plain English.

Below the chart, one small note: "Dates are forecasts based on remaining scope and current build velocity. T0 = first commit. Updated automatically from `.lovable/wbs/schedule.json`."

**No DCMA panel, no CPM display, no float columns.** Those exist in the app at `/p6-xml` for anyone who wants to see them; the pitch doesn't need them.

---

## Section D — "What the finished app does" (role walkthrough)

Purpose: the imagined NJTA project demo, without leaving the page.

5 acts, presented as a horizontal stepper. Each act = one card with: role badge, 1-sentence scenario, 1 screenshot (static PNG of the actual app), 1-sentence outcome.

| Act | Role | Scenario | Screenshot | Outcome |
|---|---|---|---|---|
| 1 | PM (you) | Set up NJTA Contract 104-0001, import the 240-page plan set and contractor's P6 baseline | `/dashboard` + `/p6-xml` import view | Project is live; pay item catalog and schedule are linked |
| 2 | Inspector (field) | Walks Span 1, measures deck demo on tablet, takes 4 geotagged photos, all offline | `/projects/:id` mobile view + measurement overlay | Daily report drafted offline, queued for sync |
| 3 | Inspector | Connects to wifi at the trailer; report syncs and lands in RE's queue | Sync panel + re-review queue | Quantities are now in the system, audit-stamped |
| 4 | RE | Opens the re-review queue, approves 6 measurements, rejects 1 with comment | `/re-review` | Approved quantities flow to `v_approved_pay_item_quantities` |
| 5 | PM (you) | Hits "Update P6" → app reads approved quantities, writes `ActualUnits` + `%Complete` + `DataDate` into the contractor's PMXML → downloads | `/p6-xml` apply + diff table | A1020 deck demo goes 0% → 47%, A1030 rebar 0% → 14%, with full inspector/date provenance |

The Act 5 card is the **money shot**. Include a small static "before/after" table inside that card so MCFA sees the actual P6 fields that change.

Below the stepper: one line — "Every step above runs today. Try it at /demo for the interactive version."

---

## Section E — Nav trim (small but necessary)

Remove from public/landing nav (keep them reachable when authenticated):
- `/wbs`
- `/fajar`
- `/project-controls`
- `/p6-xml-demo` (consolidated into `/p6-xml`)

Public nav becomes: **Home · Demo · MCFA · Sign in**

`Landing.tsx` hero subhead changes to the same one-sentence pitch as `/mcfa` Section D Act 5: "Inspector measurements update the contractor's P6 schedule, with a full audit trail."

---

## Technical implementation

**New files (3):**

1. `src/pages/mcfa-pitch/lib/wbs-rollup.ts`
   - Exports `PHASES`: array of 5 phase objects, each with `id`, `name`, `streamKeys[]`, `oneLineDeliverable`.
   - Exports `translateVerdict(sourceType: string): 'Built' | 'In Progress' | 'Needs QA' | 'Planned'` — maps `implemented` → Built, `capability_partial` → In Progress, `verification_gap` → Needs QA, `planned`/`placeholder` → Planned.
   - Exports `getPhaseFor(streamKey)`, `getStreamsForPhase(phaseId)`.
   - Pure data + functions, ~120 lines, no React.

2. `src/pages/mcfa-pitch/PhaseSchedule.tsx`
   - Reads `/public/wbs/schedule.json` via fetch on mount (already published there by `scripts/wbs/publish-public.mjs`).
   - Reads `/public/wbs/build-backlog.json` for actuals (count of implemented leaves per phase).
   - Renders the Gantt with SVG (no chart library; ~80 lines of SVG). 5 rows × 3 bars + milestone diamonds.

3. `src/pages/mcfa-pitch/Roleplay.tsx`
   - Static array of 5 acts.
   - Renders horizontal stepper on desktop, vertical accordion on mobile (< 768px).
   - Screenshots: reuse existing `/public` assets if present, otherwise placeholder `bg-muted` cards with role badge — list which screenshots to capture in a follow-up so this lands without blocking on assets.

**Modified files (2):**

4. `src/pages/McfaPitch.tsx` — full rewrite (~400 lines → ~250 lines).
   - Drops pricing calculator, proposal data block, "AI-powered" copy.
   - 4 sections in order: A (stats) → B (WBS tree) → C (`<PhaseSchedule />`) → D (`<Roleplay />`).
   - Single CTA at bottom: "Try the live demo" → `/demo`. Secondary: "See the P6 round-trip" → `/p6-xml`.

5. `src/App.tsx` — keep all existing routes (so deep links still work), but `Landing.tsx` nav links drop the four routes listed in Section E.

**Not modified:**
- No changes to `docs/streams/*.md` (22 files stay as the source of truth for developers).
- No changes to `.lovable/wbs/*.json` or any `scripts/wbs/*.mjs` (the pipeline that produces them is fine — the problem was never the data, it was the rendering).
- No DB migrations.
- No edge functions.
- No changes to `/p6-xml`, `/demo`, `/wbs` themselves.

---

## What this gives MCFA, concretely

1. **Page A** answers "is this real?" — yes, with numbers.
2. **Page B** answers "do you know how to structure a project?" — yes, 5 phases, deliverables in English, status honest.
3. **Page C** answers "can you produce a schedule?" — yes, baseline + actual + forecast + milestones, the three columns every scheduler looks for first.
4. **Page D** answers "what does it do?" — 5-act story ending in the exact P6 integration MCFA cares about.
5. **Section E** removes the noise so MCFA never lands on `/wbs` raw.

---

## What this deliberately is not

- Not a redesign of `/wbs` (that page is for internal self-management; MCFA never sees it).
- Not a new scheduling system or DCMA layer.
- Not new copy for `Landing.tsx` beyond the hero subhead and nav trim.
- Not a Fajar update; `/fajar` stays exactly as-is, just unlinked from public nav.
- Not a "lie-tax" cleanup of marketing promises — Section A only claims what's verifiable.

---

## Open questions before build

1. **Screenshots for Section D Acts 1–5**: do you want me to capture them from the running app (I'd take 5 PNGs at 1440×900 and 390×844), use existing assets you already have, or ship with labeled placeholder cards in v1 and swap them in v2?
2. **T0 for the schedule**: first commit date (auto), or a specific date you want to anchor to (e.g., the day you signed the MCFA NDA)?
3. **The one-sentence deliverable per stream** for Section B — want me to draft all 22 and you edit, or do you want to write them yourself before I build?
