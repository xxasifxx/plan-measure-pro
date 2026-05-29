# Dev WBS — Catalog Gaps

Generated 2026-05-29T17:07:01.174Z.

## Summary

| Stream | Total | brief+code | brief-only | code-only |
|---|---:|---:|---:|---:|
| 01 Identity & Access | 22 | 8 | 2 | 12 |
| 02 Portfolio & PM Home | 14 | 4 | 5 | 5 |
| 03 Project Onboarding | 8 | 3 | 3 | 2 |
| 04 Pay Item Catalog | 10 | 4 | 5 | 1 |
| 05 Field Capture | 16 | 4 | 9 | 3 |
| 06 Daily Report Lifecycle | 19 | 10 | 1 | 8 |
| 07 Quantity to Payment | 5 | 3 | 2 | 0 |
| 08 Photo Evidence | 8 | 3 | 4 | 1 |
| 09 Standard Specifications | 4 | 2 | 1 | 1 |
| 10 Document Management | 12 | 5 | 0 | 7 |
| 11 Schedule Management | 59 | 24 | 1 | 34 |
| 12 Project Health & Controls | 9 | 2 | 2 | 5 |
| 13 Data Export & Interoperability | 14 | 8 | 4 | 2 |
| 14 Measurement & Geometry Engine | 8 | 4 | 2 | 2 |
| 15 Offline & Native Durability | 28 | 24 | 0 | 4 |
| 16 Mobile Field Ergonomics | 13 | 6 | 7 | 0 |
| 17 Notifications & Presence | 15 | 3 | 8 | 4 |
| 18 Compliance & Audit | 26 | 1 | 12 | 13 |
| 19 Onboarding & Tutorials | 11 | 4 | 7 | 0 |
| 20 Sales & Pitch | 22 | 7 | 7 | 8 |
| 97 Plumbing | 26 | 0 | 0 | 26 |
| 98 Build & Infra | 67 | 0 | 0 | 67 |
| 99 Cross-cutting | 1 | 0 | 0 | 1 |

**Totals:** 417 leaves — 129 brief+code, 82 brief-only, 206 code-only.

## Code-only leaves (brief is silent on this)

These represent work that happened but no brief acceptance criterion names it. Each is a hint that the corresponding stream brief is undercounting plumbing.

### 01 Identity & Access (12)
- **Admin** (Frontend) — `src/pages/Admin.tsx`
- **enum: app_role** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **fn(db): accept_invitation** (Backend) — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- **fn(db): assign_owner_role** (Backend) — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- **fn(db): handle_new_user** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **fn(db): has_role** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **fn(db): seed_demo_users** (Backend) — `supabase/migrations/20260529041918_637a0229-3683-4419-9838-890b4e588b31.sql`
- **rls: invitations** (Backend) — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- **rls: profiles** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **rls: user_roles** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **Settings** (Frontend) — `src/pages/Settings.tsx`
- **TeamManager** (Frontend) — `src/components/TeamManager.tsx`

### 02 Portfolio & PM Home (5)
- **fn(db): is_project_member** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **rls: project_members** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **rls: projects** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **trg: projects.trg_projects_seed_folders** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **trg: projects.update_projects_updated_at** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### 03 Project Onboarding (2)
- **fn(db): projects_seed_folders** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **fn(db): seed_project_standard_folders** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`

### 04 Pay Item Catalog (1)
- **rls: pay_items** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### 05 Field Capture (3)
- **bucket: project-pdfs** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **rls: annotations** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **rls: calibrations** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### 06 Daily Report Lifecycle (8)
- **fn(db): daily_reports_status_side_effects** (Backend) — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- **fn(db): daily_reports_status_transition** (Backend) — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- **rls: daily_report_comments** (Backend) — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- **rls: daily_report_snapshots** (Backend) — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- **rls: daily_reports** (Backend) — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- **trg: daily_reports.trg_daily_reports_status_side_effects** (Backend) — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- **trg: daily_reports.trg_daily_reports_status_transition** (Backend) — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- **trg: daily_reports.update_daily_reports_updated_at** (Backend) — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`

### 08 Photo Evidence (1)
- **rls: annotation_photos** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`

### 09 Standard Specifications (1)
- **bucket: specs-pdfs** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### 10 Document Management (7)
- **fn(db): document_folders_block_nonempty_delete** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **rls: document_folders** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **rls: documents** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **storage** (Frontend) — `src/lib/storage.ts`
- **trg: document_folders.trg_document_folders_block_nonempty** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **trg: document_folders.trg_document_folders_updated** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **trg: documents.trg_documents_updated** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`

