# Dev WBS — Canonical Leaves

Generated 2026-05-29T15:52:25.478Z · **221 leaves** across 20 streams.

Each leaf has a stable `id` (`<streamNum>:<layer>:<slug>`), a list of `fileGlobs`,
and the brief sources that produced it. Activities (historical + forward) attach to these leaves.

## Layer key
- **Frontend** — `src/**` (non-mobile, non-test)
- **Backend** — `supabase/**`, `public.*` tables, `.sql`
- **Mobile** — `src/lib/native/**`, `src/lib/offline/**`, mobile/native components
- **Verification** — `src/test/**`, `scripts/**`
- **Docs** — `docs/**`

## 01 Identity & Access — 13 leaves
### Frontend (5)
- **App** — `src/App.tsx`
- **Auth** — `src/pages/Auth.tsx`
- **ResetPassword** — `src/pages/ResetPassword.tsx`
- **RLS posture** _[partial]_ — 
- **useAuth** — `src/hooks/useAuth.tsx`

### Backend (4)
- **** — `supabase/functions/invite-user/`
- **db: invitations** — `public.invitations`
- **db: profiles** — `public.profiles`
- **db: user_roles** — `public.user_roles`

### Mobile (2)
- **Biometric gate** _[implemented]_ — `BiometricGate.tsx`
- **BiometricGate** — `src/components/BiometricGate.tsx`

### Docs (2)
- **Organic signup → admin role** _[implemented]_ — `Auth.tsx`, `useAuth.tsx`
- **Password reset** _[implemented]_ — `ResetPassword.tsx`

## 02 Portfolio & PM Home — 11 leaves
### Frontend (6)
- **approved-quantities.ts:loadPendingReviewCounts** — `src/lib/approved-quantities.ts:loadPendingReviewCounts`
- **Dashboard** — `src/pages/Dashboard.tsx`
- **GuidedTour** — `src/components/GuidedTour.tsx`
- **NotificationBell** — `src/components/NotificationBell.tsx`
- **useProjects** — `src/hooks/useProjects.ts`
- **WelcomeCarousel** — `src/components/WelcomeCarousel.tsx`

### Backend (3)
- **db: annotations** — `public.annotations`
- **db: project_members** — `public.project_members`
- **db: projects** — `public.projects`

### Docs (2)
- **New Project dialog** _[implemented]_ — `Dashboard.tsx`
- **Ownership + member union** _[implemented]_ — `useProjects.ts`

## 03 Project Onboarding — 6 leaves
### Frontend (2)
- **Pay-item import** _[implemented]_ — 
- **ProjectSidebar** — `src/components/ProjectSidebar.tsx`

### Docs (4)
- **Create project / PDF upload** _[implemented]_ — `useProjects.ts`
- **db: projects.specs_storage_path** — `public.projects.specs_storage_path`
- **Load with offline fallback** _[implemented]_ — `Index.tsx`
- **TOC / pay-items survive reload** _[implemented]_ — `useProject.ts`, `useProject.ts`

## 04 Pay Item Catalog — 10 leaves
### Frontend (5)
- **Contract modifications** _[missing]_ — 
- **Contract quantity denominator** _[partial]_ — 
- **project** — `src/types/project.ts`
- **SummaryPanel** — `src/components/SummaryPanel.tsx`
- **usePayItemActivityMap** — `src/hooks/usePayItemActivityMap.ts`

### Backend (1)
- **db: pay_items** — `public.pay_items`

### Mobile (1)
- **MobilePayItems** — `src/components/MobilePayItems.tsx`

### Docs (3)
- **Delete cascade** _[implemented]_ — `ProjectSidebar.tsx`, `useProject.ts`
- **drawable flag** _[implemented]_ — `types/project.ts`, `Toolbar.tsx`
- **Section-keyed colors** _[implemented]_ — `pdf-utils.ts`

## 05 Field Capture — 15 leaves
### Frontend (9)
- **geo-transform** — `src/lib/geo-transform.ts`
- **geometry** — `src/lib/geometry.ts`
- **GpsCalibration** — `src/components/GpsCalibration.tsx`
- **GpsTraceControls** — `src/components/GpsTraceControls.tsx`
- **Index** — `src/pages/Index.tsx`
- **PdfCanvas** — `src/components/PdfCanvas.tsx`
- **project** — `src/types/project.ts`
- **Toolbar** — `src/components/Toolbar.tsx`
- **useProject** — `src/hooks/useProject.ts`

