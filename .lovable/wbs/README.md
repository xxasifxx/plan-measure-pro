# .lovable/wbs — Project-as-Schedule

Generated: 2026-05-29T18:56:06.153Z
Source: `scripts/mine-wbs-actuals.mjs`

## What this is

The dev history of this project, reshaped into a Work Breakdown Structure with
**activities, durations, resource loading, concurrency, predecessor logic, and
status classification** — the same kind of analysis the app itself is supposed
to do for construction schedules. Eats its own dogfood.

This describes **what was actually worked on, when**, derived from git +
the L4 audit. It does **not** prescribe fixes, build a charter, or change any
app code.

## Files

- **`wbs.json`** — hierarchy: era → stream → tag → (rolled-up activity stats).
- **`activities.json`** — flat list of all 156 activities with
  full detail (commits, files, LOC, resource loading, dormancy, concurrency,
  predecessors, status, implied successors).
- **`next.json`** — the derived "what needs to happen" view. Activities whose
  status is dormant, blocked, paused, or needs_successor, sorted by downstream
  impact and lie-tax exposure.

## Derivation rules

- **Activity** = (primary path-tag, era) bucket, split on commit-gaps > 14 days.
- **Era** = window between detected pivots (`L3/pivots.json`).
- **Stream attribution** = dominant value-stream among the activity's touched
  files (joined via `docs/wbs-dev.leaves.json` fileGlobs).
- **Predecessor inference** (per activity pair, A→B):
  - `file_overlap` (high/med) — A finishes before B and they share ≥3 files
  - `message_ref` (med) — B's commit subjects reference A's tag tokens, same stream
  - `temporal` (low) — same stream and A ends ≤10 days before B starts
  - Top 8 retained per activity.
- **Status classification** (rule table, not vibes):
  | Status | Rule |
  |--------|------|
  | `in_progress` | last commit ≤14d ago |
  | `quiet` | last commit ≤~14d, no WIP marker |
  | `paused` | 14–60d idle AND last subject contains wip/todo/part-N/draft/stub |
  | `dormant` | ≥60d idle AND has partial/missing leaves or lie-tax exposure |
  | `blocked` | predecessor is itself dormant/abandoned/paused |
  | `abandoned` | tag in blast-radius of a capability-removal pivot, no later commits |
  | `shipped` | idle but all associated leaves implemented, no open successors |
  | `needs_successor` | shipped but has implied successors no one picked up |
  | `orphaned` | code with no stream attribution |
- **Implied successors** sourced (with citations) from:
  - leaves with `verdict: partial` or `missing` attached to the activity's files
  - lie-tax rows (`L4/lie-tax.md`) whose source file is in the activity
  - value streams (`docs/streams/*`) with zero implemented leaves

## Known limitations

- Activity clustering uses path-tag bucketing. Refactors that move code across
  tags will produce two activities instead of one. Spot-check before trusting
  any single activity boundary.
- Predecessor edges are heuristic. Only `file_overlap` (sharedFiles ≥6) is
  high confidence; `message_ref` and `temporal` are advisory.
- Work done in chat/plans/designs that never landed in git does not show up
  as an activity. It only appears as an implied successor (via mem notes,
  stream docs, lie-tax).
- File renames may break the join from activity → leaf → stream, surfacing
  some activities as `orphaned` when they're actually attributed elsewhere.
- Pivot blast-radius matching is keyword-based and may over- or under-flag
  `abandoned` status on adjacent tags.

## Totals at generation time

- Activities: 156
- Status breakdown: {"orphaned":3,"shipped":24,"abandoned":59,"dormant":21,"quiet":13,"in_progress":35,"blocked":1}
- Eras: 7
- Streams represented: 21
- "Next" queue: 22 items

## Regenerating

```bash
node scripts/mine-wbs-actuals.mjs
```

Inputs:
- `docs/build-history.json` (per-commit file detail)
- `docs/wbs-dev.leaves.json` (intent leaves with stream + verdict)
- `docs/wbs-dev.agent-runs/L3/pivots.json` (eras)
- `docs/wbs-dev.agent-runs/L4/lie-tax.md` (marketing-vs-reality exposure)
