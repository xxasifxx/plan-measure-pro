# Dev WBS — Canonical Leaves

Generated 2026-05-29T17:07:01.163Z · **417 leaves** across 23 streams.

Provenance:
- **brief+code** (129) — a brief mentioned it and code confirms it.
- **brief-only** (82) — brief named it but no matching code found (could be stale brief or DB-only feature).
- **code-only** (206) — code exists but no brief acceptance criterion mentions it.

## 01 Identity & Access — 22 leaves
### Frontend (8)
- `code-only` **Admin** — `src/pages/Admin.tsx`
- `brief+code` **App** — `src/App.tsx`
- `brief+code` **Auth** — `src/pages/Auth.tsx`
- `brief+code` **ResetPassword** — `src/pages/ResetPassword.tsx`
- `brief-only` **RLS posture** — 
- `code-only` **Settings** — `src/pages/Settings.tsx`
- `code-only` **TeamManager** — `src/components/TeamManager.tsx`
- `brief+code` **useAuth** — `src/hooks/useAuth.tsx`

### Backend (13)
- `brief+code` **db: invitations** — `public.invitations`
- `brief+code` **db: profiles** — `public.profiles`
- `brief+code` **db: user_roles** — `public.user_roles`
- `code-only` **enum: app_role** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `brief+code` **fn: invite-user** — `supabase/functions/invite-user/`, `supabase/functions/invite-user/index.ts`
- `code-only` **fn(db): accept_invitation** — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- `code-only` **fn(db): assign_owner_role** — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- `code-only` **fn(db): handle_new_user** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260323121718_947e033e-ded7-4dae-9824-5ff155f34faf.sql`
- `code-only` **fn(db): has_role** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `code-only` **fn(db): seed_demo_users** — `supabase/migrations/20260529041918_637a0229-3683-4419-9838-890b4e588b31.sql`
- `code-only` **rls: invitations** — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- `code-only` **rls: profiles** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260321162713_c4804e7a-cb2d-4898-be1d-27ba7694c893.sql`, `supabase/migrations/20260323184019_702975d9-3680-45b2-9a82-8587db5f26e5.sql` _(+2)_
- `code-only` **rls: user_roles** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### Mobile (1)
- `brief-only` **BiometricGate** — `src/components/BiometricGate.tsx`

## 02 Portfolio & PM Home — 14 leaves
### Frontend (6)
- `brief-only` **approved-quantities.ts:loadPendingReviewCounts** — `src/lib/approved-quantities.ts:loadPendingReviewCounts`
- `brief+code` **Dashboard** — `src/pages/Dashboard.tsx`
- `brief-only` **GuidedTour** — `src/components/GuidedTour.tsx`
- `brief-only` **NotificationBell** — `src/components/NotificationBell.tsx`
- `brief+code` **useProjects** — `src/hooks/useProjects.ts`
- `brief-only` **WelcomeCarousel** — `src/components/WelcomeCarousel.tsx`

### Backend (8)
- `brief-only` **db: annotations** — `public.annotations`
- `brief+code` **db: project_members** — `public.project_members`
- `brief+code` **db: projects** — `public.projects`
- `code-only` **fn(db): is_project_member** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `code-only` **rls: project_members** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260321162713_c4804e7a-cb2d-4898-be1d-27ba7694c893.sql`
- `code-only` **rls: projects** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260321162713_c4804e7a-cb2d-4898-be1d-27ba7694c893.sql`
- `code-only` **trg: projects.trg_projects_seed_folders** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **trg: projects.update_projects_updated_at** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

## 03 Project Onboarding — 8 leaves
### Frontend (5)
- `brief-only` **Create project / PDF upload** — `src/hooks/useProjects.ts`
- `brief+code` **Load with offline fallback** — `src/pages/Index.tsx`
- `brief-only` **Pay-item import** — 
- `brief+code` **ProjectSidebar** — `src/components/ProjectSidebar.tsx`
- `brief+code` **TOC / pay-items survive reload** — `src/hooks/useProject.ts`

