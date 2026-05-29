## What we're rebuilding

A single JSON dataset where the **canonical 417-leaf WBS** is the spine, and **many activities (past, in-flight, dormant, and future)** hang off each leaf — with relationships, state, and concurrency that reflect how the project actually moved. P6 XML is deferred; this plan stops at JSON.

## What's wrong with the current `.lovable/wbs/*`

- WBS hierarchy is derived from commit paths (Era→Stream→Tag) instead of the canonical leaves in `docs/wbs-dev.leaves.json` (417 leaves) augmented by `docs/wbs-proposals.reconciled.json` (orphan capabilities — the brass tacks).
- Activities are 1:1 with commit clusters. Every commit lives in exactly one bucket. That violates both directions you stated: one leaf needs many activities, and one commit can advance several activities.
- No future-facing activities. The schedule only looks backward.
- State vocabulary collapsed to a flat status field on the activity; no representation of "awaiting-successor", "paused-pending-decision", "blocked-on-external", "dormant-but-needed".
- No real predecessor inference beyond file-overlap heuristics; the marketing-debt / verification-gap / risk channels you specified in #609 are entirely absent.

## Target shape (JSON only, no XML)

```
.lovable/wbs/
  wbs.json          # 417+ leaves: the canonical taxonomy (the spine)
  activities.json   # MANY activities per leaf, past + present + future
  links.json        # commit ↔ activity (M:N), activity ↔ leaf (M:1 primary, M:N contributing)
  relationships.json# activity → activity (FS/SS/FF, lag, confidence, source)
  state.json        # per-activity state vector (not a single enum)
  next.json         # derived: what's ready to start, what's blocked, what's at risk
  README.md
```

### wbs.json — the spine (no commit data)

Source of truth: `docs/wbs-dev.leaves.json` (417) ∪ `docs/wbs-proposals.reconciled.json.builtClusters` ∪ `.orphanCapabilities` (the brass tacks the catalog never named, discovered from code reality). Deduped by normalized name within stream.

```json
{
  "id": "01-identity-and-access/Frontend/Auth",
  "stream": "01 Identity & Access",
  "layer": "Frontend",
  "name": "Auth",
  "origin": "brief" | "code-surface" | "orphan-capability" | "marketing-debt" | "verification-gap",
  "fileGlobs": ["src/pages/Auth.tsx"],
  "criteria": [ {id, text, verdict} ],
  "parent": "01-identity-and-access/Frontend"
}
```

### activities.json — many per leaf, past + future

Each activity has a `primary_leaf` and an optional `contributing_leaves[]` (so a refactor that touches Auth + RBAC + Onboarding is one activity contributing to three leaves, not three duplicate activities).

```json
{
  "id": "ACT-0001",
  "name": "Wire Supabase magic-link auth to Auth.tsx",
  "primary_leaf": "01-identity-and-access/Frontend/Auth",
  "contributing_leaves": ["01-identity-and-access/Backend/Session"],
  "origin": "git" | "future-risk" | "future-marketing-debt" | "future-verification-gap" | "future-promise",
  "time_window": { "first": "...", "last": "...", "active_days": N, "calendar_days": M, "gaps": [...] },
  "effort": { "commit_count": N, "loc_added": N, "loc_removed": N, "files_touched": [...] },
  "predecessors": ["ACT-xxxx"],
  "successors": ["ACT-xxxx"],
  "concurrent_with": ["ACT-xxxx"],
  "evidence": { "commit_shas": [...], "marketing_claim": "...", "risk_id": "...", "verification_gap_id": "..." }
}
```

Future activities have no `time_window`/`effort` and instead carry `planned_after`, `planned_size_hint`, and `gating_predecessors`.

### links.json — the M:N tables

Two tables, kept separate from activities so commit→activity attribution can be re-derived without rewriting activities:

```
commit_activity:  [{ sha, activity_id, contribution: "primary"|"secondary", weight: 0..1, signal: "path"|"token"|"co-edit"|"intent-extract" }]
activity_leaf:    [{ activity_id, leaf_id, role: "primary"|"contributing" }]
```

This is what lets one commit advance multiple activities. Weight is for resource-loading math later.

### relationships.json — typed dependencies

```
{ pred, succ, type: "FS"|"SS"|"FF", lag_days, confidence: 0..1,
  source: "file-overlap" | "commit-token" | "temporal" | "leaf-criterion" | "intent-extract" | "manual" }
```

Sourced from: shared-file evidence, commit message tokens ("after X", "depends on Y", "now that Z"), L4 intent-extract output (`docs/wbs-dev.agent-runs/L4/intent-leaves.json.cross_stream_links`), and criterion ordering inside leaves.

