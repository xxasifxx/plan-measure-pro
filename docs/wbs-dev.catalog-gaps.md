# Dev WBS — Catalog Gaps

Generated 2026-05-29T16:10:35.006Z.

## Summary

| Stream | Total | brief+code | brief-only | code-only |
|---|---:|---:|---:|---:|
| 01 Identity & Access | 13 | 8 | 2 | 3 |
| 02 Portfolio & PM Home | 9 | 4 | 5 | 0 |
| 03 Project Onboarding | 6 | 3 | 3 | 0 |
| 04 Pay Item Catalog | 9 | 4 | 5 | 0 |
| 05 Field Capture | 13 | 4 | 9 | 0 |
| 06 Daily Report Lifecycle | 11 | 10 | 1 | 0 |
| 07 Quantity to Payment | 5 | 3 | 2 | 0 |
| 08 Photo Evidence | 7 | 2 | 5 | 0 |
| 09 Standard Specifications | 3 | 2 | 1 | 0 |
| 10 Document Management | 6 | 4 | 1 | 1 |
| 11 Schedule Management | 38 | 24 | 1 | 13 |
| 12 Project Health & Controls | 6 | 2 | 2 | 2 |
| 13 Data Export & Interoperability | 13 | 8 | 4 | 1 |
| 14 Measurement & Geometry Engine | 7 | 4 | 2 | 1 |
| 15 Offline & Native Durability | 24 | 23 | 1 | 0 |
| 16 Mobile Field Ergonomics | 13 | 6 | 7 | 0 |
| 17 Notifications & Presence | 13 | 3 | 8 | 2 |
| 18 Compliance & Audit | 26 | 1 | 12 | 13 |
| 19 Onboarding & Tutorials | 11 | 4 | 7 | 0 |
| 20 Sales & Pitch | 15 | 4 | 10 | 1 |
| 97 Plumbing | 15 | 0 | 0 | 15 |
| 98 Build & Infra | 34 | 0 | 0 | 34 |
| 99 Cross-cutting | 1 | 0 | 0 | 1 |

**Totals:** 298 leaves — 123 brief+code, 88 brief-only, 87 code-only.

## Code-only leaves (brief is silent on this)

These represent work that happened but no brief acceptance criterion names it. Each is a hint that the corresponding stream brief is undercounting plumbing.

### 01 Identity & Access (3)
- **Admin** (Frontend) — `src/pages/Admin.tsx`
- **Settings** (Frontend) — `src/pages/Settings.tsx`
- **TeamManager** (Frontend) — `src/components/TeamManager.tsx`

### 10 Document Management (1)
- **storage** (Frontend) — `src/lib/storage.ts`

### 11 Schedule Management (13)
- **date-utils** (Frontend) — `src/lib/schedule/date-utils.ts`
- **db: activity_assignments** (Backend) — `public.activity_assignments`
- **db: activity_pay_items** (Backend) — `public.activity_pay_items`
- **db: activity_relationships** (Backend) — `public.activity_relationships`
- **db: activity_resource_assignments** (Backend) — `public.activity_resource_assignments`
- **db: baseline_activities** (Backend) — `public.baseline_activities`
- **db: project_schedule_meta** (Backend) — `public.project_schedule_meta`
- **db: schedule_activities** (Backend) — `public.schedule_activities`
- **db: schedule_baselines** (Backend) — `public.schedule_baselines`
- **db: schedule_calendars** (Backend) — `public.schedule_calendars`
- **db: schedule_resources** (Backend) — `public.schedule_resources`
- **fn: parse-schedule** (Backend) — `supabase/functions/parse-schedule/index.ts`
- **ScheduleToolbar** (Frontend) — `src/components/schedule/ScheduleToolbar.tsx`

### 12 Project Health & Controls (2)
- **db: rocks** (Backend) — `public.rocks`
- **db: scorecard_metrics** (Backend) — `public.scorecard_metrics`

### 13 Data Export & Interoperability (1)
- **sample** (Frontend) — `src/lib/p6xml/sample.ts`

### 14 Measurement & Geometry Engine (1)
- **db: geo_calibrations** (Backend) — `public.geo_calibrations`

### 17 Notifications & Presence (2)
- **db: device_tokens** (Backend) — `public.device_tokens`
- **db: notifications** (Backend) — `public.notifications`

### 18 Compliance & Audit (13)
- **analysis-dcma.test** (Verification) — `src/test/analysis-dcma.test.ts`
- **analysis-tia.test** (Verification) — `src/test/analysis-tia.test.ts`
- **baseline-end.test** (Verification) — `src/test/baseline-end.test.ts`
- **cpm.test** (Verification) — `src/test/cpm.test.ts`
- **daily-report-snapshot.test** (Verification) — `src/test/daily-report-snapshot.test.ts`
- **date-utils.test** (Verification) — `src/test/date-utils.test.ts`
- **dev-pmxml.test** (Verification) — `src/test/dev-pmxml.test.ts`
- **example.test** (Verification) — `src/test/example.test.ts`
- **geometry.test** (Verification) — `src/test/geometry.test.ts`
- **import-p6.test** (Verification) — `src/test/import-p6.test.ts`
- **p6xml.test** (Verification) — `src/test/p6xml.test.ts`
- **setup** (Verification) — `src/test/setup.ts`
- **specs-utils.test** (Verification) — `src/test/specs-utils.test.ts`

