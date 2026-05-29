# Plan — file-grounded WBS with goal/artifact reconciliation

## Model in one paragraph

Each file in the repo is a WBS leaf with a real creation date, modification timeline, and author set from git. Each `docs/streams/NN-*.md` gains a `paths:` front-matter block listing the globs that belong to that stream. Joining the two yields the WBS automatically: leaves group by stream, each stream's criteria/risks attach to the leaves their evidence cites, commits become daily reports that post touch-quantity across the leaves they hit, and discrepancies between intent (goals) and artifact (files) become the to-do list. Past work is actuals on file leaves; future work is criterion/risk activities targeting predicted file leaves; CPM runs over real edges only (doc handoffs + TS import graph + risk/file overlap).

## Inputs

- **A. Journey goals** — `docs/streams/01..20-*.md` parsed by existing `build-comprehension.mjs`. 20 streams, 147 criteria, 80 risks, 49 handoff sentences (15 of which already extract cleanly into edges).
- **B. File artifacts** — every tracked file in the repo, with `git log --follow --format=%aI %an` per file → creation date, modification dates, authors, touch count. LOC delta available via `git log --numstat` when needed.
- **Join key** — `paths:` block in each stream doc's front-matter (option 1, chosen). Globs are reviewable per stream, edited where the rest of the stream's intent lives.

## Pipeline

```text
docs/streams/*.md ──┐
                    ├── join by path globs ──► WBS leaves (files grouped by stream)
git log per file ───┘                          │
                                               ├── past activities = file lifetimes
                                               ├── future activities = unmet criteria + risks → predicted leaves
                                               ├── relationships = doc handoffs + TS imports + risk/file overlap
                                               ├── daily reports = commits, allocated across hit leaves
                                               └── audit report = orphan files + forward-only goals
                                               
                                               ▼
                                       PMXML emit ──► app import + Primavera P6
```

## Three reconciliation quadrants (the audit)

| | Files exist | No files |
|---|---|---|
| **Goal exists** | **Delivered/Partial** — past actuals from file history; `% complete` from Implemented-criterion share; remaining = Partial criteria still demanding work | **Missing** — forward activity targeting predicted globs; reconciles when files appear |
| **No goal** | **Orphan** — emits a one-per-cluster audit activity "document or remove" | n/a |

Numbers we expect on first run:
- Delivered/Partial: ~140 criteria covered by ~400-600 file leaves
- Missing: ~10 criteria with no current files
- Orphan: TBD — likely a few clusters (dotfiles, abandoned scripts)

## Activities

Three kinds, each with honest provenance:

1. **Past — file-lifetime activities** (one per non-trivial leaf): `actualStart` = first commit adding the file; `actualFinish` = last commit touching it if untouched for ≥14d, else null with `pctComplete` derived from touch decay; `name` = file path; WBS = `{stream}/{layer}`; `actualUnits` = active-day count.
2. **Future — criterion activities** (one per Partial/Missing/Unknown criterion, ~30 total): name = criterion text; WBS = stream's `Remaining`; duration estimated from comparable past leaves' active-days; predecessors = real handoff/import edges only.
3. **Future — risk activities** (one per risk, ~80 total): name = risk text; severity → duration (high 3d / med 2d / low 1d); risk-to-criterion FS edge added when their file paths intersect.

Plus one **overhead bucket** stream `00-program-management` to hold leaves that match no stream's `paths:` (`.lovable/plan.md`, lockfiles, top-level configs). These get file-lifetime activities too, just rolled up under planning/build-infra parents — not silently homeless.

## Daily reports (commits as resource consumption, not progress)

For each commit, write one entry per file it touched: `{ sha, date, author, leaf_path, loc_added, loc_removed }`. Aggregations the rest of the system reads:

- per-leaf: `active_days`, `touch_count`, `loc_total`, `contributors[]` → drives `actualUnits` and duration estimates
- per-stream-per-day: `author_days_consumed` → reads as the daily-report cost ledger
- per-author-per-day: one author-day, fanned out across leaves by LOC share

No commit is force-pinned to a single leaf; cost is distributed proportionally, and the `unallocated` slice (lockfile-only commits, etc.) rolls to overhead.

## Relationships (real edges only)

Three sources, all empirical:

