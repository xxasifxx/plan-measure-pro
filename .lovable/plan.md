# Baseline Project Schedule for WBS

Generate a schedule branch off the existing capability tree, grounded in real git history (not invented dates), and surface it as a sibling view in `/wbs`.

## What "schedule" means here

For every capability (187 across 21 streams) we compute:

- **Actual start** = earliest `created_at` across its `files` (from `file-history.json`)
- **Actual last touch** = latest `last_modified_at` across its `files`
- **Work done so far** = sum of `touch_count` and `loc_added` across files (depth signal, not just date)
- **Remaining estimate** = derived from `verdict`:
  - `implemented` → 0d (only verify-e2e left, pulled from activity tier)
  - `partial` → 2d default
  - `planned` / placeholder → 5d default (overridable per capability in a config file)
- **Forecast finish** = `T0 + cumulative remaining on critical path`, where `T0 = today (2026-05-30)`

Stream rows roll up: `stream.actual_start = min(cap.actual_start)`, `stream.forecast_finish = T0 + sum(remaining)` (sequential within-stream; cross-stream parallelism left as-is, matching how the team actually works).

## Milestones

Hand-curated in a new `.lovable/wbs/schedule-config.json` so dates stay placeholders the PM can edit, not hallucinations:

| ID | Name | Gate condition |
|----|------|----------------|
| M0 | Baseline schedule locked | `DLV-baseline-schedule-lock` verdict flips to `implemented` |
| M1 | Foundation verified | Streams 01, 02, 03 all capabilities ≥ `partial` |
| M2 | Field capture pilot-ready | Streams 04, 05, 06, 14 all criterion-capabilities `implemented` |
| M3 | Audit/compliance gate | Streams 12, 18 placeholders cleared |
| M4 | MVP feature-complete | 100% of `criterion` capabilities `implemented` |
| M5 | GA — all verified | 100% of leaves have passing `verify-e2e` |
| M6 | Sales-ready | Stream 20 deliverables `implemented` |

Each milestone gets a `target_date` placeholder (`null` until PM sets it) and a computed `forecast_date` from the roll-up.

## Files

**New**
- `scripts/wbs/build-schedule.mjs` — reads `capabilities.json` + `file-history.json` + `schedule-config.json`, writes `.lovable/wbs/schedule.json`
- `.lovable/wbs/schedule-config.json` — hand-curated: milestone definitions, default durations by verdict, per-capability overrides (starts empty)
- `.lovable/wbs/schedule.json` — generated: streams[] with caps[], milestones[], program totals
- `public/wbs/schedule.json` — slimmed copy for the UI

**Edited**
- `scripts/wbs/build-all.mjs` — invoke `build-schedule` after `build-state`
- `scripts/wbs/publish-public.mjs` — include `schedule.json` in published bundle
- `src/pages/Wbs.tsx` — add a top-level tab toggle "Files | Schedule"; Schedule view renders the milestone table + per-stream rows showing `[actual_start → last_touch | ░░░ remaining → forecast_finish]` strips with verdict-coloured cap segments; collapsible to cap list with touches/LOC/verdict

No backend, no schema, no route changes — `/wbs` keeps its existing route and adds an in-page tab.

## Honesty rules baked in

- Capabilities with `files: []` AND `needs_files: []` show as `actual_start: null` (no fake dates).
- A capability whose files were all created today (2026-05-30) but whose verdict is `implemented` gets flagged `suspicious_recency` in the UI — prevents the schedule from claiming a stream "finished" in one day just because WBS scaffolding landed.
- Schedule never overwrites verdicts; it only reads them.

## Open question

Default remaining-days for `partial`/`planned` capabilities — keep at 2d/5d as defensible placeholders the PM tunes per cap in `schedule-config.json`, or do you want me to scale by `needs_files.length` and risk severity instead? I'll default to flat 2d/5d unless you say otherwise.
