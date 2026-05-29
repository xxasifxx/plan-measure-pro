# TakeoffPro Development WBS → PMXML Fixture (v3)

Anchored to your six decisions: 20 streams at Level 2 with engineering-layer sub-WBS at Level 3, **strict end-to-end-with-seed-data completion rule**, **marketing claims surface as remaining work**, **git-derived dates for completed activities**, **PMXML self-proof for our own importer**, **self-management** as the optimization target.

## Deliverables

1. `docs/wbs-dev.activities.json` — canonical activity list with strict scoring.
2. `docs/wbs-dev.promises.json` — extracted marketing claims with code-evidence verdict (Delivered / Partial / Undelivered).
3. `docs/wbs-dev.verification.md` — per-activity e2e verification recipe (what URL, what seed, what to observe). This is the document that justifies any "Completed" status.
4. `scripts/extract-marketing-promises.mjs` — parses `src/pages/Landing.tsx`, `McfaPitch.tsx`, `FajarPitch.tsx`, `public/llms.txt`, README hero copy into claim records.
5. `scripts/verify-e2e.mjs` — best-effort scripted check per activity (route reachable, seed data renders, mutation persists). Activities without an automatable check are flagged `unverified` and default to **Not Started** under the strict rule.
6. `scripts/build-dev-wbs.mjs` — assembles JSON from briefs + git log + promises + verification.
7. `scripts/build-dev-pmxml.mjs` — emits PMXML covering the feature matrix of `src/lib/p6xml/parser.ts`.
8. `public/exports/takeoffpro-dev.xml` — the fixture; round-trips through `/p6-xml`.
9. `src/test/dev-pmxml.test.ts` — round-trip + feature-matrix coverage assertions.
10. `docs/wbs-dev.md` — narrative: structure, scoring methodology, marketing-debt reading, how to refresh.

## WBS structure (hybrid restored)

```text
TakeoffPro Build
├── 01 Identity & Access
│   ├── Frontend     (UI components, routes, hooks)
│   ├── Backend      (migrations, RLS, edge functions)
│   ├── Mobile       (native/PWA-specific work)
│   ├── Verification (e2e seed-data tests)
│   └── Docs         (briefs, runbooks)
├── 02 Portfolio & PM Home  (same 5-leaf sub-WBS)
├── ... (streams 03–20)
├── 21 Marketing Debt        (cross-stream: claims without delivery)
└── 99 Cross-cutting         (audit log, role-RLS, notifications trigger,
                              XER scrap, PMXML pivot, comprehension pass,
                              this WBS effort itself)
```

Engineering-layer sub-WBS keeps the brief's bullets sortable: a "partial" bullet about RLS lands under Backend, a "missing" touch-target bullet under Mobile.

## Scoring methodology (strict rule applied)

Every activity carries three fields:

| Field | Source | Default if absent |
|---|---|---|
| `code_present` | Brief bullet says "implemented" / files exist | false |
| `verified_e2e` | `scripts/verify-e2e.mjs` returns pass with seed data | false |
| `status` | derived | see table below |

```text
code_present  verified_e2e   status
false         false          Not Started
true          false          In Progress (50%)   ← was 100% before
true          true           Completed (100%)
false         true           (impossible)
```

Result: the 86% completion headline from `wbs-v2.json` will collapse — expect a real number in the 40–60% range once the verifier runs. That's the point. `wbs-v2.json` is kept as-is for code-only baseline comparison; `wbs-dev.activities.json` is the truthful version.

Activities that can't be automatically verified (visual polish, native-only flows) are marked `unverified=manual` and require a one-line manual check in `verification.md` before they can move to Completed.

## Marketing-as-remaining-work

`extract-marketing-promises.mjs` scans the three pitch pages + landing + llms.txt and extracts claim sentences (regex on bullet lists + headline patterns, hand-curated tail). For each claim:

- Map to the most relevant stream branch (manual mapping table seeded by Lovable, reviewed by you).
- Cross-check against code evidence:
  - **Delivered + verified** → no activity created (already covered).
  - **Delivered but unverified** → `In Progress` activity "Verify e2e: \<claim\>".
  - **Partial** → `In Progress` activity "Finish delivery: \<claim\>".
  - **Undelivered** → `Not Started` activity "Deliver: \<claim\> (marketing claim since \<earliest-git-date-of-claim\>)".

Branch `21 Marketing Debt` rolls up every Undelivered claim with critical path stretching through it — this is the lie tax made visible on the Gantt.

## Dates

- **Completed activities**: `git log --diff-filter=A --follow --format=%aI -- <evidence>` for first commit; `git log -1 --format=%aI` for last. Capped at 30d duration to prevent long-lived files from skewing the Gantt.
- **Marketing claim age**: git history of the pitch file the claim appears in — establishes how long the promise has been outstanding.
- **Remaining activities**: hand-set in JSON (migration=1d, RLS=1d, edge-function=2d, UI refactor=3d, feature=5d, e2e verification=0.5d each). You review and override before PMXML emit.
- **Sub-WBS pivots as activities** (under `99 Cross-cutting`, hand-authored):
  - `XER ingest engine (scrapped)` — first → last commit on `src/lib/xer/**` before deletion.
  - `PMXML pivot` — first commit on `src/lib/p6xml/**` → today.
  - `20-stream comprehension pass` — dated today.
  - `Dev WBS authoring (this effort)` — recursive, dated today.

## PMXML feature-matrix coverage

The fixture must exercise everything `src/lib/p6xml/parser.ts` claims to support; the round-trip test asserts each. Concretely:

| Feature | How fixture covers it |
|---|---|
| Calendar | One 5-day calendar, one 24/7 calendar (cross-cutting branch) |
| WBS hierarchy | 3 levels (root → stream → engineering layer) |
| Activity types | Task, Milestone, LOE |
| Relationships | FS, SS, FF + non-zero lag on at least one |
| Resources | Single "Lovable+you" resource assigned to all activities (truthful) |
| Baselines | One baseline = snapshot at "Today" milestone |
| Notebook topics | One per stream branch carrying the brief's narrative |
| User-defined fields | `code_present`, `verified_e2e`, `marketing_claim_age_days` |

This is what makes the fixture a self-proof: importing `takeoffpro-dev.xml` into our own `/p6-xml` page must reproduce every field, and the test fails if our parser drops any.

## Refresh model

```text
node scripts/extract-marketing-promises.mjs
node scripts/verify-e2e.mjs          # writes verification.md
node scripts/build-dev-wbs.mjs       # consumes briefs + git + promises + verification
node scripts/build-dev-pmxml.mjs     # emits public/exports/takeoffpro-dev.xml
npx vitest run dev-pmxml             # round-trip + feature-matrix assertions
```

Every brief edit, every shipped fix, every new pitch-page claim re-flows into the fixture.

## Two checkpoints I'll pause for

1. **After `extract-marketing-promises.mjs` first run** — show you the claim-to-stream mapping table for review (this is judgement-heavy and wrong-by-default).
2. **After `verify-e2e.mjs` first run** — show you the activities that flipped from Completed to In Progress under the strict rule, so you can confirm or override individual cases before they hit the PMXML.

## Out of scope

- Implementing any backlog item as code (they appear in the schedule as work to do, not work being done).
- Cost loading / earned value.
- Re-scoring `wbs-v2.json` (kept as the lenient baseline for contrast).
- Customer-project pricing model — separate doc.
