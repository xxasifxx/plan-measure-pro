
# Strategic Realignment: CPM Scheduler/Estimator Pitch + XER Live Demo

The proposal demands two coordinated deliverables: (1) a re-narrated `/mcfa` pitch that repositions the candidate from "Hybrid Inspector + Systems Integrator" to **systems-enabled CPM Scheduler/Estimator**, and (2) a live, drag-and-drop **XER parser PWA demo** at `/mcfa/demo` that proves the four modules described in Section "Technical Specifications for the Live Demonstration."

Existing TakeoffPro features stay — they become the *Phase 1 / field-data ingest* half of the story. The scheduler/estimator capability is layered on top.

---

## 1. `/mcfa` pitch rewrite (`src/pages/McfaPitch.tsx`)

Keep the existing section scaffold; rewrite copy and reorder so scheduling leads.

| # | Section | Change |
|---|---|---|
| Hero | "TakeoffPro proof-of-concept" | New title: **"Systems-Enabled CPM Scheduler / Estimator."** Sub: "PMP · DO-178B-grade rigor · auth-agnostic XER tooling for NJDOT & NYSDOT." Add a second CTA → **"Open XER Live Demo"** → `/mcfa/demo`. |
| 00 Workflow Replacement | Manual vs TakeoffPro | Reframe as **"Field → P6 latency, eliminated"**: paper DC → Excel → email → re-key into P6 becomes one record that exports to NJDOT Daily, pay estimate, and **P6 schedule update CSV**. |
| 01 Introduction | Strategic Vision | Replace narrative with the four-beat from Section 2 of the proposal: (a) firm mission, (b) PMP + aerospace/DO-178B → DOT compliance, (c) BYOR + EOS Entrepreneurial spirit, (d) thesis = data latency & logic flaws kill projects. |
| 02 Role Description | "2,200-Hour Hybrid Model" | Rename **"The Systems-Enabled Scheduler — 10 Core Activities."** Render the 10 bullets verbatim (P6 baselines & NJDOT WBS · contractor schedule assessment · DCMA-14 QA · AACE 98R-18 estimating · EVM telemetry · L10 integration · TIA automation · drag-drop XER tools · portfolio integration · bid scheduling). |
| 03 Internal Shop Tool | "TakeoffPro 3-Phase AI" | Rename **"Internal Platform: TakeoffPro + XerLens."** Phase 1 field capture (today) · Phase 2 XER parser PWA (demo today) · Phase 3 portfolio telemetry. |
| 04 KPIs · EOS Rocks | First 90 Days | Replace tiles with the EOS Scorecard table from Section 4: DCMA-14 ≥95%, Schedule Update Latency ≤72h, XER processing −50%, AACE Class 3 SLA. Add long-term lagging row: Baseline Approval Velocity, Claim Mitigation %, VAC <5%. |
| 05 Archetype Matrix | Capability comparison | Update columns to **Trad. Scheduler · Trad. Estimator · Systems-Enabled CPM (you)**. Rows: P6 mastery, AACE estimating, DCMA-14 automation, XER scripting, EOS fluency, DOT compliance fluency. |
| 06 Architecture | Project Controls Systems | Diagram now centers on **XER ingest → parser → DCMA/TIA/WBS modules → EVM dashboard → L10 scorecard feed**. Field inputs (TakeoffPro) feed the same store. |
| 07 ROI Waterfall | Annual | Re-anchor on proposal's **200–400% first-year ROI** and "60% of scheduler hours are low-value" stats. Three scenarios: Conservative (overhead avoidance only), Realistic (+ one mitigated TIA claim), Stretch (+ SaaS license avoidance for Acumen Fuse-class tools). |
| 08 EOS Performance | GWC · L10 · Quarterly | Map weekly L10 Issues feed directly to DCMA-14 / latency scorecard misses. Quarterly Rocks: Q1 XER parser GA, Q2 TIA fragnet automation, Q3 portfolio EVM. |
| 09 Compensation | Transparent | Add the **IP & Tooling clause** from Section 7: scripts/PWAs developed on flex hours remain MCFA IP; MCFA covers raw cloud/API costs in exchange for SaaS avoidance. Keep absorbed-roles ranges + recruiter Q&A panel as-is. |
| Final CTA | — | Two buttons: "Book the live walkthrough" + "Open XER Demo." |

Recruiter Q&A panel: add three new entries — *"Why CPM and not inspection?"*, *"How does this satisfy NJDOT's no-negative-lag rule?"*, *"What if we already license Acumen Fuse?"*

---

## 2. New live demo: `/mcfa/demo` — XerLens PWA

A **standalone, auth-agnostic** route (no login, no Supabase writes) so the recruiter can drag a real `.xer` file in during the call. All parsing happens **in-browser**.

### Route & files
- New route in `src/App.tsx`: `/mcfa/demo` → `<XerDemo />` (public, like `/mcfa`).
- New page `src/pages/XerDemo.tsx`.
- New lib `src/lib/xer/` with:
  - `parser.ts` — tokenizes the tab-delimited XER (header rows `%T TASK`, `%F …`, `%R …`) into typed tables `{ TASK, PROJWBS, TASKPRED, CALENDAR, RSRC, PROJECT }`.
  - `dcma.ts` — runs the 14 checks against parsed tables; returns `{ check, score, failingTaskIds[], target, pass }[]`.
  - `tia.ts` — given a delay note + impacted activity ID, builds a fragnet (insert delay activity + FS link) and drafts an NJDOT-flavored TIA narrative string.
  - `wbs.ts` — flattens PROJWBS to a tree; cross-references milestones against required NJDOT codes (`M100`, `M500`, `M950`, plus the standard set from the Scheduling Manual).
  - `sample.ts` — embeds a small valid sample `.xer` string so the demo works even with no upload.

