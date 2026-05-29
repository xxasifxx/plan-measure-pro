# Offline and Native Durability

## Purpose
Makes TakeoffPro usable on construction sites with intermittent or absent connectivity by caching project data in IndexedDB, queueing writes in a durable outbox, syncing to Supabase when back online, caching plan PDFs in CacheStorage for offline viewing, and wrapping the app in a PWA shell and Capacitor native shell (iOS/Android) with biometric auth, device filesystem, camera, push, and background sync.

## Surfaces (files)
- `src/lib/offline/db.ts` — `getDB`: opens `takeoffpro-offline` IDB v2 with 13 stores; `safeGet/safePut/safeDelete/safeBulkPut/safeGetAllByIndex/clearAll`
- `src/lib/offline/mirror.ts` — `mirrorProject`: `Promise.allSettled` snapshot of 8 Supabase tables; `mirrorProjectList`
- `src/lib/offline/outbox.ts` — `enqueue`, `listByStatus`, `pendingForRow`, `countPending`, `updateRecord`, `removeRecord`, `storeBlob`, `getBlob`; `subscribeOutbox`
- `src/lib/offline/mutation-client.ts` — `mutate`: online-first wrapper with outbox fallback and optimistic IDB mirror; `runDirect`
- `src/lib/offline/sync.ts` — `triggerSync`, `startSyncLoop`: drains outbox with 4 parallel workers, per-row serial ordering, exponential backoff (1s–3m, 5 attempts)
- `src/lib/offline/pdf-cache.ts` — `warmPdf`, `getCachedPdf`: CacheStorage `pdf-cache-v1`, 500 MB LRU cap with IDB metadata
- `src/lib/offline/idb-persister.ts` — TanStack Query IDB persister
- `src/lib/pwa.ts` — `shouldRegisterSW`, `registerSWWithUpdates`, `unregisterAllSW`; guards iframe/preview/localhost/Capacitor
- `src/components/PwaShell.tsx` — offline pill, install CTA, update-available toast
- `src/components/SyncPanel.tsx` — outbox queue status with per-item retry
- `src/lib/native/platform.ts` — `isNative`, `platform`, `isIOS`, `isAndroid`
- `src/lib/native/filesystem.ts` — `saveExport`
- `src/lib/native/camera.ts` — Capacitor Camera shim
- `src/lib/native/biometric.ts` — FaceID/TouchID
- `src/lib/native/background-sync.ts` — `App.addListener('appStateChange')` → `triggerSync`
- `src/lib/native/push.ts` — Capacitor PushNotifications
- `src/lib/native/geolocation.ts` — Capacitor Geolocation
- `src/lib/native/app-state.ts` — foreground/background lifecycle
- `src/components/BiometricGate.tsx` — biometric prompt
- `src/components/NativeFirstRun.tsx` — first-run onboarding for native
- `src/hooks/useNetworkStatus.ts` — `navigator.onLine` + listeners
- `src/hooks/useOutbox.ts` — reactive outbox count/items via `subscribeOutbox`
- `capacitor.config.ts` — Capacitor config
- `public/manifest.webmanifest` — PWA manifest

## Acceptance criteria
1. When offline, app displays offline pill and serves projects, annotations, and PDFs from IDB/CacheStorage without network.
2. Offline annotation is written optimistically to IDB with `_pendingSync: true` and syncs when online.
3. Outbox drain processes mutations for the same row serially; up to 4 different rows concurrently.
4. Failed mutation retries with exponential backoff up to 5 attempts (1s, 4s, 15s, 60s, 180s) and surfaces in `SyncPanel`.
5. On Capacitor iOS/Android, `shouldRegisterSW()` returns `false`; no service worker registered.
6. On web deploy, `PwaShell` registers Workbox SW and shows "Update available" prompt on `waiting`.
7. `warmPdf` stores PDF in `pdf-cache-v1`; subsequent calls return cached blob within 500 MB cap.

## Current state vs criteria
1. **Partial** — `mirrorProject` snapshots 8 tables; `daily_reports` capped at 30 rows (mirror.ts:27), silently truncating history.
2. **Implemented** — `mutate` applies IDB mirror before enqueue; `_pendingSync: true` set.
3. **Implemented** — `drainOnce` groups by `rowId`, processes serially with 4 parallel workers.
4. **Implemented** — `scheduleRetry` uses `BACKOFF_MS = [1000, 4000, 15000, 60000, 180000]`; `SyncPanel.retryItem`.
5. **Implemented** — `shouldRegisterSW` checks `Capacitor.isNativePlatform()`.
6. **Implemented** — `registerSWWithUpdates` uses Workbox; `PwaShell` wires `setReloadFn` on `waiting`.
7. **Implemented** — `warmPdf` opens `pdf-cache-v1`, tracks metadata; `evictIfNeeded` enforces 500 MB cap.

## Cross-stream handoffs
- **Serves ← all streams**: `mutate` is the single offline-safe write path for annotations, daily reports, calibrations, pay items, schedule activities.
- **Serves ← data-export-and-interoperability**: `saveExport` is the write exit on native.
- **Serves ← measurement-and-geometry-engine**: `calibrations`/`geo_calibrations` IDB stores populated by `mirrorProject`.
- **Feeds → schedule-management**: `schedule_activities` IDB store provides offline reads.

## Risks / debt
1. **`daily_reports` capped at 30 rows** — inspectors reviewing older history offline see gaps with no warning.
2. **No conflict resolution UI** — `OutboxStatus` includes `"conflict"` but `mutation-client.ts` never sets it; conflicts land in `"failed"` instead.
3. **IDB schema is v2 with no documented migration path** — `getDB` only handles `oldVersion < 1` and `< 2`; a future v3 risks data loss.
4. **`jsPDF.save()` bypass** — generated PDFs aren't warmable and won't be available offline.
