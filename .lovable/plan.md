
# Full PWA + Native Bridge — Feature WBS & Delivery Plan

## 1. Current Feature Inventory (audit)

Pulled from `src/pages`, `src/hooks`, `src/components`, and the 22 public tables.

### A. Shipped & stable
- **Auth & Org** — `Auth`, `ResetPassword`, `useAuth`, `profiles`, `user_roles`, `invitations`, organization signup/invite flow.
- **Projects & Roles** — `Dashboard`, `ProjectSidebar`, `useProjects`, `useProject`, `projects`, `project_members`; Admin/PM/Inspector permissions.
- **Plan Viewer & Takeoff** — `Index`, `PdfCanvas`, `Toolbar`, pdf.js rendering, calibration (`calibrations`), annotations (`annotations`, `annotation_photos`), geometric editing, labels, undo/redo, fit-to-screen zoom.
- **Pay Items & Measurement** — `pay_items`, `SummaryPanel`, `usePayItemActivityMap`, unit-driven tool activation, SY/CY formulas, contract vs measured variance.
- **Standard Specs** — `SpecViewer`, virtualized continuous scroll, instant search, 3-tier lookup.
- **Daily Reports** — `DailyReport`, `daily_reports`, `daily_report_snapshots`, `daily_report_comments`, Excel export with stationing & overrides.
- **Documents** — `Documents`, `useDocuments`, `documents`, `document_folders`, trash, bulk delete with unified confirm.
- **Mobile UX** — `MobileTabBar`, `MobileToolbar`, `MobileAnnotationSheet`, `MobilePayItems`, `MobileSections`, status-chip shortcuts, touch interactions.
- **GPS Field Mode** — `GpsCalibration`, `GpsTraceControls`, `geo_calibrations`, Kalman smoothing, affine transform.
- **Schedule / P6** — `P6Export`, `P6XmlDemo`, `XerDemo`, `GanttUploader`, `schedule_activities`, `activity_pay_items`, `activity_assignments`.
- **Re-Review** — `ReReview`, `ReReviewCard`, `ReRejectDialog`, `useReReviewQueue`.
- **Collab/Activity** — `notifications`, `NotificationBell`, realtime sync, `scorecard_metrics`, `rocks`.
- **Onboarding/Marketing** — `Landing`, `Demo`, `McfaPitch`, `FajarPitch`, `WelcomeCarousel`, `GuidedTour`, `XerLensTour`, `demo_requests`.

### B. Gaps & half-built (resolve before/with PWA)
- No service worker, no manifest, no app icons, no `theme-color`/iOS meta tags.
- No offline queue — every mutation writes straight to Supabase.
- Photo capture relies on `<input type="file">`; no native camera, no GPS-tagged EXIF capture, no compression.
- Token refresh on resume from background not handled.
- Large `Documents.tsx` / `Demo.tsx` files flagged in prior loop, still unrefactored.
- Realtime subscriptions don't reconnect/backfill cleanly after network loss.
- No conflict UI for concurrent annotation edits.

### C. Forward roadmap (post-PWA)
- Push notifications (re-review assigned, comment mention, daily-report approval).
- Background photo upload with progress UI.
- Voice notes on annotations.
- Signature capture for daily reports.
- Offline-first standard specs (already mostly static — easy win).
- PDF differential sync (only re-download changed sheets).
- Apple Pencil / stylus pressure for sketch tools.
- Deep links from email/push into specific annotation.

---

## 2. WBS — Full PWA + Capacitor Delivery

Five phases, sized to ship incrementally. Each WBS code maps to an activity that will be **imported into the in-app schedule** as `schedule_activities` rows linked to a synthetic project "Platform: PWA Rollout", so you can track them in `/project/:id/p6-export` like any contract activity.

```text
1.0 Foundations & Hardening                    (1 wk)
2.0 Installable PWA Shell                      (1 wk)
3.0 Read-Only Offline                          (1 wk)
4.0 Full Offline Read+Write with Sync          (2-3 wks)
5.0 Capacitor Native Bridge & Store Release    (4-6 wks)
```

### 1.0 Foundations & Hardening — predecessors: none
- 1.1 Refactor `Documents.tsx` and `Demo.tsx` into feature modules.
- 1.2 Centralize Supabase mutation layer behind a `mutate(table, op, payload)` wrapper (precondition for offline queue).
- 1.3 Add `navigator.onLine` + heartbeat → global `useNetworkStatus` hook + status pill in header.
- 1.4 Resilient realtime: reconnect with backoff, replay missed `postgres_changes` via `updated_at > lastSeen`.
- 1.5 Session refresh on `visibilitychange` (fixes background-resume 401s).
- **Done when**: app survives 60s of airplane mode + resume with no console errors and no stale data.

### 2.0 Installable PWA Shell — predecessors: 1.0
- 2.1 App icons (192, 512, maskable, Apple touch) generated from existing brand mark.
- 2.2 `manifest.webmanifest`: name, short_name, `display: standalone`, `theme_color`, `background_color`, `scope: /`, `start_url: /?source=pwa`.
- 2.3 iOS meta tags (`apple-mobile-web-app-capable`, status-bar style, splash images per device).
- 2.4 `vite-plugin-pwa` with **`devOptions.enabled: false`**, iframe/preview-host registration guard, `navigateFallbackDenylist: [/^\/~oauth/, /^\/auth/, /^\/reset-password/]`.
- 2.5 In-app **Install** CTA on `/landing` + `/dashboard` using `beforeinstallprompt` (Android) and instructional sheet for iOS.
- 2.6 Update-available toast with "Reload" action (`registerSW({ onNeedRefresh })`).
- **Done when**: Lighthouse PWA score ≥ 90 in production; installs cleanly on iOS Safari + Android Chrome.

