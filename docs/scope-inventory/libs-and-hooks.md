# Libraries & Hooks Inventory (subagent sub_222r7nyr, capable model, 2026-05-29)

Source: read of src/lib/** and src/hooks/**

## Standalone libs

```yaml
- id: geometry
  path: src/lib/geometry.ts
  purpose: 2-D measurement math (polyline length, polygon area, unit conversion, hit testing).
  completeness: complete

- id: geo-transform
  path: src/lib/geo-transform.ts
  purpose: GPS to plan-pixel affine calibration with Kalman smoothing for live GPS.
  completeness: complete

- id: utils
  path: src/lib/utils.ts
  purpose: cn() class-name helper.
  completeness: complete

- id: storage
  path: src/lib/storage.ts
  purpose: Legacy localStorage Project/PayItem CRUD (predates Supabase).
  completeness: complete
  notes: Likely dead code in the primary cloud flow.

- id: pwa
  path: src/lib/pwa.ts
  purpose: Vite PWA service-worker registration + install prompt helpers.
  completeness: complete

- id: specs-utils
  path: src/lib/specs-utils.ts
  purpose: Extracts section text from a Specs PDF for in-app spec lookups.
  completeness: partial
  unbuilt_hints: [basic text join only; no structured section parsing]

- id: approved-quantities
  path: src/lib/approved-quantities.ts
  purpose: Reads RE-approved daily-report totals from v_approved_pay_item_quantities.
  completeness: complete

- id: daily-report-snapshot
  path: src/lib/daily-report-snapshot.ts
  purpose: Builds frozen SnapshotItem[] for a daily report submission.
  completeness: complete

- id: export-utils
  path: src/lib/export-utils.ts
  purpose: CSV/Excel exports of pay-item takeoff summaries (live + approved variants).
  completeness: complete

- id: pdf-utils
  path: src/lib/pdf-utils.ts
  purpose: pdf.js wrapper for loading/rendering PDFs, TOC region extraction, pay-item table parsing.
  completeness: complete
  notes: Sophisticated multi-cluster algorithm for Estimate-of-Quantities tables.
```

## Native shims (Capacitor)

```yaml
- id: native-platform
  path: src/lib/native/platform.ts
  purpose: isNative() / platform() detection.
- id: native-camera
  path: src/lib/native/camera.ts
  purpose: capturePhoto() via Capacitor Camera; web fallback to hidden file input.
- id: native-geolocation
  path: src/lib/native/geolocation.ts
  purpose: watchPosition() wrapping Capacitor Geolocation / navigator.geolocation.
- id: native-biometric
  path: src/lib/native/biometric.ts
  purpose: FaceID/TouchID enroll/unlock; stores Supabase refresh token in Keychain.
- id: native-filesystem
  path: src/lib/native/filesystem.ts
  purpose: saveExport() to native FS + share sheet; browser anchor-download fallback.
- id: native-push
  path: src/lib/native/push.ts
  purpose: Push registration -> device_tokens; foreground notifications as Sonner toasts.
- id: native-app-state
  path: src/lib/native/app-state.ts
  purpose: App.addListener('appStateChange') -> trigger background sync on foreground.
- id: native-background-sync
  path: src/lib/native/background-sync.ts
  purpose: Schedules periodic outbox flush via BackgroundTask (iOS) / WorkManager (Android).
  completeness: partial
  unbuilt_hints: [iOS BackgroundTask windows not guaranteed; Capacitor plugin binding varies]
```

## Offline / IndexedDB layer

```yaml
- id: offline-db
  path: src/lib/offline/db.ts
  purpose: TakeoffOfflineDB schema v2 + safe CRUD helpers.
  notes: Stores - projects, pay_items, annotations, annotation_photos, calibrations, geo_calibrations, schedule_activities, documents_meta, daily_reports, pdf_cache_meta, meta, outbox, outbox_blobs.

- id: offline-idb-persister
  path: src/lib/offline/idb-persister.ts
  purpose: React Query Persister backed by IDB (user-scoped).

- id: offline-mirror
  path: src/lib/offline/mirror.ts
  purpose: Bulk-fetches 8 Supabase tables -> IDB snapshot for offline reads.

- id: offline-mutation-client
  path: src/lib/offline/mutation-client.ts
  purpose: Online -> direct Supabase; offline -> enqueue to outbox + optimistic IDB update.

- id: offline-outbox
  path: src/lib/offline/outbox.ts
  purpose: IDB-backed write queue with subscriber pattern; entities/ops/statuses fully defined.

- id: offline-sync
  path: src/lib/offline/sync.ts
  purpose: Drains outbox; single-flight + exponential backoff [1s,4s,15s,60s,180s]; auto-sync on online/visibility/outbox-change.

- id: offline-pdf-cache
  path: src/lib/offline/pdf-cache.ts
  purpose: Caches plan PDFs in CacheStorage (~500MB LRU cap) so plans render offline.
  unbuilt_hints: [warmPdf may not be called from useProject; no UI for cache size/clear]
```

## P6 XML round-trip (src/lib/p6xml)

```yaml
- id: p6xml-types
- id: p6xml-parser
  notes: [single <Project> per file only]
- id: p6xml-serializer
- id: p6xml-apply-progress
  notes: [requires only approved reports; upstream gate is v_approved_pay_item_quantities]
- id: p6xml-build-from-project
  completeness: partial
  unbuilt_hints: [Calendar and resource elements not emitted; WBS hierarchy is flat]
- id: p6xml-load-approved
- id: p6xml-sample
```

## In-app CPM scheduler (src/lib/schedule)

```yaml
- id: schedule-types
- id: schedule-cpm
  purpose: Calendar-aware CPM - topological sort, forward/backward pass, constraint handling (SNET/MFO/MSO/SNLT/FNET/FNLT), cycle detection.
  unbuilt_hints: [ALAP scheduling not implemented; resource leveling absent]
- id: schedule-calendars
- id: schedule-date-utils
- id: schedule-baseline
  purpose: Captures snapshots into schedule_baselines + baseline_activities; comparison logic.
- id: schedule-import-p6
  unbuilt_hints: [Calendar/resource tables in XER not yet imported]
- id: schedule-use-schedule
```

## Primavera XER analysis (src/lib/xer)

```yaml
- id: xer-types
- id: xer-parser
- id: xer-wbs
  purpose: WBS tree + NJDOT 9-milestone check + open-ended/negative-lag compliance snapshot.
- id: xer-dcma
  purpose: Full DCMA 14-Point Schedule Health Assessment.
  unbuilt_hints: [Resources check always passes - TASKRSRC not parsed]
- id: xer-tia
  purpose: TIA fragnet (ASCII + CSV) + RE narrative memo.
  unbuilt_hints: [Fragnet only models FS; no actual CPM re-computation]
- id: xer-progress
  purpose: Baseline vs update comparison (SPI/CPI duration-proxied, forecast finish, top-slipping activities).
  unbuilt_hints: [CPI = SPI because cost not loaded; no ACWP/BCWP]
- id: xer-aace
  purpose: AACE 98R-18 estimate-class metadata + accuracy bands.
- id: xer-feedback
  purpose: RE feedback memo with accept / accept-with-conditions / reject recommendation.
- id: xer-memo-export
- id: xer-chart-export
- id: xer-sample
- id: xer-sample-update
```

## Hooks (src/hooks)

```yaml
- id: use-mobile
- id: use-toast
- id: useAuth
  notes: Auto-calls assign_owner_role RPC on first SIGNED_IN for first-user bootstrap.
- id: useDailyReport
- id: useDocuments
  exposes: [useFolders, useDocuments, useFolderCounts, useTrash]
- id: useNetworkStatus
- id: useNotifications
  purpose: Supabase realtime INSERT subscription + markRead / markAllRead.
- id: useOutbox
- id: usePayItemActivityMap
  exposes: [usePayItemActivityMap, useUpdatePayItemMapping, useBulkAutoMap]
- id: useProject
  unbuilt_hints: [no deep-diff on remote updates - concurrent edits can clobber local state]
- id: useProjects
- id: useReReviewQueue
  exposes: [useReReviewQueue, useReportComments, useReportArchives, useAddComment, useApproveReport, useRejectReport]
- id: useTheme
- id: useTour
```

Total: 15 standalone libs + 8 native shims + 7 offline + 7 p6xml + 7 schedule + 12 xer = **56 lib modules** plus **14 hooks**.

Most-sophisticated: CPM engine (schedule/cpm.ts), DCMA auditor (xer/dcma.ts), P6 round-trip (p6xml/apply-progress.ts + serializer.ts).

Most-notable-incomplete: xer/dcma resources check, native/background-sync, p6xml/build-from-project, useProject concurrent-edit handling.
