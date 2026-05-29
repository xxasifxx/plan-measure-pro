# Dev WBS — Canonical Leaves

Generated 2026-05-29T16:10:34.996Z · **298 leaves** across 23 streams.

Provenance:
- **brief+code** (123) — a brief mentioned it and code confirms it.
- **brief-only** (88) — brief named it but no matching code found (could be stale brief or DB-only feature).
- **code-only** (87) — code exists but no brief acceptance criterion mentions it.

## 01 Identity & Access — 13 leaves
### Frontend (8)
- `code-only` **Admin** — `src/pages/Admin.tsx`
- `brief+code` **App** — `src/App.tsx`
- `brief+code` **Auth** — `src/pages/Auth.tsx`
- `brief+code` **ResetPassword** — `src/pages/ResetPassword.tsx`
- `brief-only` **RLS posture** — 
- `code-only` **Settings** — `src/pages/Settings.tsx`
- `code-only` **TeamManager** — `src/components/TeamManager.tsx`
- `brief+code` **useAuth** — `src/hooks/useAuth.tsx`

### Backend (4)
- `brief+code` **db: invitations** — `public.invitations`
- `brief+code` **db: profiles** — `public.profiles`
- `brief+code` **db: user_roles** — `public.user_roles`
- `brief+code` **fn: invite-user** — `supabase/functions/invite-user/`, `supabase/functions/invite-user/index.ts`

### Mobile (1)
- `brief-only` **BiometricGate** — `src/components/BiometricGate.tsx`

## 02 Portfolio & PM Home — 9 leaves
### Frontend (6)
- `brief-only` **approved-quantities.ts:loadPendingReviewCounts** — `src/lib/approved-quantities.ts:loadPendingReviewCounts`
- `brief+code` **Dashboard** — `src/pages/Dashboard.tsx`
- `brief-only` **GuidedTour** — `src/components/GuidedTour.tsx`
- `brief-only` **NotificationBell** — `src/components/NotificationBell.tsx`
- `brief+code` **useProjects** — `src/hooks/useProjects.ts`
- `brief-only` **WelcomeCarousel** — `src/components/WelcomeCarousel.tsx`

### Backend (3)
- `brief-only` **db: annotations** — `public.annotations`
- `brief+code` **db: project_members** — `public.project_members`
- `brief+code` **db: projects** — `public.projects`

## 03 Project Onboarding — 6 leaves
### Frontend (5)
- `brief-only` **Create project / PDF upload** — `src/hooks/useProjects.ts`
- `brief+code` **Load with offline fallback** — `src/pages/Index.tsx`
- `brief-only` **Pay-item import** — 
- `brief+code` **ProjectSidebar** — `src/components/ProjectSidebar.tsx`
- `brief+code` **TOC / pay-items survive reload** — `src/hooks/useProject.ts`

### Backend (1)
- `brief-only` **db: projects.specs_storage_path** — `public.projects.specs_storage_path`

## 04 Pay Item Catalog — 9 leaves
### Frontend (7)
- `brief-only` **Contract modifications** — 
- `brief-only` **Contract quantity denominator** — 
- `brief-only` **Delete cascade** — `src/components/ProjectSidebar.tsx`, `src/hooks/useProject.ts`
- `brief+code` **project** — `src/types/project.ts`
- `brief+code` **Section-keyed colors** — `src/lib/pdf-utils.ts`
- `brief-only` **SummaryPanel** — `src/components/SummaryPanel.tsx`
- `brief+code` **usePayItemActivityMap** — `src/hooks/usePayItemActivityMap.ts`

### Backend (1)
- `brief+code` **db: pay_items** — `public.pay_items`

### Mobile (1)
- `brief-only` **MobilePayItems** — `src/components/MobilePayItems.tsx`

## 05 Field Capture — 13 leaves
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

### Backend (2)
- `brief+code` **db: annotations** — `public.annotations`
- `brief+code` **db: calibrations** — `public.calibrations`

### Mobile (2)
- `brief-only` **MobileAnnotationSheet** — `src/components/MobileAnnotationSheet.tsx`
- `brief-only` **MobileToolbar** — `src/components/MobileToolbar.tsx`

## 06 Daily Report Lifecycle — 11 leaves
### Frontend (7)
- `brief+code` **daily-report-snapshot** — `src/lib/daily-report-snapshot.ts`
- `brief+code` **DailyReport** — `src/pages/DailyReport.tsx`
- `brief+code` **ReRejectDialog** — `src/components/ReRejectDialog.tsx`
- `brief+code` **ReReview** — `src/pages/ReReview.tsx`
- `brief+code` **ReReviewCard** — `src/components/ReReviewCard.tsx`
- `brief+code` **useDailyReport** — `src/hooks/useDailyReport.ts`
- `brief+code` **useReReviewQueue** — `src/hooks/useReReviewQueue.ts`