### 11 Schedule Management (34)
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
- **enum: resource_type** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **fn: parse-schedule** (Backend) — `supabase/functions/parse-schedule/index.ts`
- **fn(db): capture_baseline** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **fn(db): delete_baseline** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **fn(db): replace_project_schedule** (Backend) — `supabase/migrations/20260526114744_9262b81e-12b7-4ca4-a3c8-d39802232caf.sql`
- **fn(db): schedule_activities_validate_constraint** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **rls: activity_assignments** (Backend) — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- **rls: activity_pay_items** (Backend) — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- **rls: activity_relationships** (Backend) — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- **rls: activity_resource_assignments** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **rls: baseline_activities** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **rls: project_schedule_meta** (Backend) — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- **rls: schedule_activities** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **rls: schedule_baselines** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **rls: schedule_calendars** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **rls: schedule_resources** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **ScheduleToolbar** (Frontend) — `src/components/schedule/ScheduleToolbar.tsx`
- **trg: activity_resource_assignments.trg_ara_updated** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **trg: project_schedule_meta.update_project_schedule_meta_updated_at** (Backend) — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- **trg: schedule_activities.trg_sched_act_updated** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **trg: schedule_activities.trg_schedule_activities_validate_constraint** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **trg: schedule_calendars.trg_schedule_calendars_updated** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **trg: schedule_resources.trg_schedule_resources_updated** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`

### 12 Project Health & Controls (5)
- **db: rocks** (Backend) — `public.rocks`
- **db: scorecard_metrics** (Backend) — `public.scorecard_metrics`
- **rls: rocks** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **rls: scorecard_metrics** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **trg: rocks.trg_rocks_updated** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`

### 13 Data Export & Interoperability (2)
- **sample** (Frontend) — `src/lib/p6xml/sample.ts`
- **takeoffpro-dev** (Frontend) — `public/exports/takeoffpro-dev.xml`

### 14 Measurement & Geometry Engine (2)
- **db: geo_calibrations** (Backend) — `public.geo_calibrations`
- **rls: geo_calibrations** (Backend) — `supabase/migrations/20260327122843_6f261706-ce0b-4c8a-b707-c3c8b0648540.sql`

### 15 Offline & Native Durability (4)
- **app-icon-master** (Frontend) — `src/assets/app-icon-master.png`
- **apple-touch-icon** (Frontend) — `public/apple-touch-icon.png`
- **favicon** (Frontend) — `public/favicon.ico`
- **favicon-32** (Frontend) — `public/favicon-32.png`