### Backend (3)
- `brief-only` **db: projects.specs_storage_path** — `public.projects.specs_storage_path`
- `code-only` **fn(db): projects_seed_folders** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **fn(db): seed_project_standard_folders** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`

## 04 Pay Item Catalog — 10 leaves
### Frontend (7)
- `brief-only` **Contract modifications** — 
- `brief-only` **Contract quantity denominator** — 
- `brief-only` **Delete cascade** — `src/components/ProjectSidebar.tsx`, `src/hooks/useProject.ts`
- `brief+code` **project** — `src/types/project.ts`
- `brief+code` **Section-keyed colors** — `src/lib/pdf-utils.ts`
- `brief-only` **SummaryPanel** — `src/components/SummaryPanel.tsx`
- `brief+code` **usePayItemActivityMap** — `src/hooks/usePayItemActivityMap.ts`

### Backend (2)
- `brief+code` **db: pay_items** — `public.pay_items`
- `code-only` **rls: pay_items** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### Mobile (1)
- `brief-only` **MobilePayItems** — `src/components/MobilePayItems.tsx`

## 05 Field Capture — 16 leaves
### Frontend (9)
- `brief-only` **geo-transform** — `src/lib/geo-transform.ts`
- `brief-only` **geometry** — `src/lib/geometry.ts`
- `brief-only` **GpsCalibration** — `src/components/GpsCalibration.tsx`
- `brief-only` **GpsTraceControls** — `src/components/GpsTraceControls.tsx`
- `brief-only` **Index** — `src/pages/Index.tsx`
- `brief+code` **PdfCanvas** — `src/components/PdfCanvas.tsx`
- `brief-only` **project** — `src/types/project.ts`
- `brief+code` **Toolbar** — `src/components/Toolbar.tsx`
- `brief-only` **useProject** — `src/hooks/useProject.ts`

### Backend (5)
- `code-only` **bucket: project-pdfs** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `brief+code` **db: annotations** — `public.annotations`
- `brief+code` **db: calibrations** — `public.calibrations`
- `code-only` **rls: annotations** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `code-only` **rls: calibrations** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`

### Mobile (2)
- `brief-only` **MobileAnnotationSheet** — `src/components/MobileAnnotationSheet.tsx`
- `brief-only` **MobileToolbar** — `src/components/MobileToolbar.tsx`

## 06 Daily Report Lifecycle — 19 leaves
### Frontend (7)
- `brief+code` **daily-report-snapshot** — `src/lib/daily-report-snapshot.ts`
- `brief+code` **DailyReport** — `src/pages/DailyReport.tsx`
- `brief+code` **ReRejectDialog** — `src/components/ReRejectDialog.tsx`
- `brief+code` **ReReview** — `src/pages/ReReview.tsx`
- `brief+code` **ReReviewCard** — `src/components/ReReviewCard.tsx`
- `brief+code` **useDailyReport** — `src/hooks/useDailyReport.ts`
- `brief+code` **useReReviewQueue** — `src/hooks/useReReviewQueue.ts`

### Backend (12)
- `brief+code` **db: daily_report_comments** — `public.daily_report_comments`
- `brief+code` **db: daily_report_snapshots** — `public.daily_report_snapshots`
- `brief+code` **db: daily_reports** — `public.daily_reports`
- `brief-only` **db: v_approved_pay_item_quantities** — `public.v_approved_pay_item_quantities`
- `code-only` **fn(db): daily_reports_status_side_effects** — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- `code-only` **fn(db): daily_reports_status_transition** — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`, `supabase/migrations/20260524173747_cd76e27d-fda9-4f8b-aac8-c875aa100937.sql`, `supabase/migrations/20260524173937_345bb077-7543-4a05-9ef8-c474d5276b1f.sql`
- `code-only` **rls: daily_report_comments** — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`, `supabase/migrations/20260524230947_197a36b0-b223-4c6d-a3b6-73dd795f14de.sql`
- `code-only` **rls: daily_report_snapshots** — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- `code-only` **rls: daily_reports** — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`, `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`, `supabase/migrations/20260524173937_345bb077-7543-4a05-9ef8-c474d5276b1f.sql`
- `code-only` **trg: daily_reports.trg_daily_reports_status_side_effects** — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- `code-only` **trg: daily_reports.trg_daily_reports_status_transition** — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`, `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- `code-only` **trg: daily_reports.update_daily_reports_updated_at** — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`

## 07 Quantity to Payment — 5 leaves
### Frontend (4)
- `brief+code` **approved-quantities** — `src/lib/approved-quantities.ts`
- `brief-only` **export-utils** — `src/lib/export-utils.ts`
- `brief-only` **ProjectControls** — `src/pages/ProjectControls.tsx`
- `brief+code` **SummaryPanel** — `src/components/SummaryPanel.tsx`

### Backend (1)
- `brief+code` **db: v_approved_pay_item_quantities** — `public.v_approved_pay_item_quantities`

## 08 Photo Evidence — 8 leaves
### Frontend (1)
- `brief-only` **ProjectControls** — `src/pages/ProjectControls.tsx`

### Backend (4)
- `brief+code` **bucket: annotation-photos** — `supabase/storage/annotation-photos`, `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- `brief+code` **db: annotation_photos** — `public.annotation_photos`
- `brief+code` **fn: tag-photo** — `supabase/functions/tag-photo/index.ts`
- `code-only` **rls: annotation_photos** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`

### Mobile (3)
- `brief-only` **camera** — `src/lib/native/camera.ts`
- `brief-only` **db** — `src/lib/offline/db.ts`
- `brief-only` **mutation-client** — `src/lib/offline/mutation-client.ts`

## 09 Standard Specifications — 4 leaves
### Frontend (2)
- `brief+code` **specs-utils** — `src/lib/specs-utils.ts`
- `brief+code` **SpecViewer** — `src/components/SpecViewer.tsx`

### Backend (2)
- `code-only` **bucket: specs-pdfs** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `brief-only` **db: projects.specs_storage_path** — `public.projects.specs_storage_path`

