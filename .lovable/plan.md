## Reframe

The "project" to schedule is **TakeoffPro itself**. We have ground truth: 953 commits across 83 days (2026-03-08 → 2026-05-29) with per-path commit clusters. That makes this a **forensic reconstruction of how TakeoffPro was actually built**, exported as a P6-importable PMXML. A construction PM opens it in P6 and sees real start, real critical path, real variance, real forecast for remaining work.

Locked decisions from earlier in this thread:
- **Strict E2E scoring** for % complete (no credit for "code exists")
- **Hybrid WBS** — product surface top branches, engineering layer sub-WBS
- **Commit-cluster activity splitting** — every path becomes "Build" + "Refine" (+ optional Hardening) activities, not one monolithic blob

---

## Deliverables

### 1. `scripts/extract-build-history.mjs` — git → schedule input

Read-only mining of `git log`. Produces `docs/build-history.json` containing, per WBS leaf:

- First commit, last commit, total commits, list of touched files
- **Commit clusters** detected by an algorithm with tunable thresholds (all surfaced in the JSON for hand-audit):
  - **Build burst** = densest contiguous window holding ≥60% of commits in ≤20% of path lifespan → activity `X.Y.10 Build <feature>`
  - **Refinement tail** = remaining commits after the burst → activity `X.Y.20 Refine <feature>`, FS or SS+lag from build
  - **Hardening clusters** = commits whose messages match `/fix|hardening|round \d|polish|cleanup/i` and that land across multiple WBS leaves on the same day → cross-WBS milestone (`Round N hardening`) with fan-in
  - **Lone late commits** = singletons weeks after the burst → punch-list items, in-progress
- Glob → WBS mapping table (hand-tuned, lives in the script so you can audit/correct before activities are generated)
- Chat-message timestamp enrichment (best-effort) for milestone labels

### 2. `docs/AUDIT_2026Q2.md` — strict reconciliation

Hat-by-hat audit (PM, RE, Inspector, Schedule Analyst, PWA/Native, Backend, Security, Design, QA). One table:

| WBS | Feature claim | Source (marketing / code / both) | Evidence verified | Strict % | Gap |
|---|---|---|---|---|---|

Strict rule: complete only if a seeded user flow (`demo.pm@`, `demo.re@`, `demo.inspector@njta.test`) executes end-to-end against the NJTA I-95 seed today. Code-existing-but-no-UX → in-progress with % proportional to integration gap. Marketing-only → 0%, listed as remaining activity.

Each subagent receives `build-history.json` + the strict rubric and returns its slice. Items that can't be verified automatically are flagged "code-complete, E2E unverified" for your spot-check.

### 3. `src/lib/p6xml/fixtures/takeoffpro-build.def.ts` — typed schedule data

**Hybrid WBS, ~150 activities** (the build/refine split roughly doubles activity count vs the earlier ~90 estimate, which is the right shape for a credible P6 schedule):

```text
TakeoffPro Build  (start 2026-03-08, data date 2026-05-29)
├── 1. Takeoff & Measurement      (1.1 FE / 1.2 BE / 1.3 Offline / 1.4 QA)
├── 2. Schedule & P6              (2.1 FE / 2.2 BE / 2.3 Import-Export / 2.4 QA)
├── 3. Field / Mobile             (3.1 PWA / 3.2 Native / 3.3 Mobile UX / 3.4 QA)
├── 4. RE Workflow & Approvals    (4.1 FE / 4.2 BE+triggers / 4.3 QA)
├── 5. Reporting & Export         (5.1 In-app / 5.2 Daily report / 5.3 P6 PMXML)
├── 6. Admin & Org                (6.1 org flow / 6.2 TeamManager / 6.3 Admin panel)
├── 7. Marketing & Onboarding     (7.1 Landing/Pitch/Demo / 7.2 Tour/Carousel / 7.3 Pricing)
└── 8. Pilot Readiness            milestones M1–M4 (M4 = NJTA pilot kickoff, Mandatory Finish)
```