### Backend (2)
- **db: annotations** — `public.annotations`
- **db: calibrations** — `public.calibrations`

### Mobile (2)
- **MobileAnnotationSheet** — `src/components/MobileAnnotationSheet.tsx`
- **MobileToolbar** — `src/components/MobileToolbar.tsx`

### Docs (2)
- **Scale calibration** _[implemented]_ — `PdfCanvas.tsx`, `Toolbar.tsx`
- **Undo/redo with DB sync** _[implemented]_ — `useProject.ts`

## 06 Daily Report Lifecycle — 11 leaves
### Frontend (7)
- **daily-report-snapshot** — `src/lib/daily-report-snapshot.ts`
- **DailyReport** — `src/pages/DailyReport.tsx`
- **ReRejectDialog** — `src/components/ReRejectDialog.tsx`
- **ReReview** — `src/pages/ReReview.tsx`
- **ReReviewCard** — `src/components/ReReviewCard.tsx`
- **useDailyReport** — `src/hooks/useDailyReport.ts`
- **useReReviewQueue** — `src/hooks/useReReviewQueue.ts`

### Backend (4)
- **db: daily_report_comments** — `public.daily_report_comments`
- **db: daily_report_snapshots** — `public.daily_report_snapshots`
- **db: daily_reports** — `public.daily_reports`
- **db: v_approved_pay_item_quantities** — `public.v_approved_pay_item_quantities`

## 07 Quantity to Payment — 5 leaves
### Frontend (4)
- **approved-quantities** — `src/lib/approved-quantities.ts`
- **export-utils** — `src/lib/export-utils.ts`
- **ProjectControls** — `src/pages/ProjectControls.tsx`
- **SummaryPanel** — `src/components/SummaryPanel.tsx`

### Backend (1)
- **db: v_approved_pay_item_quantities** — `public.v_approved_pay_item_quantities`

## 08 Photo Evidence — 7 leaves
### Frontend (1)
- **ProjectControls** — `src/pages/ProjectControls.tsx`

### Backend (2)
- **db: annotation_photos** — `public.annotation_photos`
- **index** — `supabase/functions/tag-photo/index.ts`

### Mobile (3)
- **camera** — `src/lib/native/camera.ts`
- **db** — `src/lib/offline/db.ts`
- **mutation-client** — `src/lib/offline/mutation-client.ts`

### Docs (1)
- **annotation-photos** — `supabase/storage/annotation-photos`

## 09 Standard Specifications — 3 leaves
### Frontend (2)
- **specs-utils** — `src/lib/specs-utils.ts`
- **SpecViewer** — `src/components/SpecViewer.tsx`

### Docs (1)
- **db: projects.specs_storage_path** — `public.projects.specs_storage_path`

## 10 Document Management — 5 leaves
### Frontend (2)
- **Documents** — `src/pages/Documents.tsx`
- **useDocuments** — `src/hooks/useDocuments.ts`

### Backend (2)
- **db: document_folders** — `public.document_folders`
- **db: documents** — `public.documents`

### Docs (1)
- **project-documents** — `supabase/storage/project-documents`

## 11 Schedule Management — 25 leaves
### Frontend (25)
- **aace** — `src/lib/schedule/analysis/aace.ts`
- **ActivityInspector** — `src/components/schedule/ActivityInspector.tsx`
- **baseline** — `src/lib/schedule/baseline.ts`
- **BaselineManager** — `src/components/schedule/BaselineManager.tsx`
- **CalendarManager** — `src/components/schedule/CalendarManager.tsx`
- **calendars** — `src/lib/schedule/calendars.ts`
- **chart-export** — `src/lib/schedule/analysis/chart-export.ts`
- **ComplianceStrip** — `src/components/schedule/ComplianceStrip.tsx`
- **cpm** — `src/lib/schedule/cpm.ts`
- **dcma** — `src/lib/schedule/analysis/dcma.ts`
- **DcmaPanel** — `src/components/schedule/DcmaPanel.tsx`
- **feedback** — `src/lib/schedule/analysis/feedback.ts`
- **GanttChart** — `src/components/schedule/GanttChart.tsx`
- **import-p6** — `src/lib/schedule/import-p6.ts`
- **ImportP6Panel** — `src/components/schedule/ImportP6Panel.tsx`
- **memo-export** — `src/lib/schedule/analysis/memo-export.ts`
- **MetaControls** — `src/components/schedule/MetaControls.tsx`
- **parser** — `src/lib/p6xml/parser.ts`
- **progress** — `src/lib/schedule/analysis/progress.ts`
- **ResourceManager** — `src/components/schedule/ResourceManager.tsx`
- **ScheduleWorkspace** — `src/components/schedule/ScheduleWorkspace.tsx`
- **tia** — `src/lib/schedule/analysis/tia.ts`
- **types** — `src/lib/schedule/types.ts`
- **use-schedule** — `src/lib/schedule/use-schedule.ts`
- **WbsTree** — `src/components/schedule/WbsTree.tsx`