## 10 Document Management — 12 leaves
### Frontend (3)
- `brief+code` **Documents** — `src/pages/Documents.tsx`
- `code-only` **storage** — `src/lib/storage.ts`
- `brief+code` **useDocuments** — `src/hooks/useDocuments.ts`

### Backend (9)
- `brief+code` **bucket: project-documents** — `supabase/storage/project-documents`, `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `brief+code` **db: document_folders** — `public.document_folders`
- `brief+code` **db: documents** — `public.documents`
- `code-only` **fn(db): document_folders_block_nonempty_delete** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **rls: document_folders** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **rls: documents** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **trg: document_folders.trg_document_folders_block_nonempty** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **trg: document_folders.trg_document_folders_updated** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **trg: documents.trg_documents_updated** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`

## 11 Schedule Management — 59 leaves
### Frontend (27)
- `brief+code` **aace** — `src/lib/schedule/analysis/aace.ts`
- `brief+code` **ActivityInspector** — `src/components/schedule/ActivityInspector.tsx`
- `brief+code` **baseline** — `src/lib/schedule/baseline.ts`
- `brief+code` **BaselineManager** — `src/components/schedule/BaselineManager.tsx`
- `brief+code` **CalendarManager** — `src/components/schedule/CalendarManager.tsx`
- `brief+code` **calendars** — `src/lib/schedule/calendars.ts`
- `brief+code` **chart-export** — `src/lib/schedule/analysis/chart-export.ts`
- `brief+code` **ComplianceStrip** — `src/components/schedule/ComplianceStrip.tsx`
- `brief+code` **cpm** — `src/lib/schedule/cpm.ts`
- `code-only` **date-utils** — `src/lib/schedule/date-utils.ts`
- `brief+code` **dcma** — `src/lib/schedule/analysis/dcma.ts`
- `brief+code` **DcmaPanel** — `src/components/schedule/DcmaPanel.tsx`
- `brief+code` **feedback** — `src/lib/schedule/analysis/feedback.ts`
- `brief+code` **GanttChart** — `src/components/schedule/GanttChart.tsx`
- `brief+code` **import-p6** — `src/lib/schedule/import-p6.ts`
- `brief+code` **ImportP6Panel** — `src/components/schedule/ImportP6Panel.tsx`
- `brief+code` **memo-export** — `src/lib/schedule/analysis/memo-export.ts`
- `brief+code` **MetaControls** — `src/components/schedule/MetaControls.tsx`
- `brief-only` **parser** — `src/lib/p6xml/parser.ts`
- `brief+code` **progress** — `src/lib/schedule/analysis/progress.ts`
- `brief+code` **ResourceManager** — `src/components/schedule/ResourceManager.tsx`
- `code-only` **ScheduleToolbar** — `src/components/schedule/ScheduleToolbar.tsx`
- `brief+code` **ScheduleWorkspace** — `src/components/schedule/ScheduleWorkspace.tsx`
- `brief+code` **tia** — `src/lib/schedule/analysis/tia.ts`
- `brief+code` **types** — `src/lib/schedule/types.ts`
- `brief+code` **use-schedule** — `src/lib/schedule/use-schedule.ts`
- `brief+code` **WbsTree** — `src/components/schedule/WbsTree.tsx`

### Backend (32)
- `code-only` **db: activity_assignments** — `public.activity_assignments`
- `code-only` **db: activity_pay_items** — `public.activity_pay_items`
- `code-only` **db: activity_relationships** — `public.activity_relationships`
- `code-only` **db: activity_resource_assignments** — `public.activity_resource_assignments`
- `code-only` **db: baseline_activities** — `public.baseline_activities`
- `code-only` **db: project_schedule_meta** — `public.project_schedule_meta`
- `code-only` **db: schedule_activities** — `public.schedule_activities`
- `code-only` **db: schedule_baselines** — `public.schedule_baselines`
- `code-only` **db: schedule_calendars** — `public.schedule_calendars`
- `code-only` **db: schedule_resources** — `public.schedule_resources`
- `code-only` **enum: resource_type** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **fn: parse-schedule** — `supabase/functions/parse-schedule/index.ts`
- `code-only` **fn(db): capture_baseline** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **fn(db): delete_baseline** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **fn(db): replace_project_schedule** — `supabase/migrations/20260526114744_9262b81e-12b7-4ca4-a3c8-d39802232caf.sql`, `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`, `supabase/migrations/20260529041918_637a0229-3683-4419-9838-890b4e588b31.sql`
- `code-only` **fn(db): schedule_activities_validate_constraint** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **rls: activity_assignments** — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- `code-only` **rls: activity_pay_items** — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- `code-only` **rls: activity_relationships** — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- `code-only` **rls: activity_resource_assignments** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **rls: baseline_activities** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **rls: project_schedule_meta** — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- `code-only` **rls: schedule_activities** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- `code-only` **rls: schedule_baselines** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **rls: schedule_calendars** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **rls: schedule_resources** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **trg: activity_resource_assignments.trg_ara_updated** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **trg: project_schedule_meta.update_project_schedule_meta_updated_at** — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- `code-only` **trg: schedule_activities.trg_sched_act_updated** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- `code-only` **trg: schedule_activities.trg_schedule_activities_validate_constraint** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **trg: schedule_calendars.trg_schedule_calendars_updated** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **trg: schedule_resources.trg_schedule_resources_updated** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`

## 12 Project Health and Controls — 9 leaves
### Frontend (4)
- `brief+code` **GanttUploader** — `src/components/GanttUploader.tsx`
- `brief-only` **project** — `src/types/project.ts`
- `brief+code` **ProjectControls** — `src/pages/ProjectControls.tsx`
- `brief-only` **ScheduleWorkspace** — `src/components/schedule/ScheduleWorkspace.tsx`

### Backend (5)
- `code-only` **db: rocks** — `public.rocks`
- `code-only` **db: scorecard_metrics** — `public.scorecard_metrics`
- `code-only` **rls: rocks** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- `code-only` **rls: scorecard_metrics** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- `code-only` **trg: rocks.trg_rocks_updated** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`