### Backend (4)
- `brief+code` **db: daily_report_comments** — `public.daily_report_comments`
- `brief+code` **db: daily_report_snapshots** — `public.daily_report_snapshots`
- `brief+code` **db: daily_reports** — `public.daily_reports`
- `brief-only` **db: v_approved_pay_item_quantities** — `public.v_approved_pay_item_quantities`

## 07 Quantity to Payment — 5 leaves
### Frontend (4)
- `brief+code` **approved-quantities** — `src/lib/approved-quantities.ts`
- `brief-only` **export-utils** — `src/lib/export-utils.ts`
- `brief-only` **ProjectControls** — `src/pages/ProjectControls.tsx`
- `brief+code` **SummaryPanel** — `src/components/SummaryPanel.tsx`

### Backend (1)
- `brief+code` **db: v_approved_pay_item_quantities** — `public.v_approved_pay_item_quantities`

## 08 Photo Evidence — 7 leaves
### Frontend (1)
- `brief-only` **ProjectControls** — `src/pages/ProjectControls.tsx`

### Backend (3)
- `brief-only` **bucket: annotation-photos** — `supabase/storage/annotation-photos`
- `brief+code` **db: annotation_photos** — `public.annotation_photos`
- `brief+code` **fn: tag-photo** — `supabase/functions/tag-photo/index.ts`

### Mobile (3)
- `brief-only` **camera** — `src/lib/native/camera.ts`
- `brief-only` **db** — `src/lib/offline/db.ts`
- `brief-only` **mutation-client** — `src/lib/offline/mutation-client.ts`

## 09 Standard Specifications — 3 leaves
### Frontend (2)
- `brief+code` **specs-utils** — `src/lib/specs-utils.ts`
- `brief+code` **SpecViewer** — `src/components/SpecViewer.tsx`

### Backend (1)
- `brief-only` **db: projects.specs_storage_path** — `public.projects.specs_storage_path`

## 10 Document Management — 6 leaves
### Frontend (3)
- `brief+code` **Documents** — `src/pages/Documents.tsx`
- `code-only` **storage** — `src/lib/storage.ts`
- `brief+code` **useDocuments** — `src/hooks/useDocuments.ts`

### Backend (3)
- `brief-only` **bucket: project-documents** — `supabase/storage/project-documents`
- `brief+code` **db: document_folders** — `public.document_folders`
- `brief+code` **db: documents** — `public.documents`

## 11 Schedule Management — 38 leaves
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

### Backend (11)
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
- `code-only` **fn: parse-schedule** — `supabase/functions/parse-schedule/index.ts`

## 12 Project Health and Controls — 6 leaves
### Frontend (4)
- `brief+code` **GanttUploader** — `src/components/GanttUploader.tsx`
- `brief-only` **project** — `src/types/project.ts`
- `brief+code` **ProjectControls** — `src/pages/ProjectControls.tsx`
- `brief-only` **ScheduleWorkspace** — `src/components/schedule/ScheduleWorkspace.tsx`

### Backend (2)
- `code-only` **db: rocks** — `public.rocks`
- `code-only` **db: scorecard_metrics** — `public.scorecard_metrics`

## 13 Data Export and Interoperability — 13 leaves
### Frontend (12)
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
- `brief+code` **types** — `src/lib/p6xml/types.ts`
- `brief-only` **usePayItemActivityMap** — `src/hooks/usePayItemActivityMap.ts`

### Mobile (1)
- `brief-only` **filesystem** — `src/lib/native/filesystem.ts`

## 14 Measurement and Geometry Engine — 7 leaves
### Frontend (6)
- `brief+code` **geo-transform** — `src/lib/geo-transform.ts`
- `brief+code` **geometry** — `src/lib/geometry.ts`
- `brief+code` **GpsCalibration** — `src/components/GpsCalibration.tsx`
- `brief+code` **GpsTraceControls** — `src/components/GpsTraceControls.tsx`
- `brief-only` **PdfCanvas** — `src/components/PdfCanvas.tsx`
- `brief-only` **useProject** — `src/hooks/useProject.ts`

### Backend (1)
- `code-only` **db: geo_calibrations** — `public.geo_calibrations`

## 15 Offline and Native Durability — 24 leaves
### Frontend (4)
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
- `brief-only` **manifest** — `public/manifest.webmanifest`

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

## 17 Notifications & Presence — 13 leaves
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