1. **Doc handoffs** — 15 edges already in `comprehension.json.handoff_edges`, verbatim.
2. **TS import graph** — derived once from `tsc --traceResolution`-equivalent or a lightweight AST pass: if file A imports file B and they live in different streams, emit a cross-stream FS edge between their stream parents (deduplicated). Within a stream, only emit edges where the prose explicitly chains criteria.
3. **Risk → criterion** — FS edge when risk text and a Partial criterion's evidence cite the same file path.

Throw out: `shared-leaf-time`, all `narrative-*` sources. Expected total: 30-60 real edges (vs. 474 today).

## Stream front-matter format

Each `docs/streams/NN-*.md` gains:

```yaml
---
stream_key: 04-pay-item-catalog
paths:
  - src/components/ProjectSidebar.tsx
  - src/components/MobilePayItems.tsx
  - src/hooks/usePayItemActivityMap.ts
  - src/lib/pdf-utils.ts  # also touched by 03 — primary owner here
  - supabase/migrations/*pay_items*
  - src/test/*pay-items*
shared_paths:  # touched by this stream but owned elsewhere
  - src/hooks/useProject.ts  # owned by 05
---
```

The `paths:` rule: a file is primarily owned by exactly one stream (where its activities roll up). `shared_paths:` lets a stream claim partial coverage of a foreign-owned leaf for `% complete` calculations without double-counting.

## Pipeline scripts

- `scripts/wbs/build-spine.mjs` — rewritten: WBS leaves = files-by-stream from front-matter joins, not the old leaf-catalog scoring system. Overhead bucket for unmapped.
- `scripts/wbs/build-comprehension.mjs` — extended: parse the new `paths:`/`shared_paths:` front-matter; risks parser already exists.
- `scripts/wbs/build-file-history.mjs` — **new**: one `git log` pass per leaf, emits `.lovable/wbs/file-history.json` (leaf → events[]).
- `scripts/wbs/build-import-graph.mjs` — **new**: AST pass over `src/**/*.{ts,tsx}` emitting cross-stream FS edges.
- `scripts/wbs/build-activities.mjs` — rewritten per "three kinds" above.
- `scripts/wbs/build-relationships.mjs` — rewritten: three real sources only.
- `scripts/wbs/build-daily-reports.mjs` — **new**: commit → leaf-allocation ledger.
- `scripts/wbs/build-audit.mjs` — **new**: emits `.lovable/wbs/audit.md` with the three quadrants — orphan clusters, forward-only goals, partial-coverage warnings.
- `scripts/wbs/emit-p6-xml.mjs` — unchanged interface; gets cleaner inputs.
- `scripts/wbs/roundtrip-p6.ts` — unchanged.

Deleted: `scripts/wbs/build-narrative-arcs.mjs`, `scripts/wbs/build-state.mjs` / `build-next.mjs` if they have no other consumer, `scripts/build-dev-wbs.mjs` (older parallel pipeline).

## Verification

1. **Audit report** before any P6 round-trip. The quadrant counts should match common sense — if any stream shows 0 file coverage, its front-matter globs are wrong.
2. **App import** via `roundtrip-p6.ts` → open `/schedule`. Expect ~500 file-leaf actuals + ~110 forward activities + ~40 edges. Critical path should be a real Missing/Partial chain, not synthetic verifies.
3. **Primavera P6** opens the same XML. WBS branches = 21 (20 streams + overhead). Activity counts per branch match the file-coverage report. ActivityCodes filter by stream / kind / severity.

## What this plan does not do

- Doesn't add tables. Schedule tables already accept activities + relationships + actuals.
- Doesn't add UI. Existing Schedule workspace renders the cleaner data.
- Doesn't touch the takeoff side (PDF, calibration, geometry, GPS).
- Doesn't auto-watch commits — the pipeline is run on demand.

## Decisions still open (do not block writing the scripts)

- **D1.** Cost unit for the daily-report ledger: active-day-share (recommended), LOC, or commit count.
- **D2.** Whether to include `docs/`, `public/`, and root configs as their own stream parents under overhead, or fold them all into one bucket.
- **D3.** Treatment of files deleted before today: surface as actuals with `actualFinish` = deletion date and `pctComplete = 100`, or hide them. Default: surface — they're real consumption.