## 13 Data Export and Interoperability — 14 leaves
### Frontend (13)
- `brief+code` **apply-progress** — `src/lib/p6xml/apply-progress.ts`
- `brief-only` **approved-quantities** — `src/lib/approved-quantities.ts`
- `brief+code` **build-from-project** — `src/lib/p6xml/build-from-project.ts`
- `brief+code` **export-utils** — `src/lib/export-utils.ts`
- `brief+code` **load-approved** — `src/lib/p6xml/load-approved.ts`
- `brief+code` **P6Export** — `src/pages/P6Export.tsx`
- `brief+code` **parser** — `src/lib/p6xml/parser.ts`
- `brief-only` **pdf-utils** — `src/lib/pdf-utils.ts`
- `code-only` **sample** — `src/lib/p6xml/sample.ts`
- `brief+code` **serializer** — `src/lib/p6xml/serializer.ts`
- `code-only` **takeoffpro-dev** — `public/exports/takeoffpro-dev.xml`
- `brief+code` **types** — `src/lib/p6xml/types.ts`
- `brief-only` **usePayItemActivityMap** — `src/hooks/usePayItemActivityMap.ts`

### Mobile (1)
- `brief-only` **filesystem** — `src/lib/native/filesystem.ts`

## 14 Measurement and Geometry Engine — 8 leaves
### Frontend (6)
- `brief+code` **geo-transform** — `src/lib/geo-transform.ts`
- `brief+code` **geometry** — `src/lib/geometry.ts`
- `brief+code` **GpsCalibration** — `src/components/GpsCalibration.tsx`
- `brief+code` **GpsTraceControls** — `src/components/GpsTraceControls.tsx`
- `brief-only` **PdfCanvas** — `src/components/PdfCanvas.tsx`
- `brief-only` **useProject** — `src/hooks/useProject.ts`

### Backend (2)
- `code-only` **db: geo_calibrations** — `public.geo_calibrations`
- `code-only` **rls: geo_calibrations** — `supabase/migrations/20260327122843_6f261706-ce0b-4c8a-b707-c3c8b0648540.sql`, `supabase/migrations/20260528155528_44c52ae9-d9c8-4390-8dde-0367583b44ef.sql`

## 15 Offline and Native Durability — 28 leaves
### Frontend (8)
- `code-only` **app-icon-master** — `src/assets/app-icon-master.png`
- `code-only` **apple-touch-icon** — `public/apple-touch-icon.png`
- `code-only` **favicon** — `public/favicon.ico`
- `code-only` **favicon-32** — `public/favicon-32.png`
- `brief+code` **pwa** — `src/lib/pwa.ts`
- `brief+code` **SyncPanel** — `src/components/SyncPanel.tsx`
- `brief+code` **useNetworkStatus** — `src/hooks/useNetworkStatus.ts`
- `brief+code` **useOutbox** — `src/hooks/useOutbox.ts`

### Mobile (18)
- `brief+code` **app-state** — `src/lib/native/app-state.ts`
- `brief+code` **background-sync** — `src/lib/native/background-sync.ts`
- `brief+code` **biometric** — `src/lib/native/biometric.ts`
- `brief+code` **BiometricGate** — `src/components/BiometricGate.tsx`
- `brief+code` **camera** — `src/lib/native/camera.ts`
- `brief+code` **db** — `src/lib/offline/db.ts`
- `brief+code` **filesystem** — `src/lib/native/filesystem.ts`
- `brief+code` **geolocation** — `src/lib/native/geolocation.ts`
- `brief+code` **idb-persister** — `src/lib/offline/idb-persister.ts`
- `brief+code` **mirror** — `src/lib/offline/mirror.ts`
- `brief+code` **mutation-client** — `src/lib/offline/mutation-client.ts`
- `brief+code` **NativeFirstRun** — `src/components/NativeFirstRun.tsx`
- `brief+code` **outbox** — `src/lib/offline/outbox.ts`
- `brief+code` **pdf-cache** — `src/lib/offline/pdf-cache.ts`
- `brief+code` **platform** — `src/lib/native/platform.ts`
- `brief+code` **push** — `src/lib/native/push.ts`
- `brief+code` **PwaShell** — `src/components/PwaShell.tsx`
- `brief+code` **sync** — `src/lib/offline/sync.ts`