### Backend (3)
- `code-only` **db: device_tokens** — `public.device_tokens`
- `code-only` **db: notifications** — `public.notifications`
- `brief+code` **fn: send-push** — `supabase/functions/send-push/index.ts`

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

## 20 Sales & Pitch — 15 leaves
### Frontend (11)
- `brief-only` **App** — `src/App.tsx`
- `brief-only` **Demo** — `src/pages/Demo.tsx`
- `brief-only` **Demo CTA linkage** — 
- `brief+code` **FajarPitch** — `src/pages/FajarPitch.tsx`
- `brief+code` **Landing** — `src/pages/Landing.tsx`
- `brief-only` **Landing page** — 
- `brief-only` **llms.txt accuracy** — 
- `brief+code` **McfaPitch** — `src/pages/McfaPitch.tsx`
- `brief-only` **McfaPitch / FajarPitch** — 
- `brief+code` **P6XmlDemo** — `src/pages/P6XmlDemo.tsx`
- `brief-only` **sitemap.xml completeness** — 

### Backend (1)
- `code-only` **db: demo_requests** — `public.demo_requests`

### Docs (3)
- `brief-only` **llms** — `public/llms.txt`
- `brief-only` **robots** — `public/robots.txt`
- `brief-only` **sitemap** — `public/sitemap.xml`

## 97 Plumbing — 15 leaves
### Frontend (15)
- `code-only` **app-icon-master** — `src/assets/app-icon-master.png`
- `code-only` **blueprint-plans** — `src/assets/blueprint-plans.jpg`
- `code-only` **client** — `src/integrations/supabase/client.ts`
- `code-only` **ConfirmDialog** — `src/components/ConfirmDialog.tsx`
- `code-only` **EmptyState** — `src/components/EmptyState.tsx`
- `code-only` **gps-field-measurement** — `src/assets/gps-field-measurement.jpg`
- `code-only` **hero-product-shot** — `src/assets/hero-product-shot.png`
- `code-only` **hero-screenshot** — `src/assets/hero-screenshot.jpg`
- `code-only` **highway-construction-aerial** — `src/assets/highway-construction-aerial.jpg`
- `code-only` **inspector-tablet** — `src/assets/inspector-tablet.jpg`
- `code-only` **NavLink** — `src/components/NavLink.tsx`
- `code-only` **NotFound** — `src/pages/NotFound.tsx`
- `code-only` **use-toast** — `src/hooks/use-toast.ts`
- `code-only` **useTheme** — `src/hooks/useTheme.ts`
- `code-only` **utils** — `src/lib/utils.ts`

## 98 Build & Infra — 34 leaves
### Frontend (3)
- `code-only` **index** — `src/index.css`
- `code-only` **main** — `src/main.tsx`
- `code-only` **vite-env.d** — `src/vite-env.d.ts`

### Backend (5)
- `code-only` **config** — `supabase/config.toml`
- `code-only` **Migrations 2026-w12** — `supabase/migrations/20260321160419_88eaa7bc-8baf-45b7-98d1-1cdd3a3c6550.sql`, `supabase/migrations/20260321162325_749c9dcd-0ffa-430d-bf20-422872294f47.sql`, `supabase/migrations/20260321162349_089b7eac-a691-474e-96f4-b97ab4d2581d.sql` _(+5)_
- `code-only` **Migrations 2026-w13** — `supabase/migrations/20260323121718_947e033e-ded7-4dae-9824-5ff155f34faf.sql`, `supabase/migrations/20260323173825_a351e076-b680-476d-b06d-1b2165092b26.sql`, `supabase/migrations/20260323184019_702975d9-3680-45b2-9a82-8587db5f26e5.sql` _(+2)_
- `code-only` **Migrations 2026-w19** — `supabase/migrations/20260504215217_3462a0a5-a4a5-4f17-8272-83c40fa4e039.sql`, `supabase/migrations/20260505010015_f50b6c32-d0b3-42dd-9336-494143f5a389.sql`
- `code-only` **Migrations 2026-w22** — `supabase/migrations/20260524015102_6a9de603-5b28-4109-98fe-7e343194da37.sql`, `supabase/migrations/20260524015141_75af5978-5463-48f0-894d-a5ff9931868e.sql`, `supabase/migrations/20260524015158_bd7b1203-22ec-46f0-8c88-3c4208a05c7d.sql` _(+18)_

### Verification (17)
- `code-only` **apply-depth-patches** — `scripts/apply-depth-patches.mjs`
- `code-only` **build-code-leaves** — `scripts/dev-wbs/build-code-leaves.mjs`
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