## 12 Project Health and Controls — 4 leaves
### Frontend (4)
- **GanttUploader** — `src/components/GanttUploader.tsx`
- **project** — `src/types/project.ts`
- **ProjectControls** — `src/pages/ProjectControls.tsx`
- **ScheduleWorkspace** — `src/components/schedule/ScheduleWorkspace.tsx`

## 13 Data Export and Interoperability — 12 leaves
### Frontend (11)
- **apply-progress** — `src/lib/p6xml/apply-progress.ts`
- **approved-quantities** — `src/lib/approved-quantities.ts`
- **build-from-project** — `src/lib/p6xml/build-from-project.ts`
- **export-utils** — `src/lib/export-utils.ts`
- **load-approved** — `src/lib/p6xml/load-approved.ts`
- **P6Export** — `src/pages/P6Export.tsx`
- **parser** — `src/lib/p6xml/parser.ts`
- **pdf-utils** — `src/lib/pdf-utils.ts`
- **serializer** — `src/lib/p6xml/serializer.ts`
- **types** — `src/lib/p6xml/types.ts`
- **usePayItemActivityMap** — `src/hooks/usePayItemActivityMap.ts`

### Mobile (1)
- **filesystem** — `src/lib/native/filesystem.ts`

## 14 Measurement and Geometry Engine — 6 leaves
### Frontend (6)
- **geo-transform** — `src/lib/geo-transform.ts`
- **geometry** — `src/lib/geometry.ts`
- **GpsCalibration** — `src/components/GpsCalibration.tsx`
- **GpsTraceControls** — `src/components/GpsTraceControls.tsx`
- **PdfCanvas** — `src/components/PdfCanvas.tsx`
- **useProject** — `src/hooks/useProject.ts`

## 15 Offline and Native Durability — 24 leaves
### Frontend (4)
- **pwa** — `src/lib/pwa.ts`
- **SyncPanel** — `src/components/SyncPanel.tsx`
- **useNetworkStatus** — `src/hooks/useNetworkStatus.ts`
- **useOutbox** — `src/hooks/useOutbox.ts`

### Mobile (18)
- **app-state** — `src/lib/native/app-state.ts`
- **background-sync** — `src/lib/native/background-sync.ts`
- **biometric** — `src/lib/native/biometric.ts`
- **BiometricGate** — `src/components/BiometricGate.tsx`
- **camera** — `src/lib/native/camera.ts`
- **db** — `src/lib/offline/db.ts`
- **filesystem** — `src/lib/native/filesystem.ts`
- **geolocation** — `src/lib/native/geolocation.ts`
- **idb-persister** — `src/lib/offline/idb-persister.ts`
- **mirror** — `src/lib/offline/mirror.ts`
- **mutation-client** — `src/lib/offline/mutation-client.ts`
- **NativeFirstRun** — `src/components/NativeFirstRun.tsx`
- **outbox** — `src/lib/offline/outbox.ts`
- **pdf-cache** — `src/lib/offline/pdf-cache.ts`
- **platform** — `src/lib/native/platform.ts`
- **push** — `src/lib/native/push.ts`
- **PwaShell** — `src/components/PwaShell.tsx`
- **sync** — `src/lib/offline/sync.ts`

### Docs (2)
- **capacitor.config** — `capacitor.config.ts`
- **manifest** — `public/manifest.webmanifest`

## 16 Mobile Field Ergonomics — 13 leaves
### Frontend (8)
- **Active pay item chip** _[implemented]_ — 
- **Badge counts** _[implemented]_ — 
- **Calibration chip tap** _[implemented]_ — 
- **Demo** — `src/pages/Demo.tsx`
- **Index** — `src/pages/Index.tsx`
- **Tab switching / PDF persistence** _[implemented]_ — 
- **use-mobile** — `src/hooks/use-mobile.tsx`
- **Zoom clamp** _[implemented]_ — 

