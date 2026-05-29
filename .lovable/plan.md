# Phase D — Finish the WBS

You're right: critical path is garbage-in/garbage-out until (a) thin leaves are fleshed out so durations are real, and (b) commits are mapped so "shipped" leaves carry actual completion evidence. So we sequence:

```text
Step 1  Depth audit          ──► fattens thin leaves, fixes duration estimates
Step 2  Commit reconciliation ──► proves shipped/partial status, splits BC-001
Step 3  Critical path         ──► now meaningful, renders dependency graph
```

Each step writes its own artifact and updates `docs/wbs.json` before the next step consumes it.

---

## Step 1 — Depth audit

**Goal:** Every leaf has enough sub-tasks that its `durationDays` is defensible.

Spawn 3 parallel subagents, each owning a slice of the 276 leaves:
- **Agent A** — surfaces Takeoff, Field Ops, Documents, Reporting, Marketing (≈90 leaves)
- **Agent B** — Scheduling, Scheduling Extras, Project Controls, Resource Mgmt, Cost/EVM/Risk/Claims (≈110 leaves)
- **Agent C** — Bootstrap/Shell, Auth/Admin, AI, Integrations, Native/Offline, Notifications, Fajar, Backend/Infra (≈76 leaves)

Each agent reads `docs/wbs.json` + the relevant source code, flags every leaf where:
- sub-tasks < 3, OR
- sub-task names are single words / non-actionable, OR
- duration estimate is missing or inconsistent with sub-task sum

Output per agent: a patch list in `/mnt/documents/wbs-depth-patches-{a,b,c}.yaml` — only the leaves needing edits, with proposed expanded `subTasks[]` and revised `durationDays`.

**Synthesis:** I merge the three patch files into the canonical source YAMLs (`docs/wbs-leaves.yaml` and the `/mnt/documents/wbs-*.yaml` files), re-run `node scripts/consolidate-wbs.mjs`, and report delta (leaves touched, days added/removed).

---

## Step 2 — Commit reconciliation

**Goal:** Every `shipped`/`partial` leaf points to real commits; the BC-001 megacluster and 12 UNASSIGNED clusters disappear.

Write `scripts/reconcile-commits.mjs` that:
1. Loads `docs/wbs.json` + `docs/wbs-proposals.reconciled.json` + `docs/work-items.json`.
2. For each shipped/partial leaf, uses `workItemHint` + name/sub-task tokens to score work-item matches; assigns commits above threshold.
3. Splits BC-001 (915 commits) by re-running the same scorer on individual work items inside the cluster — each one routes to its best-fit leaf.
4. Folds the 12 UNASSIGNED clusters: each member work-item is re-scored against all 276 leaves; leftovers become net-new `planned` leaves under a new surface `Unmapped Engineering` for user review.
5. Writes `docs/wbs-commits.json` (leaf → commit[] map) and appends a `commits` field on each leaf in `docs/wbs.json`.

**Output report:**
- Leaves now backed by ≥1 commit (shipped sanity check)
- Shipped leaves with **0** commits (status downgrade candidates)
- Work-items still unmapped (true orphans)

---

## Step 3 — Critical path

**Goal:** Render the longest-duration path through remaining non-shipped work.

Write `scripts/critical-path.mjs`:
1. Build DAG from `prerequisites[]` on non-shipped leaves.
2. Detect cycles → report as data bugs (don't crash).
3. Forward pass (ES/EF) + backward pass (LS/LF) → compute float per leaf.
4. Tag leaves with `float === 0` as critical.
5. Emit:
   - `docs/critical-path.json` — ordered list of critical leaves, total duration, near-critical (float ≤ 5d) list
   - `docs/critical-path.md` — human view: critical chain table + per-surface contribution to the critical path
   - `docs/critical-path.mmd` — Mermaid flowchart of the critical chain (max 50 nodes; longer chains get a collapsed sub-graph per surface)

**Output report:**
- Total critical-path days vs. total remaining days (parallelism ratio)
- Top 5 surfaces on the critical path
- Resource Mgmt / Fajar / EVM presence on critical path — answers your "are these gating or nice-to-have?" question

---

## Deliverables checklist

```text
Step 1: /mnt/documents/wbs-depth-patches-{a,b,c}.yaml
        updated source YAMLs, regenerated docs/wbs.json + docs/wbs.md
Step 2: scripts/reconcile-commits.mjs, docs/wbs-commits.json,
        commits[] added to docs/wbs.json
Step 3: scripts/critical-path.mjs, docs/critical-path.{json,md,mmd}
        .lovable/plan.md updated to reflect Phase D close-out
```

## Non-goals

- No app/UI code changes — this is all docs + scripts.
- No commits added to git history; we're only labeling existing ones.
- No re-estimating shipped leaves' duration unless Step 1 surfaces an obvious error.
- I will NOT cull any leaves; aspirational stays aspirational.

## Approval gates

I'll pause and report after each step so you can sanity-check before the next one runs (especially after Step 2, since downgraded "shipped" leaves may need your judgment).
