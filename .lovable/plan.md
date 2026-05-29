# Phase D — Reset, v2: solve the allowlist problem first

You caught the recursion: if I hand each subagent a curated file list, I'm just laundering the same broken tags through a different name. An auth agent that only sees `useAuth.tsx` + `Auth.tsx` will miss that auth touches `Admin.tsx`, every page guard, every RLS-aware hook, and half the edge functions. Same disease.

So the allowlist itself has to be **derived, broad, and verified**, not curated by me up front.

## Step −1 (NEW) — Build a defensible file→surface map

Three passes, each independent, results merged with disagreement flagged for human review. **Nothing else runs until this passes.**

### Pass A — Static derivation (cheap, mechanical, wrong on purpose)

Script `scripts/derive-file-surface.mjs`:
- For each file under `src/`, `supabase/`, `scripts/`, `docs/`: record path, top-level imports, top-level exports, and the leaf IDs that mention it in their `sources[]`.
- Emit `docs/file-surface-a.json` — naive path-based guess + reverse index from `wbs.json sources[]`.

This gives a baseline + exposes every file the WBS already claims to cover.

### Pass B — Semantic survey (one subagent, capable model)

One agent, read-only, gets **the entire `src/` tree** (it's ~250 files — fits) plus `supabase/functions/` and `docs/scope-inventory/*.md`. Task:

> For each file, in one sentence, say what user-facing capability it implements. Then assign it to one **or more** surfaces from this list: [13 surfaces]. A file can belong to N surfaces. Cite the import graph or the JSX it renders as justification. Flag files where no surface fits.

Output: `docs/file-surface-b.json` — `{ path, summary, surfaces[], confidence, justification }`.

This is the only pass that actually reads code to make the call. The capable model is worth it here.

### Pass C — Reverse derivation from leaves (capable model, one agent)

Different angle. Same agent type, different task:

> Here are 276 WBS leaves with names + sub-tasks. For each leaf, list every file in `src/` or `supabase/` whose code is *necessary to implement* this leaf. Do not use the leaf's `sources[]` field — derive from leaf semantics.

Output: `docs/file-surface-c.json` — `{ leafId, requiredFiles[], rationale }`.

### Merge + disagreement report

`scripts/merge-file-surface.mjs`:
- For each file, compare Pass A's guess, Pass B's assignment, Pass C's reverse map.
- **Agreement (all three concur on at least one surface):** lock it in.
- **Disagreement (B and C disagree, or either disagrees with A):** emit to `docs/file-surface-disputed.md` for you and me to resolve manually.
- **Orphan files (no leaf in C claims them):** emit separately — these are either dead code, missed leaves, or genuinely cross-cutting (`lib/utils.ts`).

You and I walk the disputed list together. Probably <30 files. After that, the allowlist is grounded in three independent passes plus human adjudication on the contested edges.

## Why this fixes the recursion you spotted

- The mapping isn't authored by me from priors. It's derived three ways and the contradictions are the deliverable.
- Pass B reads code without seeing the WBS, so it can't be biased by existing leaf assignments.
- Pass C reads the WBS without seeing the import graph, so it can't be biased by file paths.
- Where they agree, we trust it. Where they disagree, *you* see the disagreement before I act on it.
- Orphan files surface dead code and missed leaves automatically.

## Sequence (revised)

```text
Step −1   File→surface mapping (3 passes + merge + dispute resolution)  ← we are here
Step  0   Per-surface ground-truth audit using the locked allowlist
Step 0.5  Apply ground-truth to wbs.json
Step  1   Spot-fill thin leaves (mostly moot)
Step  2   Commit reconciliation as evidence layer
Step  3   Critical path
```

## Cost estimate

- Pass A: one script, <1 min, no LLM.
- Pass B: one capable subagent, ~250 files, one pass. Big context, single result.
- Pass C: one capable subagent, 276 leaves, one pass.
- Merge: one script.
- Dispute resolution: depends on disagreement rate — my guess is 20-40 files needing your call.

Total before Step 0 even starts: roughly the work of two subagents + a script + a review session. Cheap relative to redoing the whole WBS on a bad foundation.

## What I need from you

1. **Green-light Step −1** as written, or push back on the structure.
2. **Confirm the 13 surfaces** are the right vocabulary for Pass B to assign to. If you want to split (e.g. "Auth" vs "Admin", "Native" vs "Offline") or merge any, now's the time — Pass B's output is only as good as the label set.
3. **Decide who adjudicates disputes.** I'll propose for each, you decide? Or you want to see all of them raw and call them yourself?
