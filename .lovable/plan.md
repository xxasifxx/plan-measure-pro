## Reset

You're right on both counts. The 19-leaf WBS I started with is a top-down guess dressed up as ground truth. The honest move is: **let the commits tell us what the activities are**, then group those activities into WBS. Depth will likely land at 40–80 leaves, not 19.

Duration rule for refine/minor-change clusters is locked in: **span of the acceptance cluster, split into Refine-1/2/… when there's a gap > 7 days**.

## Phase A — Enrich the raw data (one pass, all in `build-history.json`)

Per commit, capture:

- `sha`, `date`, `kind` (build / acceptance / bootstrap) — already there
- `subject` — full first line
- `files`: `[{path, insertions, deletions, status}]` from `git log --numstat --name-status`
- `pathTags`: deterministic labels derived from path (`pages/Landing` → `page:landing`, `src/lib/p6xml/*` → `lib:p6xml`, `supabase/functions/invite-user/*` → `edge:invite-user`, `src/components/schedule/*` → `ui:schedule`, etc.). Mapping table lives in the script, exhaustive over the actual file tree, no "unclassified" fallback — anything unmatched is a script bug to fix.
- `subjectTokens`: lowercased noun/verb tokens after stop-word strip ("fix", "add", "round", "polish", "tour", "pwa", "biometric", "gps", …)

No WBS assignment yet. Just facts.

## Phase B — Discover work items bottom-up

Two clustering passes over the enriched commits, both written into `docs/work-items.json` for hand-review:

1. **Path-cohort clusters** — connected components over commits that share ≥1 path-tag, then split a component when the inter-commit gap inside it exceeds 7 days. Each resulting cluster is a candidate "work item" with: lifespan, commit count, dominant path-tags, sample subjects, build vs acceptance counts.
2. **Subject-theme overlay** — within each path-cohort, detect sub-themes by recurring subject tokens (e.g. inside `ui:schedule`, separate "import P6 panel" from "Gantt chart" from "baseline manager"). This catches the case where one folder hosts multiple distinct features built in different weeks.

Output: ~40–80 candidate work items, each with hard evidence (commits + files + dates). No WBS yet.

## Phase C — Hand-review + WBS emergence

You and I walk `docs/work-items.json` together. For each candidate work item we decide:

- Keep / merge / split
- Name (real noun phrase, not a folder name)
- Which top-level product surface it belongs to

WBS emerges from the grouping, not the other way around. Top branches will probably still be roughly: Takeoff & Measurement, Schedule & P6, Field/Mobile, RE Workflow, Reporting, Admin/Org, Marketing/Onboarding, Pilot — but leaves are dictated by what got built.

Result: `docs/wbs.json` — frozen WBS tree with each leaf pointing to its work-item IDs.

## Phase D — Activities per leaf

For each leaf, derive activities mechanically from its commits:

- **Build burst** — first dense cluster of build commits (≥60% in ≤20% of leaf lifespan). Start = first build commit, finish = last build commit in the burst.
- **Refine-N** — every subsequent acceptance/build cluster, split whenever inter-commit gap > 7 days. Min duration 1d.
- **Hardening cross-leaf milestone** — commits matching `/round \d|hardening|polish|cleanup/i` that span ≥3 leaves on the same day become a fan-in milestone.
- **Lone late singletons** — punch list, in-progress, 1d each.

Acceptance merges attach to whichever leaf the build commits between this merge and the prior merge touched. Multi-leaf merges fan out.

## Phase E — Audit (the thing you stopped me from starting prematurely)

Only after C+D do I spawn per-leaf audit subagents. Each gets: its leaf's commits, files, work-item description, and the strict E2E rubric. Writes `docs/audit/<leaf-code>.md`. Then `docs/AUDIT_2026Q2.md` synthesizes.

## Phase F — Schedule fixture + PMXML

Translate audited leaves into `takeoffpro-build.def.ts` → exporter → `takeoffpro-build.xml` → XSD validate → round-trip test. Unchanged from the earlier plan.

## File-level change set

```text
scripts/extract-build-history.mjs    EDIT  add numstat+name-status, pathTags, subjectTokens, drop top-down WBS mapping
scripts/discover-work-items.mjs      NEW   path-cohort + subject-theme clustering → docs/work-items.json
docs/build-history.json              REGEN enriched commit records, no WBS field
docs/work-items.json                 NEW   candidate work items for hand-review (Phase B output)
docs/wbs.json                        NEW   frozen WBS tree after Phase C review
docs/audit/<leaf>.md                 NEW   per-leaf strict E2E audit (Phase E)
docs/AUDIT_2026Q2.md                 NEW   synthesis (Phase E)
src/lib/p6xml/fixtures/takeoffpro-build.def.ts   NEW   Phase F
src/lib/p6xml/fixtures/takeoffpro-build.xml      NEW   Phase F
src/test/p6xml-build-roundtrip.test.ts           NEW   Phase F
.lovable/plan.md                     EDIT  thin pointer (last)
```

## Checkpoints where I stop and wait for you

1. End of Phase A — you eyeball `build-history.json` to confirm enrichment looks right.
2. End of Phase B — you eyeball `work-items.json`. **This is the critical review.** Adjusting clustering here is cheap; adjusting after WBS is frozen is expensive.
3. End of Phase C — you sign off on `wbs.json` before any activity generation.
4. End of Phase D — you sign off on the activity list before audit subagents are spawned.

I will not spawn the audit subagents until checkpoint 4.

## What I am explicitly not doing this round

- No edits to app code, DB, marketing, or exporter
- No assumed WBS, no guessed activity names, no back-projected baselines yet (baselines come after audit when we know actual span)
- No subagents until Phase E
