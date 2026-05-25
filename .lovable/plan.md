
# Phase 3 — Read-Only Offline

Goal: open a project online, go airplane mode, reload, and still view the PDF, annotations, pay items, calibrations, specs, and the last daily report. Writes are still online-only — Phase 4 covers the outbox.

## What gets built

### 1. IndexedDB layer (`src/lib/offline/`)
- Add `idb` dependency.
- `db.ts` — open one DB `takeoffpro-offline` v1 with object stores:
  - `projects` (key: id)
  - `pay_items` (key: id, index by `project_id`)
  - `annotations` (key: id, index by `project_id`)
  - `annotation_photos` (key: id, index by `annotation_id`)
  - `calibrations` (key: id, index by `project_id`)
  - `geo_calibrations` (key: id, index by `project_id`)
  - `schedule_activities` (key: id, index by `project_id`)
  - `documents_meta` (key: id, index by `project_id`)
  - `daily_reports` (key: id, index by `[project_id+report_date]`)
  - `meta` (kv: `lastSyncedAt`, `activeProjectId`)
- `mirror.ts` — `mirrorProject(projectId)` does a single batched fetch from Supabase and bulk-puts into the stores above; called on project open and on successful realtime events.
- Coordinates remain at `scale: 1` per the project rule.

### 2. React Query persistence (`src/lib/offline/query-persist.ts`)
- Add `@tanstack/react-query-persist-client` and a custom IDB persister (writes to `meta` store, key `rq-cache`).
- Wrap `QueryClientProvider` with `PersistQueryClientProvider` in `App.tsx`.
- `dehydrateOptions.shouldDehydrateQuery` only persists queries whose key starts with one of: `['project']`, `['pay-items']`, `['annotations']`, `['calibrations']`, `['documents']`, `['daily-report']`, `['schedule']`, `['specs']`. Skip realtime-only and mutation caches.
- `maxAge: 14 days`, `buster` keyed to app version from `package.json` so deploys invalidate cleanly.

### 3. PDF cache (`src/lib/offline/pdf-cache.ts`)
- Use a dedicated `CacheStorage` bucket `pdf-cache-v1`.
- `warmPdf(projectId, signedUrl)` — fetch + `cache.put`; called when a project is opened online.
- `getCachedPdf(projectId)` — returns `Response` if present, else null. `PdfCanvas` already loads from a URL; add a wrapper that falls back to the cached response when offline.
- LRU cap ~500 MB: track `{ projectId, size, lastUsed }` in IDB `meta` and evict oldest when over cap.

### 4. Workbox runtime additions (`vite.config.ts`)
Add to `runtimeCaching`:
- Supabase REST GETs (`/rest/v1/*`) → `NetworkFirst`, 3s timeout, `cacheableResponse: { statuses: [0,200] }`, cache `supabase-rest`.
- Supabase storage signed URLs (`/storage/v1/object/sign/*` and `/object/authenticated/*`) → `CacheFirst`, cache `supabase-files`, expiration 200 entries / 30 days.
- Leave OAuth/auth routes in the existing denylist.

### 5. Offline-aware data hooks
Modify these to read from IDB on cache miss / network failure (no behavioral change when online):
- `useProject`, `useProjects`
- `usePayItemActivityMap` (and the pay items fetch behind it)
- The annotation loader inside `Index.tsx`
- `useDocuments` (metadata only — file blobs stay in storage cache)
- `useDailyReport` (returns last-known snapshot when offline)

Pattern: try Supabase → on error or `!online`, return the IDB mirror; on success, write back to IDB.

### 6. UI affordances
- Reuse `useNetworkStatus`. When offline:
  - Disable + tooltip "Requires connection" on: create project, invite member, run AI tagger, export approvals to email, P6 publish.
  - In `PwaShell`, expand the offline pill to a small panel: "Offline — viewing cached data. {N} projects available offline."
- Add a "Make available offline" button on the project header that calls `mirrorProject` + `warmPdf` and shows progress.

## What is explicitly NOT in Phase 3
- No write queue, no optimistic mutations, no conflict resolution (Phase 4).
- No native camera/filesystem (Phase 5).
- No background sync registration (Phase 4 schedules drain loop).

## WBS schedule update
Mark `PWA-2.x` activities as `Completed` and `PWA-3.x` as `In Progress` in `schedule_activities` so the in-app P6 view stays accurate. Single migration with status updates.

## Technical notes
- IDB writes are best-effort: every helper wraps in try/catch and logs to console only — never throws into render.
- React Query persister must run **after** auth bootstraps so we don't restore a cache belonging to a different user; gate `PersistQueryClientProvider` on `user?.id` and key the persister by user id.
- Service worker is still disabled in the Lovable editor preview — verification must happen on the published `.lovable.app` URL or installed PWA.
- No schema changes in this phase; all changes are client-side.

## Files to touch
- New: `src/lib/offline/db.ts`, `mirror.ts`, `query-persist.ts`, `pdf-cache.ts`, `idb-persister.ts`
- Edit: `vite.config.ts`, `src/App.tsx`, `src/components/PwaShell.tsx`, `src/components/PdfCanvas.tsx`, `src/hooks/useProject.ts`, `src/hooks/useProjects.ts`, `src/hooks/usePayItemActivityMap.ts`, `src/hooks/useDocuments.ts`, `src/hooks/useDailyReport.ts`, `src/pages/Index.tsx` (annotation loader)
- Migration: status update for PWA WBS activities
- `package.json`: add `idb`, `@tanstack/react-query-persist-client`

## Acceptance test
1. Open a project online, load PDF, view annotations.
2. Enable airplane mode, hard-reload.
3. App shell loads, project list renders from IDB, PDF renders from cache, annotations + pay items + last daily report visible, offline pill shown, write actions disabled.
4. Re-enable network → cached data refreshes silently, pill disappears.