### state.json — state vector, not a single enum

Per activity:
```
{ activity_id,
  lifecycle: "planned"|"in-flight"|"paused"|"dormant"|"shipped"|"abandoned",
  blocking: { kind: "successor-missing"|"external"|"decision"|"none", note },
  health: { dormancy_days, marketing_debt_count, verification_gap_count },
  visibility: "quiet"|"normal"|"loud",
  last_signal_ts }
```

A "dormant-but-needed" activity is `lifecycle=dormant` + `blocking.kind=none` + `marketing_debt_count>0`. A "paused-pending-decision" is `lifecycle=paused` + `blocking.kind=decision`. Etc. — the combinations express the vocabulary; we don't pre-collapse them.

## How activities get built (the smarter mapping)

Three independent passes, then merge:

1. **Pass A — commit clustering with multi-attribution.** For each commit, compute its file set. Score each candidate activity (existing or new) by Jaccard overlap with that activity's file set and by message-token similarity. If top-1 score > 0.6 → primary contribution. If top-2 score > 0.35 → secondary contribution. New activity created when no candidate scores > 0.35 *and* the commit's file set is coherent (single stream/layer). Output: `commit_activity` rows.

2. **Pass B — leaf-driven activity synthesis.** For every leaf in `wbs.json`, ensure ≥1 activity exists per `criterion`. If commits already exist that touch the leaf's `fileGlobs`, attach them. If a criterion exists with verdict ≠ "implemented" and no commit evidence, mint a **future** activity (`origin: future-verification-gap`).

3. **Pass C — debt-driven future activities.** Mint future activities from:
   - marketing claims with no implementing leaf (from `docs/lie-tax.*` if present, else `Landing.tsx` + `llms.txt` + `STORE_LISTING.md` scan)
   - risks in `docs/streams/*` not yet on a leaf
   - verification-gap rows in `docs/wbs-dev.verification.manifest.json`
   Each future activity declares `gating_predecessors` against existing activity ids.

Merge: if Pass A and Pass B produce activities on the same leaf with ≥80% commit-sha overlap → merge. Otherwise keep distinct (a leaf often has a "build" activity and a "harden/verify" activity that are genuinely different work).

## Smarter predecessor inference (replaces current file-overlap-only)

Four signals, weighted, must reach `confidence ≥ 0.5` to emit a relationship:

| Signal | Weight | Source |
|---|---|---|
| Shared files, predecessor's `last` before successor's `first` | 0.3 | git |
| Commit-message tokens ("after", "depends on", "now that", "follows") | 0.25 | git messages |
| L4 cross-stream-links | 0.3 | `intent-leaves.json` |
| Leaf criterion ordering inside same leaf | 0.4 | `wbs-dev.leaves.json` |

Cycles broken by dropping lowest-confidence edge. All dropped/uncertain edges go to a `relationships.rejected.json` sidecar so the heuristic itself stays auditable.

## What this plan does NOT do

- No P6 XML emission.
- No edits to `src/`.
- No new app routes or UI.
- No fixes to the audit, marketing copy, or memory.
- No deletion of `.lovable/wbs/wbs.json` etc. — they're replaced in place, but the old shape is archived to `.lovable/wbs/_archive-v1/` so we can diff against the first pass.

## File changes

- create `scripts/wbs/build-spine.mjs` (reads existing catalogs → `wbs.json`)
- create `scripts/wbs/build-activities.mjs` (Pass A + B + C → `activities.json`, `links.json`)
- create `scripts/wbs/build-relationships.mjs` (4-signal inference → `relationships.json` + `.rejected.json`)
- create `scripts/wbs/build-state.mjs` (state vector → `state.json`)
- create `scripts/wbs/build-next.mjs` (derived view → `next.json`)
- create `scripts/wbs/build-all.mjs` (orchestrator)
- archive current `.lovable/wbs/*.json` → `.lovable/wbs/_archive-v1/`
- write new `.lovable/wbs/{wbs,activities,links,relationships,relationships.rejected,state,next}.json` + `README.md`

## Step order I'll execute when you approve

1. Build the spine (`wbs.json`) and sanity-check counts against the 417-leaf catalog + orphan capabilities.
2. Pass A in isolation, dump stats, eyeball 10 commits to confirm multi-attribution behaves.
3. Pass B + merge, eyeball 10 leaves to confirm many-per-leaf works.
4. Pass C, confirm future activities have `gating_predecessors` resolving to real ids.
5. Relationships + state + next.
6. Report counts, top 10 "ready-to-start" future activities, top 10 dormant-but-needed activities. No XML, no UI.
