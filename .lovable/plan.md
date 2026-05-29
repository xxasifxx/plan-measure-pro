## Phase C (revised) — Full-Scope WBS Emergence

The bottom-up clustering of 103 work items only describes **what has been built**. The P6 schedule must represent the **whole project**: built work, in-flight work, and unbuilt-but-promised scope from the requirements document and marketing roadmap memories. Phase C now has two tracks that converge into a single frozen WBS.

### Track 1 — Built scope (commit-derived, as previously planned)

1. `scripts/cluster-work-items.mjs` — read-only co-occurrence graph over `docs/work-items.json`. Edge weight = shared-commit count normalized by smaller item's `buildCommitCount`. Items in disjoint time windows (no overlap and gap > 30d) are not connected.
2. Emit `docs/wbs-proposals.built.json` — one proposal per connected component with member work items, combined commit count, total span, top shared subject tokens. Singletons listed separately. Low-signal tags considered for folding in as evidence.

### Track 2 — Planned scope (top-down from authoritative sources)

3. `scripts/extract-planned-scope.mjs` — parses two sources into a normalized list of capability candidates:
   - `docs/TakeoffPro_Requirements_Document.md` — headings and bullet leaves become candidates with `source: "requirements"`, carrying their section path.
   - Memory files under `mem://marketing/*`, `mem://features/*`, and any `mem://*roadmap*` — each rule becomes a candidate with `source: "marketing"` or `source: "memory:<file>"`. Aspirational/future-facing language ("will", "roadmap", "planned", "vision") flagged.
4. Emit `docs/wbs-proposals.planned.json` — each candidate carries `{ name, source, sourceRef, evidenceText }` and no commits.

### Track 3 — Reconciliation (the new core of Phase C)

5. `scripts/reconcile-scope.mjs` — for each built proposal, attempt to match one or more planned candidates by:
   - keyword overlap between proposal's shared subject tokens and candidate name/evidence
   - path-tag → requirements-section heuristic table (e.g. `lib:p6xml` → "Scheduling / P6 XML round-trip"; `page:field-report` → "Field Reporting / Daily reports")
   Output `docs/wbs-proposals.reconciled.json` with three buckets per top-level surface:
   - **built** — has commits, matched to a planned candidate (status will be `built` or `in-progress` depending on last-commit recency vs. today)
   - **partial** — has commits but planned candidate lists sub-capabilities none of the commits touch (status `in-progress`, with unbuilt sub-leaves listed)
   - **planned** — planned candidate with no commit match (status `planned`)
6. Top-level surfaces are derived, not pre-declared. Candidates: `Takeoff`, `Scheduling`, `Field Operations`, `Native / Offline`, `Marketing & Sales`, `Auth & Admin`, `Backend & Infra`, `Project Bootstrap`, plus any surface that emerges from requirements sections with no built counterpart (e.g. an unbuilt "Integrations" surface).

### Hand-review checkpoint

7. You and I walk `wbs-proposals.reconciled.json` together — decide names, keep/split/merge, confirm which planned items make the cut for this schedule vs. defer. Specifically for each `planned` leaf, you confirm or override the rough duration (see step 8).

### Freeze WBS

8. Write `docs/wbs.json`. Every leaf carries:
   - `id`, `name`, `parentSurface`
   - `status`: `built` | `in-progress` | `planned`
   - `workItemIds[]` (empty for `planned`)
   - `commitWindow` (null for `planned`)
   - `plannedDuration` (only for `planned` / unbuilt sub-leaves of `in-progress`) — proposed by `scripts/propose-planned-durations.mjs` using analogous built leaves: median build-burst span + median refine count, scaled by a complexity factor inferred from how many sub-bullets the requirements doc gives the candidate. You override during the hand-review.
   - `sources[]`: `["commits"]`, `["requirements:<section>"]`, `["memory:<file>"]`, or a combination.
   - Every `built` leaf is still backed by ≥3 commits.

### Sanity report

9. Print: built leaf count, in-progress count, planned count, coverage of requirements-doc sections (% with a matched leaf), orphan commits, orphan planned candidates (rejected during reconciliation), cross-leaf commits (future hardening milestone candidates).

### Phase D implication (preview, not executed yet)

- `built` leaves → activities generated from commits (build burst + Refine-N, gap > 7d rule).
- `in-progress` leaves → same, plus one `Build-Remaining` activity per unbuilt sub-leaf with proposed duration, scheduled after last commit.
- `planned` leaves → single `Build` activity with proposed duration, no predecessor from commits; logic ties are added during the schedule-fixture step.

### Explicitly NOT doing in Phase C

- No activities, no Build/Refine split, no durations on built leaves, no audit subagents.
- No app code, no exporter edits, no back-projected baselines.
- No pre-declared top-down surfaces — surfaces emerge from reconciliation.
- No commitment that every requirements-doc bullet becomes a leaf — you cull during hand-review.

### Deliverables

- `scripts/cluster-work-items.mjs` (new, read-only)
- `scripts/extract-planned-scope.mjs` (new, read-only)
- `scripts/reconcile-scope.mjs` (new, read-only)
- `scripts/propose-planned-durations.mjs` (new, read-only)
- `docs/wbs-proposals.built.json` (new)
- `docs/wbs-proposals.planned.json` (new)
- `docs/wbs-proposals.reconciled.json` (new)
- `docs/wbs.json` (new — written only after hand-review)
- `.lovable/plan.md` (edited)

### Checkpoints where I stop and wait

- After step 5 (reconciled proposals emitted) — full review before any naming/cull decisions.
- After step 7 (your decisions captured) — before I write `wbs.json`.
