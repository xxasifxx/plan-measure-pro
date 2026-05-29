# Phase 1.7 — Multi-agent intent extraction + retroactive snapshots

Replace the single-script pipeline with an agent organization. Many narrow specialists read the file system (and git history) in parallel; a thin synthesis layer reconciles their output. Each layer's raw output is checkpointed to disk so reviews and re-runs are cheap.

## Org chart

```text
ORCHESTRATOR (this session)
│
├── L1  PARSERS  — mechanical, model=fast, one slice each, parallel
│   ├── ast-frontend         src/{components,pages,hooks,lib}/**/*.{ts,tsx}
│   ├── ast-schedule-lib     src/lib/schedule/** + src/components/schedule/**
│   ├── ast-native-offline   src/lib/native/** + src/lib/offline/**
│   ├── ast-pdf-canvas       PdfCanvas.tsx + Toolbar.tsx + MobileToolbar.tsx + geometry.ts + geo-transform.ts (its own agent — too dense to share)
│   ├── ast-project-hook     useProject.ts + useProjects.ts + useDailyReport.ts + useDocuments.ts + useReReviewQueue.ts
│   ├── sql-migrations       supabase/migrations/*.sql  (per-file table deltas, function bodies, policy expressions, trigger conditions)
│   ├── edge-fns             supabase/functions/*/index.ts  (request dispatch tree per function)
│   ├── tests                src/test/*.test.ts  (each it() = one asserted intent)
│   ├── config-infra         vite/tailwind/capacitor/supabase/config.toml, package.json scripts, eslint, vitest
│   ├── docs-streams         docs/streams/*.md  (Purpose / Surfaces / Acceptance / Current state — strict parse, fail loud)
│   ├── docs-scope           docs/scope-inventory/**, docs/comprehension-report.md, README, NATIVE_SETUP, STORE_LISTING
│   └── marketing-copy       public/llms.txt, src/pages/{Landing,FajarPitch,McfaPitch,Demo}.tsx, public/sitemap.xml
│
├── L2  COMPREHENDERS  — one per value stream (20 streams + 97/98/99), model=capable, parallel
│   ├── Inputs per stream agent: stream doc + files claimed by it + relevant parser outputs (filtered by file path)
│   ├── Tasks:
│   │   1. Emit intent leaves: { name, acceptance[], anchors[{file, region}], state, gaps[] }
│   │   2. Cross-check the stream doc's "Current state" claims against actual parser output → doc-drift entries
│   │   3. Flag capabilities present in code but missing from the stream doc → propose stream-doc patch
│   └── Output: docs/wbs-dev.agent-runs/L2/{stream-slug}.json
│
├── L3  HISTORIANS  — git-history-aware, model=capable, parallel
│   ├── per-file-timeline (one agent per "dense" file: PdfCanvas, useProject, Index, ScheduleWorkspace, parse-schedule edge fn, schedule libs aggregate, plus each migration cluster)
│   │   Method: git log --follow --patch <file>; for each commit, classify the hunk:
│   │     - capability-add     (new switch arm, new exported fn, new component, new RLS policy)
│   │     - capability-edit    (behavior change to existing capability)
│   │     - capability-remove  (deleted arm, removed export, dropped table/column)
│   │     - rewrite            (>40% LOC churn, same surface)
│   │     - pivot              (rename, type-signature break, dep swap, file split/merge)
│   │   Output: docs/wbs-dev.agent-runs/L3/<file-slug>.timeline.json
│   │
│   └── pivot-detector (single agent over the whole repo's git log)
│       Method: scan merge commits + rename detection (git log --follow -M -C --name-status), large deletions, package.json dep changes, migrations that drop/recreate the same object, large refactors of stream docs.
│       Output: docs/wbs-dev.agent-runs/L3/pivots.json with { date, sha, kind, before, after, blast-radius[] }
│
└── L4  SYNTHESIZERS  — model=capable, sequential (each depends on prior)
    ├── architect       Merges all L2 outputs → docs/wbs-dev.intent-leaves.json (the new catalog).
    │                   Rules: dedupe cross-stream overlap by anchor; assign stable IDs; collapse file-cluster leaves whose regions are now fully covered by intent leaves; keep them only for true orphans.
    ├── snapshotter     Joins L3 per-file timelines with the intent-leaf catalog → for each meaningful commit (merges + every Nth commit), emit docs/wbs-dev.snapshots/<YYYY-MM-DD>-<sha7>.json with the leaf-state vector (untouched/in-progress/landed/abandoned/pivoted-from/pivoted-to) at that moment. Produces docs/wbs-dev.snapshots.md as a narrative timeline.
    └── auditor         Cross-checks marketing-copy parser output vs intent-leaf states → docs/wbs-dev.lie-tax.md (claims with no landed leaf, claims with abandoned-and-resurrected history, claims that postdate the code by months — "shipped before promised" wins too).
```