### 17 Notifications & Presence (4)
- **db: device_tokens** (Backend) — `public.device_tokens`
- **db: notifications** (Backend) — `public.notifications`
- **rls: device_tokens** (Backend) — `supabase/migrations/20260526015440_e7d9bc81-0db3-4acd-88f7-ff486798a2b2.sql`
- **rls: notifications** (Backend) — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`

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

### 20 Sales & Pitch (8)
- **blueprint-plans** (Frontend) — `src/assets/blueprint-plans.jpg`
- **db: demo_requests** (Backend) — `public.demo_requests`
- **gps-field-measurement** (Frontend) — `src/assets/gps-field-measurement.jpg`
- **hero-product-shot** (Frontend) — `src/assets/hero-product-shot.png`
- **hero-screenshot** (Frontend) — `src/assets/hero-screenshot.jpg`
- **highway-construction-aerial** (Frontend) — `src/assets/highway-construction-aerial.jpg`
- **inspector-tablet** (Frontend) — `src/assets/inspector-tablet.jpg`
- **rls: demo_requests** (Backend) — `supabase/migrations/20260328182512_208ba41b-5292-403a-baf4-9b9b2d158879.sql`

### 97 Plumbing (26)
- **admin** (Frontend) — `public/fajar/admin.png`
- **client** (Frontend) — `src/integrations/supabase/client.ts`
- **ConfirmDialog** (Frontend) — `src/components/ConfirmDialog.tsx`
- **EmptyState** (Frontend) — `src/components/EmptyState.tsx`
- **fn(db): handle_new_user_role** (Backend) — `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`
- **fn(db): update_updated_at_column** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **listing** (Frontend) — `public/fajar/listing.png`
- **machine-detail** (Frontend) — `public/fajar/machine-detail.png`
- **mobile-booking** (Frontend) — `public/fajar/mobile-booking.png`
- **NavLink** (Frontend) — `src/components/NavLink.tsx`
- **NotFound** (Frontend) — `src/pages/NotFound.tsx`
- **placeholder** (Frontend) — `public/placeholder.svg`
- **pwa-192** (Frontend) — `public/pwa-192.png`
- **pwa-512** (Frontend) — `public/pwa-512.png`
- **rls: accessible** (Backend) — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- **rls: photos** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **rls: realtime** (Backend) — `supabase/migrations/20260526121114_08c40dcb-7912-41d8-bc1d-3668026265ac.sql`
- **rls: storage** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **seed** (Backend) — `supabase/seed.sql`
- **serp** (Frontend) — `public/fajar/serp.png`
- **trg: auth.on_auth_user_created** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **trg: auth.on_auth_user_created_profile** (Backend) — `supabase/migrations/20260321162349_089b7eac-a691-474e-96f4-b97ab4d2581d.sql`
- **trg: auth.on_auth_user_created_role** (Backend) — `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`
- **use-toast** (Frontend) — `src/hooks/use-toast.ts`
- **useTheme** (Frontend) — `src/hooks/useTheme.ts`
- **utils** (Frontend) — `src/lib/utils.ts`

### 98 Build & Infra (67)
- **apply-depth-patches** (Verification) — `scripts/apply-depth-patches.mjs`
- **build-code-leaves** (Verification) — `scripts/dev-wbs/build-code-leaves.mjs`
- **build-db-surface-leaves** (Verification) — `scripts/dev-wbs/build-db-surface-leaves.mjs`
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
- **migration: 2026-03-21 089b7eac-a691-474e-96f4-b97ab4d2581d** (Backend) — `supabase/migrations/20260321162349_089b7eac-a691-474e-96f4-b97ab4d2581d.sql`
- **migration: 2026-03-21 127eb40b-40a6-4814-b6cc-ed2f3acd27f2** (Backend) — `supabase/migrations/20260321164809_127eb40b-40a6-4814-b6cc-ed2f3acd27f2.sql`
- **migration: 2026-03-21 22a25531-f789-4f47-b2d5-ec7d40196497** (Backend) — `supabase/migrations/20260321162408_22a25531-f789-4f47-b2d5-ec7d40196497.sql`
- **migration: 2026-03-21 749c9dcd-0ffa-430d-bf20-422872294f47** (Backend) — `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`
- **migration: 2026-03-21 75de1f7c-2825-40a9-b86e-f031966b835e** (Backend) — `supabase/migrations/20260321170227_75de1f7c-2825-40a9-b86e-f031966b835e.sql`
- **migration: 2026-03-21 88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550** (Backend) — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- **migration: 2026-03-21 c4804e7a-cb2d-4898-be1d-27ba7694c893** (Backend) — `supabase/migrations/20260321162713_c4804e7a-cb2d-4898-be1d-27ba7694c893.sql`
- **migration: 2026-03-21 fadd3bba-4f5e-4ac1-b47b-3887bdd98769** (Backend) — `supabase/migrations/20260321164313_fadd3bba-4f5e-4ac1-b47b-3887bdd98769.sql`
- **migration: 2026-03-23 702975d9-3680-45b2-9a82-8587db5f26e5** (Backend) — `supabase/migrations/20260323184019_702975d9-3680-45b2-9a82-8587db5f26e5.sql`
- **migration: 2026-03-23 947e033e-ded7-4dae-9824-5ff155f34faf** (Backend) — `supabase/migrations/20260323121718_947e033e-ded7-4dae-9824-5ff155f34faf.sql`
- **migration: 2026-03-23 a351e076-b680-476d-b06d-1b2165092b26** (Backend) — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- **migration: 2026-03-27 6f261706-ce0b-4c8a-b707-c3c8b0648540** (Backend) — `supabase/migrations/20260327122843_6f261706-ce0b-4c8a-b707-c3c8b0648540.sql`
- **migration: 2026-03-28 208ba41b-5292-403a-baf4-9b9b2d158879** (Backend) — `supabase/migrations/20260328182512_208ba41b-5292-403a-baf4-9b9b2d158879.sql`
- **migration: 2026-05-04 3462a0a5-a4a5-4f17-8272-83c40fa4e039** (Backend) — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- **migration: 2026-05-05 f50b6c32-d0b3-42dd-9336-494143f5a389** (Backend) — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- **migration: 2026-05-24 197a36b0-b223-4c6d-a3b6-73dd795f14de** (Backend) — `supabase/migrations/20260524230947_197a36b0-b223-4c6d-a3b6-73dd795f14de.sql`
- **migration: 2026-05-24 27a28235-ea50-4c3c-be4a-528f35665ed2** (Backend) — `supabase/migrations/20260524172951_27a28235-ea50-4c3c-be4a-528f35665ed2.sql`
- **migration: 2026-05-24 345bb077-7543-4a05-9ef8-c474d5276b1f** (Backend) — `supabase/migrations/20260524173937_345bb077-7543-4a05-9ef8-c474d5276b1f.sql`
- **migration: 2026-05-24 5034e85e-37ad-4471-bb00-017b17d673ee** (Backend) — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- **migration: 2026-05-24 68108104-7e60-4587-a574-eeef24c30253** (Backend) — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- **migration: 2026-05-24 6a9de603-5b28-4109-98fe-7e343194da37** (Backend) — `supabase/migrations/20260524015102_6a9de603-5b28-4109-98fe-7e343194da37.sql`
- **migration: 2026-05-24 75af5978-5463-48f0-894d-a5ff9931868e** (Backend) — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- **migration: 2026-05-24 aa3b520a-cfe2-4510-b710-0caf0809bc7f** (Backend) — `supabase/migrations/20260524182507_aa3b520a-cfe2-4510-b710-0caf0809bc7f.sql`
- **migration: 2026-05-24 bd7b1203-22ec-46f0-8c88-3c4208a05c7d** (Backend) — `supabase/migrations/20260524015158_bd7b1203-22ec-46f0-8c88-3c4208a05c7d.sql`
- **migration: 2026-05-24 cd76e27d-fda9-4f8b-aac8-c875aa100937** (Backend) — `supabase/migrations/20260524173747_cd76e27d-fda9-4f8b-aac8-c875aa100937.sql`
- **migration: 2026-05-25 e34bfccb-6eb4-4a47-b075-1f9c628559da** (Backend) — `supabase/migrations/20260525163245_e34bfccb-6eb4-4a47-b075-1f9c628559da.sql`
- **migration: 2026-05-26 08c40dcb-7912-41d8-bc1d-3668026265ac** (Backend) — `supabase/migrations/20260526121114_08c40dcb-7912-41d8-bc1d-3668026265ac.sql`
- **migration: 2026-05-26 4709d075-1bb1-44b9-ae5f-3edc62bcd171** (Backend) — `supabase/migrations/20260526021443_4709d075-1bb1-44b9-ae5f-3edc62bcd171.sql`
- **migration: 2026-05-26 7d5d3850-b410-4d77-ad92-1f2f0e524b65** (Backend) — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- **migration: 2026-05-26 9262b81e-12b7-4ca4-a3c8-d39802232caf** (Backend) — `supabase/migrations/20260526114744_9262b81e-12b7-4ca4-a3c8-d39802232caf.sql`
- **migration: 2026-05-26 dea32198-fe8d-4add-89e7-7aca7ad513b7** (Backend) — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- **migration: 2026-05-26 e7d9bc81-0db3-4acd-88f7-ff486798a2b2** (Backend) — `supabase/migrations/20260526015440_e7d9bc81-0db3-4acd-88f7-ff486798a2b2.sql`
- **migration: 2026-05-26 e82b22fa-1dac-434e-942a-e18387a3c065** (Backend) — `supabase/migrations/20260526114820_e82b22fa-1dac-434e-942a-e18387a3c065.sql`
- **migration: 2026-05-28 1fea17ca-9deb-4078-8173-ee3e52b6eab6** (Backend) — `supabase/migrations/20260528155928_1fea17ca-9deb-4078-8173-ee3e52b6eab6.sql`
- **migration: 2026-05-28 44c52ae9-d9c8-4390-8dde-0367583b44ef** (Backend) — `supabase/migrations/20260528155528_44c52ae9-d9c8-4390-8dde-0367583b44ef.sql`
- **migration: 2026-05-29 637a0229-3683-4419-9838-890b4e588b31** (Backend) — `supabase/migrations/20260529041918_637a0229-3683-4419-9838-890b4e588b31.sql`
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
- **17 Notifications & Presence → useProject.ts:421–448** — globs: `src/hooks/useProject.ts:421–448`
- **17 Notifications & Presence → Index.tsx:795** — globs: `src/pages/Index.tsx:795`
- **19 Onboarding & Tutorials → Index.tsx:~80–100** — globs: `src/pages/Index.tsx:~80–100`

## Files in repo that no leaf claims

- `src/App.css`