### 20 Sales & Pitch (1)
- **db: demo_requests** (Backend) — `public.demo_requests`

### 97 Plumbing (15)
- **app-icon-master** (Frontend) — `src/assets/app-icon-master.png`
- **blueprint-plans** (Frontend) — `src/assets/blueprint-plans.jpg`
- **client** (Frontend) — `src/integrations/supabase/client.ts`
- **ConfirmDialog** (Frontend) — `src/components/ConfirmDialog.tsx`
- **EmptyState** (Frontend) — `src/components/EmptyState.tsx`
- **gps-field-measurement** (Frontend) — `src/assets/gps-field-measurement.jpg`
- **hero-product-shot** (Frontend) — `src/assets/hero-product-shot.png`
- **hero-screenshot** (Frontend) — `src/assets/hero-screenshot.jpg`
- **highway-construction-aerial** (Frontend) — `src/assets/highway-construction-aerial.jpg`
- **inspector-tablet** (Frontend) — `src/assets/inspector-tablet.jpg`
- **NavLink** (Frontend) — `src/components/NavLink.tsx`
- **NotFound** (Frontend) — `src/pages/NotFound.tsx`
- **use-toast** (Frontend) — `src/hooks/use-toast.ts`
- **useTheme** (Frontend) — `src/hooks/useTheme.ts`
- **utils** (Frontend) — `src/lib/utils.ts`

### 98 Build & Infra (34)
- **apply-depth-patches** (Verification) — `scripts/apply-depth-patches.mjs`
- **build-code-leaves** (Verification) — `scripts/dev-wbs/build-code-leaves.mjs`
- **build-demo-pdf** (Verification) — `scripts/build-demo-pdf.mjs`
- **build-dev-pmxml** (Verification) — `scripts/build-dev-pmxml.mjs`
- **build-dev-wbs** (Verification) — `scripts/build-dev-wbs.mjs`
- **build-leaves** (Verification) — `scripts/dev-wbs/build-leaves.mjs`
- **components** (Build) — `components.json`
- **config** (Backend) — `supabase/config.toml`
- **consolidate-wbs** (Verification) — `scripts/consolidate-wbs.mjs`
- **derive-file-surface** (Verification) — `scripts/derive-file-surface.mjs`
- **discover-work-items** (Verification) — `scripts/discover-work-items.mjs`
- **eslint.config** (Build) — `eslint.config.js`
- **extract-build-history** (Verification) — `scripts/extract-build-history.mjs`
- **extract-marketing-promises** (Verification) — `scripts/extract-marketing-promises.mjs`
- **git-dates** (Verification) — `scripts/dev-wbs/git-dates.mjs`
- **index** (Frontend) — `src/index.css`
- **index** (Build) — `index.html`
- **main** (Frontend) — `src/main.tsx`
- **Migrations 2026-w12** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **Migrations 2026-w13** (Backend) — `supabase/migrations/20260323121718_947e033e-ded7-4dae-9824-5ff155f34faf.sql`
- **Migrations 2026-w19** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **Migrations 2026-w22** (Backend) — `supabase/migrations/20260524015102_6a9de603-5b28-4109-98fe-7e343194da37.sql`
- **parse-brief** (Verification) — `scripts/dev-wbs/parse-brief.mjs`
- **postcss.config** (Build) — `postcss.config.js`
- **reconcile-leaves** (Verification) — `scripts/dev-wbs/reconcile-leaves.mjs`
- **reconcile-scope** (Verification) — `scripts/reconcile-scope.mjs`
- **stream-heuristics** (Verification) — `scripts/dev-wbs/stream-heuristics.mjs`
- **tailwind.config** (Build) — `tailwind.config.ts`
- **tsconfig** (Build) — `tsconfig.json`
- **tsconfig.app** (Build) — `tsconfig.app.json`
- **tsconfig.node** (Build) — `tsconfig.node.json`
- **verify-e2e** (Verification) — `scripts/verify-e2e.mjs`
- **vite-env.d** (Frontend) — `src/vite-env.d.ts`
- **vite.config** (Build) — `vite.config.ts`

### 99 Cross-cutting (1)
- **shadcn UI primitives** (Frontend) — `src/components/ui/accordion.tsx`

## Brief-only leaves with no matching code (likely stale briefs or DB-only)

- **02 Portfolio & PM Home → approved-quantities.ts:loadPendingReviewCounts** — globs: `src/lib/approved-quantities.ts:loadPendingReviewCounts`
- **08 Photo Evidence → bucket: annotation-photos** — globs: `supabase/storage/annotation-photos`
- **10 Document Management → bucket: project-documents** — globs: `supabase/storage/project-documents`
- **15 Offline and Native Durability → manifest** — globs: `public/manifest.webmanifest`
- **17 Notifications & Presence → useProject.ts:421–448** — globs: `src/hooks/useProject.ts:421–448`
- **17 Notifications & Presence → Index.tsx:795** — globs: `src/pages/Index.tsx:795`
- **19 Onboarding & Tutorials → Index.tsx:~80–100** — globs: `src/pages/Index.tsx:~80–100`
- **20 Sales & Pitch → llms** — globs: `public/llms.txt`
- **20 Sales & Pitch → sitemap** — globs: `public/sitemap.xml`
- **20 Sales & Pitch → robots** — globs: `public/robots.txt`

## Files in repo that no leaf claims

- `src/App.css`

