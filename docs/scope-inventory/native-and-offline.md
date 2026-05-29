# Native / Mobile / Offline Inventory (subagent sub_tw0td06f, capable model, 2026-05-29)

```yaml
- id: capacitor-config
  area: capacitor-config
  status: configured-only-no-UI
  files: [capacitor.config.ts]
  unbuilt: [ios/ and android/ folders not added; server.url must be removed for production; no version bump automation]

- id: native-platform-shim
  status: shipped
  files: [src/lib/native/platform.ts]

- id: native-app-state
  area: native-plugin:App
  status: shipped
  files: [src/lib/native/app-state.ts, src/main.tsx]
  unbuilt: [no deep-link / appUrlOpen handling]

- id: native-background-sync
  area: native-plugin:BackgroundFetch
  status: shipped
  files: [src/lib/native/background-sync.ts, src/main.tsx, src/pages/Settings.tsx]
  unbuilt: [@transistorsoft plugin requires commercial license for production; no UI feedback when bg-sync completes]

- id: native-camera
  area: native-plugin:Camera
  status: shipped
  files: [src/lib/native/camera.ts, src/components/NativeFirstRun.tsx]
  unbuilt: [no gallery picker option (CameraSource.Photos not exposed); saveToGallery=false]

- id: native-geolocation
  area: native-plugin:Geolocation
  status: shipped
  files: [src/lib/native/geolocation.ts, src/components/GpsCalibration.tsx, src/components/GpsTraceControls.tsx]
  unbuilt: [no background location - tracing stops when app is backgrounded]

- id: native-filesystem-share
  area: native-plugin:Filesystem
  status: shipped
  files: [src/lib/native/filesystem.ts, src/lib/export-utils.ts]
  unbuilt: [exports land in Cache - OS-purgeable, no persistent Documents folder path]

- id: native-biometric
  area: native-plugin:NativeBiometric
  status: shipped
  files: [src/lib/native/biometric.ts, src/components/BiometricGate.tsx, src/components/NativeFirstRun.tsx, src/pages/Settings.tsx]
  unbuilt: [stored refresh token can go stale; drops user to email login]

- id: native-push-notifications
  area: native-plugin:PushNotifications
  status: partial
  files: [src/lib/native/push.ts, src/components/NativeFirstRun.tsx, src/pages/Settings.tsx]
  unbuilt: [FCM_SERVER_KEY required; no server-side dispatcher; pushNotificationActionPerformed not wired]

- id: native-first-run-wizard
  status: shipped
  files: [src/components/NativeFirstRun.tsx]
  purpose: Full-screen modal welcome -> camera -> location -> notifications -> biometric -> done.

- id: offline-indexeddb-schema
  area: offline-sync
  status: shipped
  files: [src/lib/offline/db.ts]
  unbuilt: [no v3 upgrade path defined]

- id: offline-react-query-persister
  area: offline-sync
  status: shipped
  files: [src/lib/offline/idb-persister.ts, src/App.tsx]
  unbuilt: [VITE_APP_VERSION never set - cache buster stays "v1" forever]

- id: offline-mirror
  area: offline-sync
  status: shipped
  files: [src/lib/offline/mirror.ts, src/hooks/useProject.ts]
  unbuilt: [annotation_photos blobs NOT mirrored; no incremental mirror (no updated_at watermark)]

- id: offline-outbox
  area: offline-sync
  status: shipped
  files: [src/lib/offline/outbox.ts, src/lib/offline/db.ts]
  unbuilt: [conflict resolution is status-only; no automatic merge strategy]

- id: offline-sync-loop
  area: offline-sync
  status: shipped
  files: [src/lib/offline/sync.ts, src/main.tsx]

- id: offline-mutation-client
  area: offline-sync
  status: shipped
  files: [src/lib/offline/mutation-client.ts, src/lib/offline/sync.ts]

- id: offline-pdf-cache
  area: offline-sync
  status: shipped
  files: [src/lib/offline/pdf-cache.ts]
  unbuilt: [warmPdf may not be called automatically on project open; no UI to see/clear cache size]

- id: sync-panel-ui
  area: offline-sync
  status: shipped
  files: [src/components/SyncPanel.tsx, src/hooks/useOutbox.ts]

- id: pwa-manifest
  area: pwa
  status: shipped
  files: [public/manifest.webmanifest, public/pwa-192.png, public/pwa-512.png, public/apple-touch-icon.png, src/components/PwaShell.tsx]
  unbuilt: [no SW registered anywhere in src - PWA NOT truly offline-capable from cold start; no beforeinstallprompt; maskable icon shares the same asset]

- id: app-icon-master
  area: store-listing
  status: configured-only-no-UI
  files: [src/assets/app-icon-master.png, docs/NATIVE_SETUP.md]
  unbuilt: [icon/splash generation not run; no PWA splash image in public/]

- id: store-listing-copy
  area: store-listing
  status: configured-only-no-UI
  files: [docs/STORE_LISTING.md]
  unbuilt: [support@takeoffpro.app mailbox not set up; /privacy and /terms pages don't exist; no screenshots; versionCode / CFBundleVersion not set]
```

## Promised-but-missing

| Item | Where promised | What's missing |
|---|---|---|
| Push dispatch (FCM/APNs server side) | NATIVE_SETUP.md, STORE_LISTING.md | No Edge Function/cron/trigger reads device_tokens and calls FCM/APNs |
| Tap-notification deep-link | STORE_LISTING.md | pushNotificationActionPerformed never wired in push.ts |
| Privacy policy page (/privacy) | STORE_LISTING.md | No src/pages/Privacy.tsx or route |
| Terms page (/terms) | STORE_LISTING.md | No src/pages/Terms.tsx or route |
| Service worker | PWA manifest implies offline-first | No SW registered; cold-start offline impossible on web |
| ios/ and android/ folders | NATIVE_SETUP.md, capacitor.config.ts | npx cap add never run |
| App Store screenshots | STORE_LISTING.md (6 device sizes, 3-8 screens each) | None produced |
| VITE_APP_VERSION env var | App.tsx React Query cache buster | Never set; buster stays "v1" |
| @transistorsoft commercial license | NATIVE_SETUP.md | No paid license key configured |
| Dedicated maskable PWA icon | manifest.webmanifest | Same asset used for any+maskable - needs safe-zone art |
| warmPdf auto-call on project open | pdf-cache.ts | No confirmed callsite from useProject/plan-viewer |
