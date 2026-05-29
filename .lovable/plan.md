# Phase 1.6 — Account for what the catalog still misses

The 298-leaf catalog still has structural blind spots. Code inspection found seven categories of work that exist in the repo but produce zero leaves (or get collapsed so aggressively they hide weeks of effort). Phase 2 commit-mapping will misattribute or drop activity if we don't close these first.

## Blind spots found

**1. Database functions are invisible.** 17 SECURITY DEFINER functions in `public` (`assign_owner_role`, `has_role`, `is_project_member`, `accept_invitation`, `handle_new_user`, `seed_demo_users`, `seed_project_standard_folders`, `daily_reports_status_transition`, `daily_reports_status_side_effects`, `document_folders_block_nonempty_delete`, `projects_seed_folders`, `replace_project_schedule` ×2 overloads, `capture_baseline`, `delete_baseline`, `schedule_activities_validate_constraint`, `update_updated_at_column`). These are major work — none are leaves. They only show up indirectly inside weekly migration clusters.

**2. Migrations are over-collapsed.** 36 migration files → 4 weekly cluster leaves. That's 9× hidden granularity. Phase 2 needs per-migration leaves (or per-day) to attribute commits truthfully.

**3. RLS policies, triggers, enums, indexes have no leaves.** `app_role` and `resource_type` enums; status-transition triggers; ~30+ RLS policies across tables — all swept into "Migrations 2026-wXX".

**4. Storage buckets are brief-only.** `project-pdfs`, `specs-pdfs`, `annotation-photos`, `project-documents` exist as real surface but only two are claimed (in stale brief-only form with bogus paths like `supabase/storage/annotation-photos`).

**5. Static `public/*` SEO/PWA surface unclaimed by code-leaves.** `public/llms.txt`, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `placeholder.svg`, `exports/takeoffpro-dev.xml` — only referenced from stale brief bullets, none in code-leaves.

**6. Edge function ancillary surface.** `supabase/config.toml` got one leaf, but per-function `verify_jwt` config, secret bindings, and `supabase/seed.sql` are uncounted.

**7. Type & misc leaks.** `src/types/project.ts` not a leaf. `src/App.css` officially unclaimed. Six `src/assets/*` images dumped into `97 Plumbing` when they belong to `20 Sales & Pitch` (landing/marketing assets).

## What this plan does

Add **Phase 1.6** to the WBS pipeline: a sixth source that fills these gaps, plus heuristic fixes for misrouted leaves.

### Step 1 — db-surface leaves
New script `scripts/dev-wbs/build-db-surface-leaves.mjs`. Parses migrations with regex to extract:
- One leaf per `CREATE FUNCTION public.<name>` (routed by name → stream via `DB_FUNCTION_TO_STREAM` map in `stream-heuristics.mjs`).
- One leaf per `CREATE TYPE … AS ENUM`.
- One leaf per `CREATE TRIGGER` on a public table (named `trg: <table>.<trigger>`).
- One leaf per storage bucket from `storage.buckets` inserts.
- RLS policies stay aggregated as one leaf per table-level policy block (`rls: <table>`) to avoid leaf explosion.

### Step 2 — Per-migration leaves replace weekly clusters
In `build-code-leaves.mjs`, drop the `isoWeek` aggregation. Emit one leaf per `supabase/migrations/<file>.sql` under `98 Build & Infra` / Backend, named `migration: YYYY-MM-DD <slug>`. Weekly summary moves to a derived rollup in the markdown report only.

### Step 3 — Static public-surface leaves
Walk `public/**` in `build-code-leaves.mjs`. Route via new `PUBLIC_PATH_RULES`:
- `llms.txt`, `sitemap.xml`, `robots.txt` → `20 Sales & Pitch`
- `manifest.webmanifest`, icons → `15 Offline & Native Durability`
- `exports/*` → `13 Data Export`
- everything else → `97 Plumbing`

### Step 4 — Re-route landing/marketing assets
Extend `STREAM_RULES` so `src/assets/(hero-|highway-|inspector-|blueprint-|gps-field-)` → `20 Sales & Pitch`, and `app-icon-master.png` → `15 Offline & Native Durability`. Removes 6 false-positives from `97 Plumbing`.

### Step 5 — Pick up trailing files
Add `src/App.css`, `src/types/*`, `supabase/seed.sql`, and any per-function `supabase/config.toml` overrides as their own leaves. Verify the "files in repo that no leaf claims" section of `catalog-gaps.md` ends up empty.

### Step 6 — Regenerate & report
Re-run the pipeline (`build-leaves` → `build-code-leaves` → `build-db-surface-leaves` → `reconcile-leaves` → `build-dev-wbs`). Update `docs/wbs-dev.catalog-gaps.md` with a new top section **"Newly catalogued in 1.6"** listing every leaf added in this pass, so the user can audit the delta in one place.

## Technical details

**Files created**
- `scripts/dev-wbs/build-db-surface-leaves.mjs`

**Files edited**
- `scripts/dev-wbs/build-code-leaves.mjs` — per-migration leaves, `public/**` walk
- `scripts/dev-wbs/stream-heuristics.mjs` — asset re-routes, `DB_FUNCTION_TO_STREAM`, `PUBLIC_PATH_RULES`
- `scripts/dev-wbs/reconcile-leaves.mjs` — accept the new db-surface source
- `docs/wbs-dev.md` — pipeline diagram updated

**Expected leaf-count delta**
- +17 db function leaves
- +2 enum leaves
- ~+8 trigger leaves
- +4 storage-bucket leaves
- ~+15 RLS-per-table leaves
- +32 per-migration leaves (replacing 4 weekly clusters → net +28)
- +6 public/** leaves
- +3 misc (App.css, types, seed.sql)
- Total: **~298 → ~380 leaves**

**Out of scope for this phase**
- No commit mapping (Phase 2)
- No forward-looking activities (Phase 3)
- No PMXML regeneration (Phase 5)

## Approval

Say **proceed** to implement Phase 1.6, or push back on any of the seven blind-spot categories (e.g. "skip per-migration split, weekly clusters are fine" or "don't bother with RLS-per-table leaves").