Per activity (driven by build-history.json + audit row):
- `actual_start` = cluster start (Build) or build-end (Refine)
- `actual_finish` = cluster end when strict E2E verified, else NULL
- `baseline_start/end` = back-projected from typical planned duration → variance becomes the story (foundation overran, integration compressed)
- `duration_days` = cluster span (min 1d)
- `remaining_duration_days` for in-progress = honest forecast forward from today
- `percent_complete` = strict score from #2
- Relationships: real build order. BE → FE → QA within a surface (FS, 0d). Schedule export (2.3) fans in from 2.1 + 2.2. Refine activities SS+lag from their Build. Pilot milestones fan in from everything.
- Calendars: **Lovable 7-day** (continuous deploy) + **Standard 5-day** (NJTA pilot side)
- Resources: Lovable Agent, Human PM, Pilot Inspector, with assignments
- **Baseline captured** at file creation; future rounds measure drift

### 4. `src/lib/p6xml/fixtures/takeoffpro-build.xml` — generated PMXML

Built by running our exporter over #3, committed. **Validated against published P6 v22.12 PMXML XSD** with xmllint in the sandbox. Exporter patches scoped narrowly: only what's needed to make this fixture XSD-valid. Broader exporter gaps become activities in WBS 2.3.

### 5. `src/test/p6xml-build-roundtrip.test.ts`

`def → buildPmxmlFromProject → importFromPmxml` round-trips: WBS hierarchy, all 4 relationship types, lag, calendars, resources, assignments, baseline, constraints all preserved.

### 6. `.lovable/plan.md` — rewrite to thin pointer

"Source of truth is `docs/AUDIT_2026Q2.md` + `takeoffpro-build.xml`. Work is named by activity ID."

---

## Process

1. Run `extract-build-history.mjs` → `build-history.json`. Hand-review glob → WBS mapping and cluster thresholds.
2. Parallel hat subagents read history + strict rubric, return audit slices.
3. Cross-walk against live DB (`information_schema`, RLS, seed contents) so % complete reflects what's actually wired.
4. Synthesize `AUDIT_2026Q2.md`.
5. Translate audit rows into typed activities in `takeoffpro-build.def.ts` (mechanical once #4 exists).
6. Generate `takeoffpro-build.xml`. Validate against PMXML XSD.
7. Patch exporter narrowly until fixture is XSD-valid.
8. Add round-trip test, run vitest, confirm green.
9. Rewrite `.lovable/plan.md`.
10. Stop. You open the XML in P6, see the real picture, pick the next activity by ID.

---

## Technical notes

```text
File-level change set
─────────────────────
scripts/extract-build-history.mjs              NEW  read-only git mining + clustering
docs/build-history.json                        NEW  generated, committed
docs/AUDIT_2026Q2.md                           NEW  reconciliation + ranked roadmap
src/lib/p6xml/fixtures/takeoffpro-build.def.ts NEW  typed schedule data
src/lib/p6xml/fixtures/takeoffpro-build.xml    NEW  generated PMXML (committed)
src/test/p6xml-build-roundtrip.test.ts         NEW  round-trip assertion
src/lib/p6xml/build-from-project.ts            EDIT only what's needed for XSD validity
.lovable/plan.md                               EDIT thin pointer to new source of truth
```

No DB migration. No behaviour changes. No marketing edits. Findings that need code fixes become activities in the schedule, executed in subsequent loops by activity ID.

---

## Caveats
- Glob → WBS mapping is hand-tuned; surfaced in JSON for you to correct before activity generation.
- Cluster thresholds (60% / 20%, hardening regex) are heuristics; tunable in the script and visible in the JSON output.
- Subagents can't click through UI; anything they can't verify via DB queries gets flagged for your spot-check.
- Back-projected baselines model the variance story. If you'd rather derive baselines from chat-stated intent at start-of-work, say so — more work, more honest, default stays back-project.
