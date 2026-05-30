## Goal

Today the WBS has two shapes that don't meet:
- **High-concept** lives in `comprehension.json` as stream criteria/risks (what the product must do).
- **Files** live in `spine.json` / `wbs.json` as `stream → layer → file` (what we've built).

You want a single tree where **files are leaves under the capability they realize**, activities build them, and program-level deliverables (baseline schedule, governance docs) sit alongside as their own branches. New/missing files appear as placeholder leaves so the WBS shows what's left, not just what exists.

## Target shape

```text
TakeoffPro Build
├── 06 Daily Report Lifecycle                       (stream)
│   ├── C1 Inspector live preview of day            (capability = criterion)
│   │   ├── F src/pages/DailyReport.tsx             (file leaf, existing)
│   │   ├── F src/hooks/useDailyReport.ts           (file leaf, existing)
│   │   └── F src/lib/daily-report-snapshot.ts     (file leaf, existing)
│   ├── C2 Submit freezes snapshot                  (capability)
│   │   └── F src/hooks/useDailyReport.ts          (shared with C1)
│   ├── C8 Reject requires reason + RLS             (capability, partial)
│   │   ├── F src/components/ReRejectDialog.tsx     (file leaf, existing)
│   │   └── F supabase/migrations/NEW_re_role_rls.sql  (PLACEHOLDER leaf)
│   ├── R1 daily_report_snapshots missing in types  (risk-capability)
│   │   └── F src/integrations/supabase/types.ts    (shared, regenerate)
│   └── Stream overhead                             (files not tied to a criterion)
│       └── F docs/streams/06-daily-report-lifecycle.md
├── 00 Program Management
│   ├── Baseline project schedule                   (non-file deliverable)
│   │   ├── A Lock baseline activities              (activity, no file)
│   │   └── A Publish baseline P6 XML               (activity, produces public/exports/*.xml)
│   ├── WBS pipeline                                (existing scripts as files)
│   └── Governance docs
└── 21 Marketing Debt                               (kept as-is, claim → activity)
```

Two kinds of leaves:
1. **File leaves** — one per existing file (from `file-history.json`) plus **placeholder leaves** for files a criterion needs that don't exist yet.
2. **Deliverable leaves** — non-file work products (baseline schedule, sign-off memos, training videos). These hang off `00 Program Management` or a stream's "Deliverables" node.

Each leaf gets activities (scaffold → implement → verify-e2e). Activities roll up to the capability; capability % complete = weighted roll-up of its file/deliverable leaves' verified status.

## Build plan

### 1. Extend the data model (no code changes yet, just schema)

`comprehension.json` already has per-criterion `evidence_paths` — that's the bridge. Add two optional fields per criterion in the stream MD front-matter parser:

```yaml
capabilities:
  - id: c1
    files: [src/pages/DailyReport.tsx, src/hooks/useDailyReport.ts]
    needs_files: []          # paths that don't exist yet but criterion requires
  - id: c8
    files: [src/components/ReRejectDialog.tsx]
    needs_files: [supabase/migrations/NEW_re_role_rls.sql]
```

For streams where the MD doesn't list this explicitly, derive `files` from `evidence_paths` resolved against the stream's `paths:` globs (already in comprehension).

### 2. New build step: `build-capabilities.mjs`

Reads `comprehension.json` + `spine.json`. Emits `.lovable/wbs/capabilities.json`:

```json
{
  "06-daily-report-lifecycle": {
    "capabilities": [
      { "id": "06#c1", "title": "...", "verdict": "implemented",
        "files": ["src/pages/DailyReport.tsx", ...],
        "needs_files": [] },
      ...
    ],
    "orphan_files": ["docs/streams/06-...md"]   // files owned by stream, no capability claims them
  }
}
```

Orphan files get parked under a per-stream "Stream overhead" capability so nothing is silently homeless.

### 3. Rewrite `build-spine.mjs` parenting (small change)

Today: `leaf.parentId = layer node` (Frontend/Backend/etc.).
After: `leaf.parentId = capability node`; layer becomes a tag on the leaf, not a parent. Capability nodes parent to stream nodes. Add **placeholder leaves** from `needs_files` with `exists: false`, `loc_added: 0`, `verdict_blocker: true`.

Deliverable leaves (baseline schedule, etc.) live in a new `program-deliverables.json` hand-curated file — small, ~15 entries — and `build-spine` merges them in under `00 Program Management` or the stream they belong to.

### 4. Activities per leaf

Replace today's stream/layer-level activity generation in `build-activities.mjs` with per-leaf activities:
- `scaffold` (always Completed for existing files; Not Started for placeholders)
- `implement` (Completed if `loc_added > N` AND verdict ≠ undelivered; In Progress if partial)
- `verify-e2e` (Completed only if `verification.manifest.json` has a recipe AND `verifiedE2E: true`)

Capability % complete = mean of `verify-e2e` activity status across its leaves. Stream % = weighted mean of capabilities (weight by LOC or leaf count — pick one and stick to it).

### 5. Roll-up + consumer surface

- `build-state.mjs` already exists — point it at the new capability tier.
- `build-next.mjs` returns "next action" as the **lowest-cost activity that unblocks the highest-verdict-gap capability**.
- Add a tiny `/wbs` route in-app (read-only) that renders `wbs.json` as a collapsible tree with three colored columns: file exists? activity status? verified? — so the team actually reads it.

### 6. PMXML emit

`emit-p6-xml.mjs` already walks parents → leaves. With capability nodes inserted, PMXML hierarchy gains one more level. No emitter changes needed beyond passing them through; verify round-trip test still parses.

## Files touched

**New:**
- `scripts/wbs/build-capabilities.mjs`
- `.lovable/wbs/capabilities.json` (generated)
- `.lovable/wbs/program-deliverables.json` (hand-curated, ~15 entries)
- `src/pages/Wbs.tsx` + route (tree viewer; small)

**Edited:**
- `scripts/wbs/build-spine.mjs` — re-parent leaves to capabilities, inject placeholder + deliverable leaves
- `scripts/wbs/build-activities.mjs` — per-leaf scaffold/implement/verify triplet
- `scripts/wbs/build-state.mjs` and `build-next.mjs` — roll up on capability tier
- `scripts/wbs/build-all.mjs` — add capabilities step before spine
- Each `docs/streams/NN-*.md` — optional `capabilities:` block; default derivation works without it (one-time pass to fill obvious gaps for the 3–4 streams where evidence_paths under-cover criteria)

**Unchanged:** `comprehension.json` schema, `file-history.json`, `wbs-dev.*` (kept as the lenient code-presence view for contrast), PMXML parser.

## Out of scope (call out)

- Retiring `wbs-dev` and `wbs-v2` — separate decision; this plan keeps the file-grounded WBS as the canonical one without deleting the others.
- Cost loading / earned value on activities.
- Auto-filling `verification.manifest.json` — still a human routine; this plan only surfaces the gap more obviously.

## Verification

After build: every stream node has ≥1 capability child; every capability has ≥1 file leaf OR ≥1 deliverable leaf; every file in `file-history.json` appears exactly once as a primary leaf; placeholder leaves count equals sum of `needs_files` across capabilities; PMXML round-trip test still passes.

## Open questions before I build

1. **Deliverable leaves** — do you want me to seed `program-deliverables.json` from the existing `00-program-management` overhead bucket + a short list I draft (baseline schedule lock, governance memo, training video, internal launch checklist), or do you want to hand me the list?
2. **Placeholder leaves** — derive `needs_files` only from criteria with `verdict: partial|undelivered`, or also from the Risks section of each stream MD (which often names a missing file like `audit_log` table)?
3. **Capability weight** — leaf count (simple) or LOC (truer to effort)? I'd default to leaf count for honesty since LOC rewards verbose files.