### Docs (2)
- `brief+code` **capacitor.config** — `capacitor.config.ts`
- `brief+code` **manifest** — `public/manifest.webmanifest`

## 16 Mobile Field Ergonomics — 13 leaves
### Frontend (8)
- `brief-only` **Active pay item chip** — 
- `brief-only` **Badge counts** — 
- `brief-only` **Calibration chip tap** — 
- `brief-only` **Demo** — `src/pages/Demo.tsx`
- `brief-only` **Index** — `src/pages/Index.tsx`
- `brief-only` **Tab switching / PDF persistence** — 
- `brief+code` **use-mobile** — `src/hooks/use-mobile.tsx`
- `brief-only` **Zoom clamp** — 

### Mobile (5)
- `brief+code` **MobileAnnotationSheet** — `src/components/MobileAnnotationSheet.tsx`
- `brief+code` **MobilePayItems** — `src/components/MobilePayItems.tsx`
- `brief+code` **MobileSections** — `src/components/MobileSections.tsx`
- `brief+code` **MobileTabBar** — `src/components/MobileTabBar.tsx`
- `brief+code` **MobileToolbar** — `src/components/MobileToolbar.tsx`

## 17 Notifications & Presence — 15 leaves
### Frontend (9)
- `brief-only` **Bell + realtime subscribe** — 
- `brief-only` **Index.tsx:795** — `src/pages/Index.tsx:795`
- `brief-only` **markRead / markAllRead** — 
- `brief-only` **Navigation on click** — 
- `brief+code` **NotificationBell** — `src/components/NotificationBell.tsx`
- `brief-only` **Presence / online users** — 
- `brief-only` **send-push edge function** — 
- `brief+code` **useNotifications** — `src/hooks/useNotifications.ts`
- `brief-only` **useProject.ts:421–448** — `src/hooks/useProject.ts:421–448`