### UI (single page, four tabs)

```
[ Drag .xer here · or "Load sample NJDOT project" ]
─────────────────────────────────────────────
[ A. DCMA 14 ] [ B. TIA ] [ C. File Explorer ] [ D. WBS / Compliance ]
```

**Module A — DCMA 14-Point Auditor**
- Table: each of the 14 checks with target (e.g. Logic <5%, Leads 0%, Lags <5%, FS ≥90%, Hard Constraints <5%, High Float <5%, Negative Float 0%, High Duration <5%, Invalid Dates 0%, Resources, Missed Tasks <5%, Critical Path Test, CPLI ≥0.95, BEI ≥0.95).
- Pass/fail chip, count of failing activities, "Show offenders" expands to list of `task_code · name`.
- Headline score (overall % passing) and a copy-to-clipboard summary block ready to paste into an email.

**Module B — Automated TIA**
- Form: "Activity affected" (autocomplete from parsed TASKs), "Delay start", "Delay days", "Cause" (free text), "Type" (Weather / Owner-directed / Differing site / Supply chain).
- Output panel: (1) fragnet preview as ASCII (`A1020 ─FS→ DELAY-001 (5d) ─FS→ A1030`), (2) draft narrative paragraph referencing NJDOT/NYSDOT TIA conventions, (3) "Copy narrative" + "Download fragnet CSV" (importable to P6).

**Module C — Intelligent File Explorer**
- Drop zone for arbitrary files (xer, pdf, xlsx, jpg). Files stay in memory only.
- On drop, regex/heuristic tagger assigns ISO 19650-style metadata (`{Project}-{Originator}-{Volume}-{Level}-{Type}-{Role}-{Number}`) inferred from filename + extension.
- Search-driven list (cmdk) with chips for Type, Discipline, Status. Demonstrates the "no more nested folders" promise.

**Module D — WBS / Compliance Verification**
- Collapsible tree from PROJWBS.
- Side panel: checklist of mandatory NJDOT milestones (M100 Advertise, M500 Construction Start, M950 Completion, plus the full M-code set). Each row: green check if a TASK with that `task_code` prefix exists, red X with "Insert milestone" hint if missing.
- Banner: "Negative lags found: N" / "Open-ended activities: N" so the auditor sees instant DOT compliance posture.

### Hero/landing strip on `/mcfa/demo`
Short pitch above the dropzone: "Drop any Primavera P6 `.xer` file. Nothing leaves your browser. In ten seconds you'll see the same DCMA-14 audit, TIA draft, and NJDOT WBS check we'd run on every MCFA project."

---

## 3. McfaPitch CTA wiring
- Replace existing "Open Live Demo" button (currently → `/demo`, the field-app demo) with **two** buttons: "Open Field Demo" → `/demo` (existing) and **"Open XER Demo" → `/mcfa/demo`** (new).
- Final-CTA section gets the same pair.

---

## 4. Out of scope (this round)
- Real Primavera P6 API sync, EVM curve fitting, AACE Class 5→1 estimating workflows beyond display, Acumen Fuse-style report PDFs, and persisting XER uploads to Supabase. The proposal explicitly frames the demo as auth-agnostic and in-browser, so we keep it that way.

---

## Technical Section

**Files added**
- `src/pages/XerDemo.tsx` (page, ~400 LOC, four tabs via `Tabs`)
- `src/lib/xer/parser.ts` — pure TS, no deps; handles `%T`/`%F`/`%R` blocks and quoted fields
- `src/lib/xer/dcma.ts` — 14 check functions, each `(tables) => CheckResult`
- `src/lib/xer/tia.ts` — fragnet + narrative builder
- `src/lib/xer/wbs.ts` — tree + NJDOT milestone matcher (constants: `NJDOT_REQUIRED_MILESTONES`)
- `src/lib/xer/sample.ts` — embedded sample XER string (small NJTA-flavored project)
- `src/lib/xer/types.ts` — `Task`, `ProjWbs`, `TaskPred`, `Calendar`, `Resource`

**Files edited**
- `src/App.tsx` — add `<Route path="/mcfa/demo" element={<XerDemo />} />`
- `src/pages/McfaPitch.tsx` — rewrite per Section 1 above; add second CTA, expand Q&A, swap KPI tiles, update archetype matrix, ROI re-anchor, IP clause in Comp section

**No DB / edge function / migration changes.** Everything runs client-side, matching the proposal's "auth-agnostic" requirement.

**Risks**
- Real-world `.xer` files vary in field order between Primavera versions. Parser keys columns by header row (`%F`) per block, so it adapts; we'll handle missing optional columns defensively and surface a "Couldn't parse N rows" warning rather than crashing.
- DCMA-14 has multiple published variants (DCMA vs DCMA+); we'll cite the canonical 14 and note targets in tooltips.

---

Approve to proceed and I'll build it.
