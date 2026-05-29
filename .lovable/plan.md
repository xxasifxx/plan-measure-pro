
# Project-as-Schedule: WBS + activities from git + audit

Apply this app's own schedule-analytics thesis to its own history. Output is JSON only — no app wiring yet, no charter, no fixes. Goal: see what got worked on when, what ran in parallel, what's gated on what, and what looks dormant-but-needed vs. dead.

## Output

Two files under `.lovable/wbs/`:

- **`wbs.json`** — hierarchy: pivot era → product thesis → subsystem → work-package → activity. Each node has id, parent, name, evidence pointers (leaf IDs, snapshot dates, lie-tax row, mem refs).
- **`activities.json`** — flat list of activities, the heavy file. Each activity has:
  ```
  id, wbs_id, name,
  first_commit_ts, last_commit_ts, calendar_duration_days, active_days,
  commits[], files_touched[], loc_added, loc_removed,
  resource_load: { commits_per_active_day, files_per_active_day, peak_day, peak_intensity },
  dormancy: { longest_gap_days, gap_windows[], current_dormancy_days },
  status: in_progress | quiet | paused | dormant | blocked | abandoned | shipped | orphaned | needs_successor,
  status_evidence: "...",
  predecessors: [{ id, type: FS|SS|FF, basis: file_overlap|import_dep|message_ref|semantic|temporal, confidence }],
  successors_implied: [{ description, why_needed }],   // open work the activity points to but never did
  concurrent_with: [ids]
  ```

## Derivation pipeline (one script, `scripts/wbs-mine.ts`)

1. **Raw events** — `git log --all --numstat --no-merges` → JSON of (sha, ts, author, msg, files[+/-/del]).
2. **Cluster commits into activities** — group by: (a) file-set Jaccard ≥ 0.4 within a 14-day window, (b) commit-message n-gram similarity, (c) shared subsystem path prefix. One activity = one coherent thread of work.
3. **Map to audit** — join each activity to L4 leaves via file paths. An activity inherits the leaves it touches; this is how WBS levels above "activity" get populated.
4. **Build WBS** — top level = 8 detected pivots (eras), level 2 = product theses active in that era, level 3 = subsystems (from leaf clustering), level 4 = work-packages, level 5 = activities. Pivots come from `L3/pivots.json`; theses from snapshot history.
5. **Compute resource loading** — per activity and rolled up per WBS node, per day. Detect peak-load days and concurrent activities (any two activities with overlapping `[first..last]` ranges and ≥1 shared active day).
6. **Infer dependency logic** — for each activity pair:
   - **FS (finish-start)** if activity B's first commit touches files activity A created, and A's last commit predates B's first.
   - **SS (start-start)** if they share files and overlap in time.
   - **Explicit** if commit message of B references A (issue ref, file ref, "follow-up to", "fixes", etc.).
   - **Semantic** if B imports a symbol A exports.
   - Confidence: explicit > import > file_overlap > temporal.
7. **Status classification** — rule table, not vibes:
   - `shipped` = activity's leaves are all implemented + linked + no lie-tax flag.
   - `orphaned` = implemented but no `links_to[]` from any user-reachable surface.
   - `abandoned` = implemented but explicitly contradicted by a later pivot (per `pivots.json`).
   - `dormant` = no commits in 60+ days AND has open implied successors.
   - `paused` = no commits in 14–60 days AND last commit message contains "wip"/"todo"/"part 1".
   - `blocked` = open predecessor (declared in message) is itself not `shipped`.
   - `quiet` = recent commits but low intensity (≤1 commit/week).
   - `in_progress` = commits within last 14 days at normal intensity.
   - `needs_successor` = shipped but has `successors_implied[]` that nobody picked up.
8. **Surface "what needs to happen"** — derived view, written as `next.json`: every activity with `status ∈ {dormant, blocked, needs_successor}` plus its implied successors, sorted by (a) downstream activity count, (b) lie-tax exposure, (c) recency of last touch.

## Implied successors — where they come from

Not invented. Sourced from:
- `TODO`/`FIXME`/`XXX` comments inside files the activity created (with file:line).
- L4 leaves marked `partial` or `stub`.
- Memory notes (`mem://`) that describe behavior the code doesn't yet implement.
- Lie-tax rows (marketing claims with no implementing leaf).
- Stream docs (`docs/streams/*`) listing outcomes that have zero implemented leaves.

Each implied successor carries its source so you can audit it.

## Scope discipline

- **No app changes.** Pure data extraction → JSON.
- **No fixes.** This run only describes; it does not prescribe individual code edits.
- **No charter.** That conversation is parked. If the WBS makes the missing meta-decision obvious, we'll know without me forcing it.
- **No deletions.** Even `abandoned` activities stay in the data with the reason.

## Build steps

1. Read `L4/*.json`, `L3/pivots.json`, `L3/hist-*.json`, `mem://**`, `docs/streams/*`, `llms.txt`, `STORE_LISTING.md`, `src/pages/Landing.tsx`.
2. Write `scripts/wbs-mine.ts`.
3. Run it. Mining the full git history + clustering + dependency inference will take a few minutes on a repo this size; activity count will likely be in the 200–600 range.
4. Sanity-check: spot-check 5 activities by hand against git log to confirm clustering and dependency inference aren't garbage. Adjust thresholds (Jaccard, window size, intensity cutoffs) if they are.
5. Write `.lovable/wbs/wbs.json`, `.lovable/wbs/activities.json`, `.lovable/wbs/next.json`.
6. Write `.lovable/wbs/README.md` — schema, derivation rules, threshold values used, known limitations (e.g., merge commits skipped, renames may break clustering across rename boundaries).
7. Summarize back: total activities, count by status, top 10 concurrent-activity windows, top 10 entries in `next.json`.

## What you get to look at

A 600-row activity table where you can sort by status, filter by WBS branch, and trace any "needs_successor" item back to the commits, files, leaves, and marketing claims that imply it. If the data is useful, next move is wiring it into the in-app Gantt — but that decision waits until you've seen the JSON.

## What I'm NOT promising

- Perfect clustering. File renames, refactors that move code wholesale, and "drive-by" commits will produce some misattribution. Thresholds will need a tune-up pass.
- Perfect dependency edges. Temporal/file-overlap edges are heuristic; only `explicit` and `import` edges are high-confidence.
- Coverage of work done outside git (chat decisions, plans, designs that never landed). Those show up only via memory notes and stream docs.