### Backend (5)
- `code-only` **db: device_tokens** — `public.device_tokens`
- `code-only` **db: notifications** — `public.notifications`
- `brief+code` **fn: send-push** — `supabase/functions/send-push/index.ts`
- `code-only` **rls: device_tokens** — `supabase/migrations/20260526015440_e7d9bc81-0db3-4acd-88f7-ff486798a2b2.sql`
- `code-only` **rls: notifications** — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`

### Mobile (1)
- `brief-only` **push** — `src/lib/native/push.ts`

## 18 Compliance & Audit — 26 leaves
### Frontend (13)
- `brief-only` **Approve/reject timestamps + reviewer** — 
- `brief-only` **ComplianceStrip** — `src/components/schedule/ComplianceStrip.tsx`
- `brief-only` **dcma** — `src/lib/schedule/analysis/dcma.ts`
- `brief-only` **DcmaPanel** — `src/components/schedule/DcmaPanel.tsx`
- `brief-only` **Drift detection** — 
- `brief-only` **Negative lag / M-code check** — 
- `brief-only` **ReRejectDialog** — `src/components/ReRejectDialog.tsx`
- `brief-only` **ReReview** — `src/pages/ReReview.tsx`
- `brief-only` **ReReviewCard** — `src/components/ReReviewCard.tsx`
- `brief-only` **Snapshot freeze** — 
- `brief+code` **types** — `src/integrations/supabase/types.ts`
- `brief-only` **useDailyReport** — `src/hooks/useDailyReport.ts`
- `brief-only` **useReReviewQueue** — `src/hooks/useReReviewQueue.ts`

### Verification (13)
- `code-only` **analysis-dcma.test** — `src/test/analysis-dcma.test.ts`
- `code-only` **analysis-tia.test** — `src/test/analysis-tia.test.ts`
- `code-only` **baseline-end.test** — `src/test/baseline-end.test.ts`
- `code-only` **cpm.test** — `src/test/cpm.test.ts`
- `code-only` **daily-report-snapshot.test** — `src/test/daily-report-snapshot.test.ts`
- `code-only` **date-utils.test** — `src/test/date-utils.test.ts`
- `code-only` **dev-pmxml.test** — `src/test/dev-pmxml.test.ts`
- `code-only` **example.test** — `src/test/example.test.ts`
- `code-only` **geometry.test** — `src/test/geometry.test.ts`
- `code-only` **import-p6.test** — `src/test/import-p6.test.ts`
- `code-only` **p6xml.test** — `src/test/p6xml.test.ts`
- `code-only` **setup** — `src/test/setup.ts`
- `code-only` **specs-utils.test** — `src/test/specs-utils.test.ts`

## 19 Onboarding & Tutorials — 11 leaves
### Frontend (10)
- `brief+code` **Demo** — `src/pages/Demo.tsx`
- `brief-only` **Demo 12-step walkthrough** — 
- `brief-only` **Guided tour auto-start** — 
- `brief+code` **GuidedTour** — `src/components/GuidedTour.tsx`
- `brief-only` **Index.tsx:~80–100** — `src/pages/Index.tsx:~80–100`
- `brief-only` **NativeFirstRun shown once** — 
- `brief-only` **Role filtering** — 
- `brief+code` **useTour** — `src/hooks/useTour.ts`
- `brief+code` **WelcomeCarousel** — `src/components/WelcomeCarousel.tsx`
- `brief-only` **WelcomeCarousel gating** — 

### Mobile (1)
- `brief-only` **NativeFirstRun** — `src/components/NativeFirstRun.tsx`

## 20 Sales & Pitch — 22 leaves
### Frontend (17)
- `brief-only` **App** — `src/App.tsx`
- `code-only` **blueprint-plans** — `src/assets/blueprint-plans.jpg`
- `brief-only` **Demo** — `src/pages/Demo.tsx`
- `brief-only` **Demo CTA linkage** — 
- `brief+code` **FajarPitch** — `src/pages/FajarPitch.tsx`
- `code-only` **gps-field-measurement** — `src/assets/gps-field-measurement.jpg`
- `code-only` **hero-product-shot** — `src/assets/hero-product-shot.png`
- `code-only` **hero-screenshot** — `src/assets/hero-screenshot.jpg`
- `code-only` **highway-construction-aerial** — `src/assets/highway-construction-aerial.jpg`
- `code-only` **inspector-tablet** — `src/assets/inspector-tablet.jpg`
- `brief+code` **Landing** — `src/pages/Landing.tsx`
- `brief-only` **Landing page** — 
- `brief-only` **llms.txt accuracy** — 
- `brief+code` **McfaPitch** — `src/pages/McfaPitch.tsx`
- `brief-only` **McfaPitch / FajarPitch** — 
- `brief+code` **P6XmlDemo** — `src/pages/P6XmlDemo.tsx`
- `brief-only` **sitemap.xml completeness** — 

### Backend (2)
- `code-only` **db: demo_requests** — `public.demo_requests`
- `code-only` **rls: demo_requests** — `supabase/migrations/20260328182512_208ba41b-5292-403a-baf4-9b9b2d158879.sql`, `supabase/migrations/20260526121114_08c40dcb-7912-41d8-bc1d-3668026265ac.sql`

### Docs (3)
- `brief+code` **llms** — `public/llms.txt`
- `brief+code` **robots** — `public/robots.txt`
- `brief+code` **sitemap** — `public/sitemap.xml`

## 97 Plumbing — 26 leaves
### Frontend (16)
- `code-only` **admin** — `public/fajar/admin.png`
- `code-only` **client** — `src/integrations/supabase/client.ts`
- `code-only` **ConfirmDialog** — `src/components/ConfirmDialog.tsx`
- `code-only` **EmptyState** — `src/components/EmptyState.tsx`
- `code-only` **listing** — `public/fajar/listing.png`
- `code-only` **machine-detail** — `public/fajar/machine-detail.png`
- `code-only` **mobile-booking** — `public/fajar/mobile-booking.png`
- `code-only` **NavLink** — `src/components/NavLink.tsx`
- `code-only` **NotFound** — `src/pages/NotFound.tsx`
- `code-only` **placeholder** — `public/placeholder.svg`
- `code-only` **pwa-192** — `public/pwa-192.png`
- `code-only` **pwa-512** — `public/pwa-512.png`
- `code-only` **serp** — `public/fajar/serp.png`
- `code-only` **use-toast** — `src/hooks/use-toast.ts`
- `code-only` **useTheme** — `src/hooks/useTheme.ts`
- `code-only` **utils** — `src/lib/utils.ts`

### Backend (10)
- `code-only` **fn(db): handle_new_user_role** — `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`
- `code-only` **fn(db): update_updated_at_column** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `code-only` **rls: accessible** — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- `code-only` **rls: photos** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`, `supabase/migrations/20260526121114_08c40dcb-7912-41d8-bc1d-3668026265ac.sql`
- `code-only` **rls: realtime** — `supabase/migrations/20260526121114_08c40dcb-7912-41d8-bc1d-3668026265ac.sql`
- `code-only` **rls: storage** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260321162408_22a25531-f789-4f47-b2d5-ec7d40196497.sql`, `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql` _(+1)_
- `code-only` **seed** — `supabase/seed.sql`
- `code-only` **trg: auth.on_auth_user_created** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260323121718_947e033e-ded7-4dae-9824-5ff155f34faf.sql`
- `code-only` **trg: auth.on_auth_user_created_profile** — `supabase/migrations/20260321162349_089b7eac-a691-474e-96f4-b97ab4d2581d.sql`
- `code-only` **trg: auth.on_auth_user_created_role** — `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`

## 98 Build & Infra — 67 leaves
### Frontend (3)
- `code-only` **index** — `src/index.css`
- `code-only` **main** — `src/main.tsx`
- `code-only` **vite-env.d** — `src/vite-env.d.ts`