## Heavy file-system access — no shortcuts

- L1 parsers each open every file in their slice (no sampling). They emit per-file JSON with: exported symbols, discriminated-union arms, route paths, JSX intent strings (button text, form labels, toast messages — these are user-facing intent surfaces nobody is reading right now), SQL object deltas, test `it()` titles.
- L3 historians run `git log --follow -p` on their target files end-to-end. The git-dates helper already exists (`scripts/dev-wbs/git-dates.mjs`) but only pulls first/last touch; historians produce full per-hunk timelines.
- The orchestrator does not summarize parser output for comprehenders. Each L2 agent reads the raw L1 JSON for its file set directly from disk. Synthesis only kicks in at L4.

## What the catalog will look like after this

- ~540–600 intent leaves (vs 417 file/db leaves today).
- Each leaf has `anchors[{ file, region }]` where region is a symbol, switch arm, route path, SQL object, or `it()` title — never just "whole file" unless truly unavoidable.
- Each leaf has a `history[]` field with `{ sha, date, kind }` events from L3, so you can ask "when did the polygon CY-depth prompt land, and was it ever removed?"
- `docs/wbs-dev.snapshots/` becomes a queryable retroactive record: pick any date, see exactly which capabilities were live, which were under construction, which had been abandoned, and which were about to pivot.
- `docs/wbs-dev.lie-tax.md` finally separates "promised but never shipped" from "shipped, abandoned, re-promised" from "quietly shipped, never marketed."

## Governance & cost

- Parser agents (L1, 11 agents) run `model=fast`, hard cap 11 parallel spawns. Each emits a single JSON; orchestrator does not read full bodies — only file sizes and error flags.
- Comprehender agents (L2, ~23 agents) run `model=capable`, batched 5–6 parallel to keep token spend bounded. Total bounded by stream count.
- Historian agents (L3, ~8 per-file + 1 pivot) run `model=capable`, parallel with L2.
- Synthesizers (L4, 3 agents) run sequentially.
- Every agent writes to `docs/wbs-dev.agent-runs/L{n}/...` — failures are inspectable, individual agents are re-runnable without re-running the whole pipeline.
- Token-budget guard: orchestrator records bytes-in / bytes-out per agent; if any agent exceeds a soft cap it gets split (e.g. ast-frontend → per-directory shards).

## Pipeline driver

New: `scripts/dev-wbs/orchestrate.mjs` — declarative spec of agents (slice, model, output path, dependencies). The orchestrator wraps the existing `spawn_agent` tool, so re-running is `node scripts/dev-wbs/orchestrate.mjs --layer L2 --stream 05-field-capture` for surgical re-runs.

## Review checkpoints

1. **After L1**: spot-check 3 parser JSONs (`ast-pdf-canvas`, `sql-migrations`, `marketing-copy`). If a parser hallucinated, fix its system prompt and re-run only that agent.
2. **After L2**: read `docs/wbs-dev.agent-runs/L2/05-field-capture.json`. Confirm `PdfCanvas.tsx` yields ~10 distinct intent leaves with regions, not one file leaf.
3. **After L3**: scan `pivots.json` and one per-file timeline. Confirm pivots match your memory of the project's actual turns (XER → PMXML pivot must show up; if it doesn't, the detector is wrong).
4. **After L4 architect**: review `intent-leaves.json` size + cross-stream dedupe. Walk one snapshot from 3 months ago and check it against memory.

## Out of scope

- No edits to product code, schema, or UI.
- No commit-to-leaf attribution (still Phase 2; this phase produces the targets it needs).
- No PMXML regen.
- No auto-creation of stream docs; the L2 comprehenders only *propose* doc patches in their output JSON. The user accepts/rejects in a separate pass.

## Why this answers the critique

- **Distributed analysis**: 11 parsers + 23 comprehenders + 9 historians + 3 synthesizers = 46 agents working in their own contexts, each looking at a slice small enough to read in full. The orchestrator never holds more than the agent manifest in its own context.
- **Every intent signal**: parsers cover ASTs, SQL, edge dispatch, tests, configs, marketing copy, *and* JSX user-facing strings — nothing currently extracted by the regex-based scripts.
- **Retroactive snapshots**: the L3 + snapshotter track makes "what did the app look like at <date>" a real query, and surfaces pivots (XER→PMXML, any abandoned features, refactor moments) as first-class artifacts instead of being lost between commits.
- **Re-runnable**: failures don't poison the whole catalog; each agent's output is a file you can delete and regenerate independently.