### Mobile (5)
- **MobileAnnotationSheet** — `src/components/MobileAnnotationSheet.tsx`
- **MobilePayItems** — `src/components/MobilePayItems.tsx`
- **MobileSections** — `src/components/MobileSections.tsx`
- **MobileTabBar** — `src/components/MobileTabBar.tsx`
- **MobileToolbar** — `src/components/MobileToolbar.tsx`

## 17 Notifications & Presence — 12 leaves
### Frontend (9)
- **Bell + realtime subscribe** _[implemented]_ — 
- **Index.tsx:795** — `src/pages/Index.tsx:795`
- **markRead / markAllRead** _[implemented]_ — 
- **Navigation on click** _[implemented]_ — 
- **NotificationBell** — `src/components/NotificationBell.tsx`
- **Presence / online users** _[implemented]_ — 
- **send-push edge function** _[implemented]_ — 
- **useNotifications** — `src/hooks/useNotifications.ts`
- **useProject.ts:421–448** — `src/hooks/useProject.ts:421–448`

### Backend (1)
- **index** — `supabase/functions/send-push/index.ts`

### Mobile (1)
- **push** — `src/lib/native/push.ts`

### Docs (1)
- **Native push registration** _[implemented]_ — `lib/native/push.ts`

## 18 Compliance & Audit — 14 leaves
### Frontend (13)
- **Approve/reject timestamps + reviewer** _[implemented]_ — 
- **ComplianceStrip** — `src/components/schedule/ComplianceStrip.tsx`
- **dcma** — `src/lib/schedule/analysis/dcma.ts`
- **DcmaPanel** — `src/components/schedule/DcmaPanel.tsx`
- **Drift detection** _[implemented]_ — 
- **Negative lag / M-code check** _[implemented]_ — 
- **ReRejectDialog** — `src/components/ReRejectDialog.tsx`
- **ReReview** — `src/pages/ReReview.tsx`
- **ReReviewCard** — `src/components/ReReviewCard.tsx`
- **Snapshot freeze** _[implemented]_ — 
- **types** — `src/integrations/supabase/types.ts`
- **useDailyReport** — `src/hooks/useDailyReport.ts`
- **useReReviewQueue** — `src/hooks/useReReviewQueue.ts`

### Docs (1)
- **DCMA 14-point** _[implemented]_ — `lib/schedule/analysis/dcma.ts`

## 19 Onboarding & Tutorials — 11 leaves
### Frontend (10)
- **Demo** — `src/pages/Demo.tsx`
- **Demo 12-step walkthrough** _[implemented]_ — 
- **Guided tour auto-start** _[implemented]_ — 
- **GuidedTour** — `src/components/GuidedTour.tsx`
- **Index.tsx:~80–100** — `src/pages/Index.tsx:~80–100`
- **NativeFirstRun shown once** _[implemented]_ — 
- **Role filtering** _[implemented]_ — 
- **useTour** — `src/hooks/useTour.ts`
- **WelcomeCarousel** — `src/components/WelcomeCarousel.tsx`
- **WelcomeCarousel gating** _[implemented]_ — 

### Mobile (1)
- **NativeFirstRun** — `src/components/NativeFirstRun.tsx`

## 20 Sales & Pitch — 14 leaves
### Frontend (11)
- **App** — `src/App.tsx`
- **Demo** — `src/pages/Demo.tsx`
- **Demo CTA linkage** _[implemented]_ — 
- **FajarPitch** — `src/pages/FajarPitch.tsx`
- **Landing** — `src/pages/Landing.tsx`
- **Landing page** _[implemented]_ — 
- **llms.txt accuracy** _[implemented]_ — 
- **McfaPitch** — `src/pages/McfaPitch.tsx`
- **McfaPitch / FajarPitch** _[implemented]_ — 
- **P6XmlDemo** _[implemented]_ — `src/pages/P6XmlDemo.tsx`
- **sitemap.xml completeness** _[implemented]_ — 

### Docs (3)
- **llms** — `public/llms.txt`
- **robots** — `public/robots.txt`
- **sitemap** — `public/sitemap.xml`