### 3.0 Read-Only Offline — predecessors: 2.0
- 3.1 Workbox strategies: app shell `precache`, HTML `NetworkFirst (3s)`, static assets `StaleWhileRevalidate`, Supabase REST GETs `NetworkFirst` with `cacheableResponse: { statuses: [0, 200] }`.
- 3.2 PDF cache: dedicated `CacheStorage` bucket with size cap (e.g. 500 MB LRU), warm on project open.
- 3.3 IndexedDB mirror (via `idb`) of currently opened project: `projects`, `pay_items`, `annotations`, `calibrations`, `geo_calibrations`, `schedule_activities`, `documents` metadata, `standard_specs` (bundled).
- 3.4 React Query persister (`@tanstack/query-sync-storage-persister` → IDB) with `dehydrateOptions` filtering by project.
- 3.5 "Offline" badges on action buttons that require network (create project, invite, export).
- **Done when**: open project online → enable airplane mode → reload → view PDF, annotations, pay items, specs, daily report (read-only).

### 4.0 Full Offline Read + Write with Sync — predecessors: 3.0
- 4.1 **Outbox** table in IDB: `{ id, opId, table, op, payload, baseVersion, createdAt, retries, status }`.
- 4.2 Route every write in the mutation wrapper (1.2) through the outbox; optimistic update React Query cache.
- 4.3 Background Sync registration + foreground drain loop (`onLine` + interval fallback for iOS where Background Sync API is unsupported).
- 4.4 **Conflict policy**: per-table rules.
  - Annotations: last-writer-wins on geometry; merge `notes` field via 3-way diff.
  - Pay items: server-wins for `contract_qty`; client-wins for `measured_qty` only if user owns the row.
  - Daily reports: block sync when status moved to `submitted` server-side; show diff resolver UI.
- 4.5 Migration: add `updated_at`, `client_op_id UNIQUE`, and `version INT` columns where missing for idempotent replay.
- 4.6 Photo capture queue: store blobs in IDB, upload to Storage with resumable chunks; placeholder thumbnail until uploaded.
- 4.7 Sync status drawer: pending items, retry, discard, conflict resolver.
- **Done when**: 30-annotation field session offline → reconnect → all changes appear server-side, zero data loss, conflicts surface a UI not a crash.

### 5.0 Capacitor Native Bridge & Store Release — predecessors: 4.0
- 5.1 Install `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`; `npx cap init` with appId `app.lovable.25431cb14a594e7aad1424da9039ad81`, appName `TakeoffPro`.
- 5.2 `capacitor.config.ts` with hot-reload `server.url` pointing at the Lovable preview for dev.
- 5.3 Native plugins:
  - `@capacitor/camera` → replace `<input type=file>` for annotation photos.
  - `@capacitor/geolocation` → high-accuracy stream for GPS trace.
  - `@capacitor/filesystem` → durable PDF/photo cache outside web origin.
  - `@capacitor/push-notifications` + `@capacitor/local-notifications`.
  - `@capacitor/network` → replace `navigator.onLine`.
  - `@capacitor/app` → resume/background lifecycle for session refresh.
  - `@capacitor/preferences` → secure key storage.
- 5.4 Push wiring: device token → `profiles.push_token`; edge function `send-push` triggered by notification inserts.
- 5.5 iOS specifics: NSCameraUsageDescription, NSLocationWhenInUseUsageDescription, NSPhotoLibraryAddUsageDescription, background modes for location if needed.
- 5.6 Android specifics: foreground service notice for GPS trace, FileProvider for share-out of exports.
- 5.7 App Store / Play assets: screenshots, listings, privacy nutrition labels.
- 5.8 TestFlight + Play internal track; pilot with one inspection crew.
- 5.9 Production release + crash reporting (Sentry Capacitor SDK).
- **Done when**: signed builds on both stores; pilot crew runs a 1-week field test without WiFi.

---

## 3. Activity Import into the App

A migration creates a synthetic `Platform: PWA Rollout` project and seeds `schedule_activities` rows (one per WBS leaf) with codes like `PWA-1.1`, durations from this plan, and finish-to-start predecessors. After approval you'll see them in `/project/:id/p6-export` and can manage them like any contract schedule.

## 4. Technical Notes

- **PWA preview caveat**: SW is **disabled in dev** and guarded against iframes/preview hosts, so the Lovable editor preview will *not* show install/offline behavior — you must verify on the published `.lovable.app` URL or on device.
- **Manifest pinning**: `start_url`, `id`, `scope`, `display` are baked in at first install; pick them carefully in 2.2 because changes won't reach already-installed users.
- **OAuth route**: `/auth` and `/reset-password` are in `navigateFallbackDenylist` so Supabase magic-link redirects always hit the network.
- **Coordinate normalization** (memory rule) remains — outbox payloads store coords at `scale: 1`.
- **Roles** are server-enforced via RLS; offline writes never bypass auth — they replay through the authenticated client when online.
- **Bucket** `annotation-photos` already exists; ensure RLS allows insert from authenticated users keyed by `project_members`.

## 5. Decisions Needed Before Build

- Confirm app display name for stores: **TakeoffPro** (default) or alternate?
- Approve creation of the synthetic `Platform: PWA Rollout` project to host the WBS activities, or prefer a non-project "platform schedule" table?
- Push-notification provider: native APNs/FCM via Capacitor (recommended), or piggyback on email-only for v1?

