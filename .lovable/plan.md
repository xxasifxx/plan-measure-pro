## Goal

Stop conflating WBS with activities. Build the WBS first as a stable backbone, then derive activities — past from git, future from known gaps — and attach them to leaves. One commit can progress several activities; the mapper must respect that.

## Phase 1 — Build the comprehensive WBS (300–500 leaves)

**Shape:** `Stream (20) / Layer (Frontend|Backend|Mobile|Verification|Docs) / Feature`

**Feature leaves** are not invented freely; they're derived from three converging sources, then deduped:

1. **Brief criteria** — every bullet in each stream's "Current state vs criteria" and "Acceptance criteria" becomes a candidate leaf.
2. **File-surface clusters** — `docs/file-surface-a.json` already groups files; each cluster within a stream becomes a candidate leaf (e.g. `05/Frontend/PdfCanvas`, `05/Frontend/Toolbar`, `05/Backend/annotations-schema`).
3. **Surface inventory** — `docs/scope-inventory/*.md` items not already covered become leaves (catches pages, hooks, edge functions that no brief bullet names).

Dedupe by normalized name within a `Stream/Layer` bucket. Output:

- `docs/wbs-dev.leaves.json` — canonical leaf list with `{ id, wbs, stream, layer, name, sources: [...], fileGlobs: [...] }`.
- `docs/wbs-dev.leaves.md` — human-readable tree, grouped by stream → layer.

This is the artifact the user reviews before any activity work. **Hard checkpoint.**

## Phase 2 — Smart commit → activity mapping

A commit touches N files. Each file maps to ≤1 leaf via `fileGlobs`. So one commit can credit M leaves (M = unique leaves touched).

**Per-commit, per-leaf "contribution":**
```text
contribution = {
  commitSha, authorDate, leafId,
  filesTouched, linesChanged,
  weight = linesChanged_on_leaf / linesChanged_total_in_commit
}
```

**Session clustering per leaf:** group that leaf's contributions into sessions when consecutive contributions are within a 24h gap. A session becomes one historical activity:
```text
activity = {
  id, leafId, kind: 'historical',
  start = first session commit date,
  finish = last session commit date,
  duration = max(0.5d, finish - start),
  commits: [shas...],
  weight = sum of contribution weights  // signals how much of the leaf's mass this session moved
}
```

This handles "smarter mapping" the user called out: a single commit refactoring `Toolbar.tsx` + `PdfCanvas.tsx` + a migration creates three contributions, one per leaf, with proportional weights — so it progresses three activities, not one.

**% complete per leaf** = clamp(Σ session weights, 0, 1) × (1 if e2e-verified, else 0.5). Forward activities then carry the remainder.

## Phase 3 — Forward activities

Per leaf, generate "remaining" activities from three sources, each tagged:

- **`risk`** — every "Risks / debt" item in the stream brief that file-matches the leaf (or stream-only if no file hint).
- **`marketing-debt`** — every `docs/wbs-dev.promises.json` claim mapped to the leaf's stream with verdict ≠ delivered.
- **`verification-gap`** — synthetic activity emitted whenever leaf has historical work but `verifiedE2E=false` in the manifest. Name: `Verify e2e: <leaf>`.

Durations: 0.5d (verification), 1–5d (risk via existing heuristic), 3–5d (marketing-debt undelivered).

## Phase 4 — Cross-cutting & narrative branch

Keep the existing `99 Cross-cutting` hand-authored activities (XER scrap, PMXML pivot, this WBS effort) as-is.

## Phase 5 — Regenerate PMXML & docs

- `scripts/build-dev-wbs.mjs` becomes a 3-step pipeline: `build-leaves → map-commits → emit-activities`.
- `scripts/build-dev-pmxml.mjs` consumes the new activity list unchanged.
- `docs/wbs-dev.md` rewritten to explain the two-phase model and how to read weights.

## Deliverables

| File | Purpose |
|---|---|
| `scripts/dev-wbs/build-leaves.mjs` | Phase 1: dedupe leaves from briefs + file-surface + inventory |
| `scripts/dev-wbs/map-commits.mjs` | Phase 2: per-file commit attribution + session clustering |
| `scripts/dev-wbs/forward-activities.mjs` | Phase 3: risks + marketing + verification-gap activities |
| `scripts/build-dev-wbs.mjs` | Orchestrator (rewritten) |
| `docs/wbs-dev.leaves.json` | Canonical leaf backbone (Phase 1 output) |
| `docs/wbs-dev.leaves.md` | Reviewable tree |
| `docs/wbs-dev.activities.json` | Rewritten with new schema (historical sessions + forward) |
| `public/exports/takeoffpro-dev.xml` | Regenerated from new activities |
| `docs/wbs-dev.md` | Rewritten narrative |
| `src/test/dev-pmxml.test.ts` | Updated to new schema |

## Checkpoints

1. **After Phase 1**: review `docs/wbs-dev.leaves.md`. Add/merge/rename leaves before activities are touched.
2. **After Phase 2**: spot-check 5 random leaves' sessions against `git log` to confirm weights look right.
3. **After Phase 3**: review forward activity counts per stream; trim noise.

## Notes for the technical reader

- `fileGlobs` per leaf are seeded from brief evidence paths + file-surface cluster membership. Unmatched files in a stream get bucketed to a `Stream/Layer/_unattributed` leaf so nothing is dropped.
- Commit attribution uses `git log --numstat --follow` per file; cached to `.cache/git-numstat.json` so reruns are fast.
- Session gap (24h) and minimum session duration (0.5d) are constants at the top of `map-commits.mjs` for tuning.
- A commit credited to >5 leaves is flagged in the report — likely a sprawling refactor worth a manual review.
