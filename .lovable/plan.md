
# Rebuild `.lovable/plan.md` from the L4 audit

## Goal

Replace the current `.lovable/plan.md` (which still reflects the pre-audit aspirational roadmap) with a **single source-of-truth backlog** that is 1:1 traceable to the audit artifacts in `docs/wbs-dev.agent-runs/L4/`. No code changes. No new features invented. Every item must cite an intent-leaf ID, a lie-tax row, or a pivot snapshot.

## Inputs (already on disk)

- `L4/intent-leaves.json` — 190 leaves, statuses normalized to `implemented / partial / missing / todo`, with `gaps[]` and `links_to[]`.
- `L4/lie-tax.md` — 3 fraud-risk + 10 misleading + 4 cosmetic public claims.
- `L4/snapshots/README.md` — abandoned-bets table and pivot narrative.
- `L3/hist-*.json` + `L3/pivots.json` — historical context for "why is this here?" questions.

## Output structure

A single rewritten `.lovable/plan.md` with these sections, in this order:

### 1. Header
- Generated date, source commit, and a one-paragraph "how to read this" note that points at the L4 artifacts.
- Explicit statement that this supersedes all prior phase plans.

### 2. Severity-ordered remediation queue (the "do next" list)
A flat, ranked table — this is the part that drives day-to-day work:

| Rank | Item | Severity | Stream | Evidence | Effort |
|---|---|---|---|---|---|

Severity tiers, in order:
1. **Fraud-risk** — pulled directly from `lie-tax.md` (3 rows).
2. **Silent data corruption** — leaves with `status=broken` whose gaps include words like "inflation", "silent", "double-fire", "wrong unit" (ProjectControls unapproved totals, Kalman zero-dt, role double-fires, estimateError unit mismatch).
3. **Missing backend** — leaves with `status=missing` that have a UI consumer (demo_requests table, send-push delivery verification).
4. **Misleading marketing** — the 10 misleading rows from `lie-tax.md`.
5. **Orphans worth deleting** — leaves with `status=orphan` and no `links_to[]` (parse-schedule edge fn, AACE_CLASSES, compareProgress).
6. **Cosmetic claims** — the 4 cosmetic rows.

### 3. Stream-by-stream backlog (the "what exists per area" reference)
Twenty subsections (one per value stream, in the existing numbering 01–20). Each subsection contains:

- **One-line stream purpose** (from the L2 stream's intent summary).
- **Implemented** — bulleted list of leaves with `status=implemented`, each with leaf ID and a single-line summary. No evidence dump.
- **Partial** — same format, plus a `Gap:` line per item.
- **Missing / Todo** — same format, plus a `Why blocked:` line where known.
- **Cross-stream dependencies** — links from `cross_stream_links` that touch this stream.

This section is reference material, not a queue. It exists so anyone asking "what's the real state of GPS?" gets a truthful answer in one place.

### 4. Pivot ledger (the "why is the codebase shaped this way" reference)
Condensed from `snapshots/README.md`:
- Table of every pivot with date, what was abandoned, what replaced it, and which leaves are still scarred by the transition (e.g. localStorage→cloud left `useProject` with dead code paths).
- Used to justify any "delete orphan" decisions in section 2.

### 5. Out-of-scope / explicitly deferred
Anything the audit found that we are consciously NOT doing in Phase 2:
- Marketing-promised integrations that need vendor contracts (SiteManager, AASHTOWare).
- Roadmap items from earlier plans that the snapshots show were tried and abandoned.
Each entry cites the snapshot or lie-tax row that justifies the deferral.

### 6. Open questions for the user
Concrete decisions the audit surfaced but couldn't resolve unilaterally:
- Downgrade misleading marketing copy or actually ship the claimed feature?
- Delete orphaned modules or wire them to a UI?
- Keep XER parser code now that PMXML is the supported format?

## Build process (when you switch me to build mode)

1. Read `L4/intent-leaves.json` and `L4/lie-tax.md` in full.
2. Read `L4/snapshots/README.md` for the pivot ledger.
3. Generate the new `.lovable/plan.md` in one write.
4. Move the existing `.lovable/plan.md` to `.lovable/plan.archive-<date>.md` so the prior aspirational version is preserved but no longer authoritative.
5. Verify by re-reading the new file and spot-checking that every section-2 row resolves to a real ID in the L4 JSON.

## What this plan does NOT do

- No code changes to `src/`, `supabase/`, or anywhere outside `.lovable/`.
- No new audit passes — uses only artifacts already on disk.
- No prioritization of *how* to fix items — only *what* and *in what order to consider*. The actual fix work is a separate, later step you'll choose item-by-item from section 2.

## Confirmation needed before I switch to build

Two quick choices that change the output meaningfully — answer either here or after switching to build mode:

- **Length cap:** target ~600 lines (terse, scannable) or ~1500 lines (full evidence inline per item)?
- **Open-questions handling:** include section 6 inline, or split it out to `.lovable/open-questions.md` so the plan stays decision-clean?
