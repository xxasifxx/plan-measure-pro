# TakeoffPro Build — Dev WBS

This is the schedule of **building TakeoffPro**, not the schedule of work *inside* a customer project. It exists so the team can self-manage: see what is honestly done, what is half-done, what we promised in marketing but never shipped, and what is left.

## Files

| File | Role |
|---|---|
| `docs/wbs-dev.leaves.json` | **Canonical leaf catalog** — brief + code reconciled, with provenance per leaf. |
| `docs/wbs-dev.leaves.md` | Human-readable leaf tree. |
| `docs/wbs-dev.code-leaves.json` | Intermediate — pure code-derived leaves (file-clusters, tables, migration weeks, edge fns). |
| `docs/wbs-dev.catalog-gaps.md` | Where the catalog is dishonest: code-only leaves (brief silent), brief-only leaves (stale), unclaimed files. |
| `docs/wbs-dev.activities.json` | Canonical activity list — strict scoring applied. |
| `docs/wbs-dev.promises.json` | Marketing claims extracted from landing/pitch/llms with seeded stream mapping. **Reviewer-edited**. |
| `docs/wbs-dev.verification.manifest.json` | Per-activity e2e verification recipes. **Reviewer-edited.** |
| `docs/wbs-dev.verification.md` | Auto-generated report of verification status by bucket. |
| `public/exports/takeoffpro-dev.xml` | PMXML fixture — round-trips through `/p6-xml`. |
| `src/test/dev-pmxml.test.ts` | Round-trip + status-distribution assertions. |

## Catalog provenance

Leaves are derived from two converging passes and reconciled by file-path overlap:

1. **Brief pass** (`build-leaves.mjs`) — one leaf per "Surfaces (files)" entry plus one per "Current state vs criteria" bullet that didn't merge into a surface.
2. **Code pass** (`build-code-leaves.mjs`) — walks `src/**`, `supabase/**`, `scripts/**`, root configs, plus `public.*` tables (from `src/integrations/supabase/types.ts`) and weekly migration clusters.
3. **Reconcile** (`reconcile-leaves.mjs`) — file overlap merges the two; provenance is recorded as `brief+code`, `brief-only`, or `code-only`. New streams `97 Plumbing`, `98 Build & Infra`, `99 Cross-cutting` (shadcn) catch what no brief claims.

`catalog-gaps.md` is the honest accounting: every `code-only` leaf is work that happened with no brief acceptance criterion, every `brief-only` leaf points at a file the resolver couldn't find (probably renamed or deleted).

## WBS shape

```text
TakeoffPro Build
├── 01 Identity & Access
│   ├── Frontend     (UI components, routes, hooks)
│   ├── Backend      (migrations, RLS, edge functions)
│   ├── Mobile       (native/PWA-specific)
│   ├── Verification (e2e seed-data tests)
│   └── Remaining    (risks/debt from the brief)
├── 02 Portfolio & PM Home   (same 5-leaf sub-WBS)
├── ... (streams 03–20)
├── 21 Marketing Debt        (cross-stream claims awaiting delivery)
└── 99 Cross-cutting         (XER scrap, PMXML pivot, comprehension pass,
                              this WBS effort itself)
```

The engineering-layer leaf is chosen by the evidence path of each brief bullet (`supabase/` → Backend, `native/` → Mobile, etc.).

## Strict scoring rule

> An activity is **Completed** only when its end-to-end flow is verified against seeded data.

| `code_present` | `verified_e2e` | Status |
|---|---|---|
| false | false | Not Started |
| true | false | **In Progress (50%, partials get 30%)** |
| true | true | Completed (100%) |

At first run the schedule shows **~1% Completed** because almost no activity has a verification recipe filled. That is the truthful baseline — `wbs-v2.json`'s 86% figure was code-presence, not flow-presence. As you fill recipes in `wbs-dev.verification.manifest.json` the number rises.

## Marketing-as-remaining-work

`scripts/extract-marketing-promises.mjs` scans the landing page, two pitch decks, and `llms.txt` for feature-claim sentences. Each claim is seeded with a guessed stream mapping. Reviewer flips `verdict` to `delivered`, `partial`, or `undelivered`. Each undelivered claim becomes a Not Started activity under **branch 21 — Marketing Debt**, with `marketingClaimAgeDays` derived from the file's first commit date. This is the lie-tax made visible.

Unmapped claims stay under `21-marketing-debt/Unmapped` until reviewed.

## Refresh pipeline

```bash
node scripts/extract-marketing-promises.mjs   # writes docs/wbs-dev.promises.json
node scripts/verify-e2e.mjs                   # ensures verification manifest exists
node scripts/build-dev-wbs.mjs                # writes docs/wbs-dev.activities.json + verification.md
node scripts/build-dev-pmxml.mjs              # writes public/exports/takeoffpro-dev.xml
npx vitest run dev-pmxml                      # round-trip assertions
```

The pipeline is idempotent. Edit a brief, re-run, the fixture updates. Fill a verification recipe, re-run, the status flips.

## Two review checkpoints

1. **Marketing mapping** — open `docs/wbs-dev.promises.json` and fix `stream` + `verdict` for each claim. The keyword seed is wrong-by-default for ambiguous phrasing.
2. **Verification flips** — open `docs/wbs-dev.verification.manifest.json`; for each activity you have actually tested with seeded data, set `verifiedE2E: true`. Anything else stays In Progress.

## PMXML scope (honest)

`scripts/build-dev-pmxml.mjs` emits only what `src/lib/p6xml/parser.ts` actually reads: Project meta + Activities with status/dates/durations + `<Notes>` carrying stream + verification metadata. WBS hierarchy nodes, relationships, calendars, resources, and baselines are **not** emitted — our parser does not consume them, so adding them would be ornament rather than self-proof. When the parser grows, the emitter grows; the test fails the moment they diverge.

## Out of scope

- Executing any backlog item as code from inside this artefact.
- Cost loading / earned value.
- Re-scoring `wbs-v2.json` — kept as the lenient code-presence baseline for contrast.