### Backend (37)
- `code-only` **config** — `supabase/config.toml`
- `code-only` **migration: 2026-03-21 089b7eac-a691-474e-96f4-b97ab4d2581d** — `supabase/migrations/20260321162349_089b7eac-a691-474e-96f4-b97ab4d2581d.sql`
- `code-only` **migration: 2026-03-21 127eb40b-40a6-4814-b6cc-ed2f3acd27f2** — `supabase/migrations/20260321164809_127eb40b-40a6-4814-b6cc-ed2f3acd27f2.sql`
- `code-only` **migration: 2026-03-21 22a25531-f789-4f47-b2d5-ec7d40196497** — `supabase/migrations/20260321162408_22a25531-f789-4f47-b2d5-ec7d40196497.sql`
- `code-only` **migration: 2026-03-21 749c9dcd-0ffa-430d-bf20-422872294f47** — `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`
- `code-only` **migration: 2026-03-21 75de1f7c-2825-40a9-b86e-f031966b835e** — `supabase/migrations/20260321170227_75de1f7c-2825-40a9-b86e-f031966b835e.sql`
- `code-only` **migration: 2026-03-21 88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`
- `code-only` **migration: 2026-03-21 c4804e7a-cb2d-4898-be1d-27ba7694c893** — `supabase/migrations/20260321162713_c4804e7a-cb2d-4898-be1d-27ba7694c893.sql`
- `code-only` **migration: 2026-03-21 fadd3bba-4f5e-4ac1-b47b-3887bdd98769** — `supabase/migrations/20260321164313_fadd3bba-4f5e-4ac1-b47b-3887bdd98769.sql`
- `code-only` **migration: 2026-03-23 702975d9-3680-45b2-9a82-8587db5f26e5** — `supabase/migrations/20260323184019_702975d9-3680-45b2-9a82-8587db5f26e5.sql`
- `code-only` **migration: 2026-03-23 947e033e-ded7-4dae-9824-5ff155f34faf** — `supabase/migrations/20260323121718_947e033e-ded7-4dae-9824-5ff155f34faf.sql`
- `code-only` **migration: 2026-03-23 a351e076-b680-476d-b06d-1b2165092b26** — `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`
- `code-only` **migration: 2026-03-27 6f261706-ce0b-4c8a-b707-c3c8b0648540** — `supabase/migrations/20260327122843_6f261706-ce0b-4c8a-b707-c3c8b0648540.sql`
- `code-only` **migration: 2026-03-28 208ba41b-5292-403a-baf4-9b9b2d158879** — `supabase/migrations/20260328182512_208ba41b-5292-403a-baf4-9b9b2d158879.sql`
- `code-only` **migration: 2026-05-04 3462a0a5-a4a5-4f17-8272-83c40fa4e039** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`
- `code-only` **migration: 2026-05-05 f50b6c32-d0b3-42dd-9336-494143f5a389** — `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- `code-only` **migration: 2026-05-24 197a36b0-b223-4c6d-a3b6-73dd795f14de** — `supabase/migrations/20260524230947_197a36b0-b223-4c6d-a3b6-73dd795f14de.sql`
- `code-only` **migration: 2026-05-24 27a28235-ea50-4c3c-be4a-528f35665ed2** — `supabase/migrations/20260524172951_27a28235-ea50-4c3c-be4a-528f35665ed2.sql`
- `code-only` **migration: 2026-05-24 345bb077-7543-4a05-9ef8-c474d5276b1f** — `supabase/migrations/20260524173937_345bb077-7543-4a05-9ef8-c474d5276b1f.sql`
- `code-only` **migration: 2026-05-24 5034e85e-37ad-4471-bb00-017b17d673ee** — `supabase/migrations/20260524130242_5034e85e-37ad-4471-bb00-017b17d673ee.sql`
- `code-only` **migration: 2026-05-24 68108104-7e60-4587-a574-eeef24c30253** — `supabase/migrations/20260524174837_68108104-7e60-4587-a574-eeef24c30253.sql`
- `code-only` **migration: 2026-05-24 6a9de603-5b28-4109-98fe-7e343194da37** — `supabase/migrations/20260524015102_6a9de603-5b28-4109-98fe-7e343194da37.sql`
- `code-only` **migration: 2026-05-24 75af5978-5463-48f0-894d-a5ff9931868e** — `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`
- `code-only` **migration: 2026-05-24 aa3b520a-cfe2-4510-b710-0caf0809bc7f** — `supabase/migrations/20260524182507_aa3b520a-cfe2-4510-b710-0caf0809bc7f.sql`
- `code-only` **migration: 2026-05-24 bd7b1203-22ec-46f0-8c88-3c4208a05c7d** — `supabase/migrations/20260524015158_bd7b1203-22ec-46f0-8c88-3c4208a05c7d.sql`
- `code-only` **migration: 2026-05-24 cd76e27d-fda9-4f8b-aac8-c875aa100937** — `supabase/migrations/20260524173747_cd76e27d-fda9-4f8b-aac8-c875aa100937.sql`
- `code-only` **migration: 2026-05-25 e34bfccb-6eb4-4a47-b075-1f9c628559da** — `supabase/migrations/20260525163245_e34bfccb-6eb4-4a47-b075-1f9c628559da.sql`
- `code-only` **migration: 2026-05-26 08c40dcb-7912-41d8-bc1d-3668026265ac** — `supabase/migrations/20260526121114_08c40dcb-7912-41d8-bc1d-3668026265ac.sql`
- `code-only` **migration: 2026-05-26 4709d075-1bb1-44b9-ae5f-3edc62bcd171** — `supabase/migrations/20260526021443_4709d075-1bb1-44b9-ae5f-3edc62bcd171.sql`
- `code-only` **migration: 2026-05-26 7d5d3850-b410-4d77-ad92-1f2f0e524b65** — `supabase/migrations/20260526105432_7d5d3850-b410-4d77-ad92-1f2f0e524b65.sql`
- `code-only` **migration: 2026-05-26 9262b81e-12b7-4ca4-a3c8-d39802232caf** — `supabase/migrations/20260526114744_9262b81e-12b7-4ca4-a3c8-d39802232caf.sql`
- `code-only` **migration: 2026-05-26 dea32198-fe8d-4add-89e7-7aca7ad513b7** — `supabase/migrations/20260526115717_dea32198-fe8d-4add-89e7-7aca7ad513b7.sql`
- `code-only` **migration: 2026-05-26 e7d9bc81-0db3-4acd-88f7-ff486798a2b2** — `supabase/migrations/20260526015440_e7d9bc81-0db3-4acd-88f7-ff486798a2b2.sql`
- `code-only` **migration: 2026-05-26 e82b22fa-1dac-434e-942a-e18387a3c065** — `supabase/migrations/20260526114820_e82b22fa-1dac-434e-942a-e18387a3c065.sql`
- `code-only` **migration: 2026-05-28 1fea17ca-9deb-4078-8173-ee3e52b6eab6** — `supabase/migrations/20260528155928_1fea17ca-9deb-4078-8173-ee3e52b6eab6.sql`
- `code-only` **migration: 2026-05-28 44c52ae9-d9c8-4390-8dde-0367583b44ef** — `supabase/migrations/20260528155528_44c52ae9-d9c8-4390-8dde-0367583b44ef.sql`
- `code-only` **migration: 2026-05-29 637a0229-3683-4419-9838-890b4e588b31** — `supabase/migrations/20260529041918_637a0229-3683-4419-9838-890b4e588b31.sql`

### Verification (18)
- `code-only` **apply-depth-patches** — `scripts/apply-depth-patches.mjs`
- `code-only` **build-code-leaves** — `scripts/dev-wbs/build-code-leaves.mjs`
- `code-only` **build-db-surface-leaves** — `scripts/dev-wbs/build-db-surface-leaves.mjs`
- `code-only` **build-demo-pdf** — `scripts/build-demo-pdf.mjs`
- `code-only` **build-dev-pmxml** — `scripts/build-dev-pmxml.mjs`
- `code-only` **build-dev-wbs** — `scripts/build-dev-wbs.mjs`
- `code-only` **build-leaves** — `scripts/dev-wbs/build-leaves.mjs`
- `code-only` **consolidate-wbs** — `scripts/consolidate-wbs.mjs`
- `code-only` **derive-file-surface** — `scripts/derive-file-surface.mjs`
- `code-only` **discover-work-items** — `scripts/discover-work-items.mjs`
- `code-only` **extract-build-history** — `scripts/extract-build-history.mjs`
- `code-only` **extract-marketing-promises** — `scripts/extract-marketing-promises.mjs`
- `code-only` **git-dates** — `scripts/dev-wbs/git-dates.mjs`
- `code-only` **parse-brief** — `scripts/dev-wbs/parse-brief.mjs`
- `code-only` **reconcile-leaves** — `scripts/dev-wbs/reconcile-leaves.mjs`
- `code-only` **reconcile-scope** — `scripts/reconcile-scope.mjs`
- `code-only` **stream-heuristics** — `scripts/dev-wbs/stream-heuristics.mjs`
- `code-only` **verify-e2e** — `scripts/verify-e2e.mjs`

### Build (9)
- `code-only` **components** — `components.json`
- `code-only` **eslint.config** — `eslint.config.js`
- `code-only` **index** — `index.html`
- `code-only` **postcss.config** — `postcss.config.js`
- `code-only` **tailwind.config** — `tailwind.config.ts`
- `code-only` **tsconfig** — `tsconfig.json`
- `code-only` **tsconfig.app** — `tsconfig.app.json`
- `code-only` **tsconfig.node** — `tsconfig.node.json`
- `code-only` **vite.config** — `vite.config.ts`

## 99 Cross-cutting — 1 leaves
### Frontend (1)
- `code-only` **shadcn UI primitives** — `src/components/ui/accordion.tsx`, `src/components/ui/alert-dialog.tsx`, `src/components/ui/alert.tsx` _(+46)_

