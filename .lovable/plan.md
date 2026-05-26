
# Phase 4 — Full Offline Read + Write with Sync

Goal: inspectors can create/edit annotations, photos, and daily reports while offline. Changes queue locally, drain automatically when the network returns, and conflicts resolve safely. Phase 3 already covers read fallback; this phase adds the write side.

## 1. Outbox in IndexedDB (`src/lib/offline/outbox.ts`)
Add a new object store `outbox` to the existing DB (bump schema v1 → v2):
- key: auto-increment `seq`
- value: `{ seq, id (uuid), entity, op, projectId, payload, baseUpdatedAt?, createdAt, attempts, lastError?, status: 'pending'|'inflight'|'failed'|'done' }`
- `entity` ∈ `annotations | annotation_photos | daily_reports | calibrations | pay_items`
- `op` ∈ `insert | update | delete`

Helpers: `enqueue(mutation)`, `peekPending(limit)`, `markInflight(seq)`, `markDone(seq)`, `markFailed(seq, err)`, `count()`, `listForUI()`.

Upgrade path is additive — no data loss for existing Phase 3 users.

## 2. Mutation client (`src/lib/offline/mutation-client.ts`)
A small wrapper used by hooks instead of calling `supabase` directly for writeable entities:
```
mutate({ entity, op, projectId, payload, baseUpdatedAt })
```
Behavior:
- If `online && no pending outbox for same row id` → call Supabase directly, on success update IDB mirror + react-query cache, return server row.
- Otherwise → write optimistic record into IDB mirror, enqueue to outbox, return the optimistic row. Tag mirror rows with `_pendingSeq` so the UI can show a sync badge.
- Generates client UUIDs for inserts so the same id persists through sync.

## 3. Sync engine (`src/lib/offline/sync.ts`)
Single-flight drain loop:
- Triggered by: `online` event, app resume (`visibilitychange`), successful auth refresh, manual "Sync now" button, and on `enqueue` when already online.
- Reads pending outbox items in `seq` order, processes serially per `(entity, rowId)` to preserve causality; different rows can run in parallel (cap 4).
- For each item: build Supabase call, attach `If-Match`-style guard for updates by comparing `updated_at = baseUpdatedAt` (where the column exists). On conflict (no row matched), route to conflict resolver.
- Retries with exponential backoff (1s, 4s, 15s, 60s; max 5). After max attempts, mark `failed` and surface in UI; never silently drop.
- On success, refresh the affected react-query keys and the IDB mirror row.

## 4. Conflict resolution
Policy per entity:
- **annotations**: last-write-wins on geometry; merge `notes` (append remote then local with a separator) when both edited.
- **daily_reports** (status `draft` only): server wins for `status`, client wins for `payload` and `snapshot`; if server is no longer `draft`, mark the outbox item as `conflict` and prompt the user with a diff dialog ("Server moved to {status}. Keep your offline edits as a new draft?").
- **annotation_photos**: inserts never conflict (UUID keyed); updates use last-write-wins on `confirmed` / `ai_*` fields.
- **calibrations, pay_items**: PM-only; on conflict, abort and surface to user.

Conflict UI: a small `ConflictResolver` dialog launched from the sync panel listing each conflicted item with "Keep mine / Keep theirs / Merge".

## 5. Photo upload queue
- Photos are blobs, not JSON. Add a sibling store `outbox_blobs { seq, blob, mimeType }`.
- `capturePhoto()` (still web-only this phase) writes blob to `outbox_blobs`, inserts an `annotation_photos` insert into `outbox` referencing that seq, and shows the photo immediately via `URL.createObjectURL` from the cached blob.
- Sync uploads to `annotation-photos` storage bucket first, then inserts the DB row with the returned `storage_path`.

## 6. Hook integration
Refactor write paths to go through `mutation-client`:
- `Index.tsx` annotation create/update/delete handlers
- `MobileAnnotationSheet.tsx` field edits
- `useDailyReport` save & submit (submit stays online-only — gated)
- Pay-item / calibration writes used by PM stay online-only (gated by `useNetworkStatus`)

Online-only actions remain disabled offline (already done in Phase 3): create project, invite, AI tagger, export, P6 publish, RE approve/reject.

## 7. UI affordances
Extend `PwaShell`:
- Pending count badge on the offline pill: `{N} pending · Sync now`.
- New `SyncPanel` sheet listing pending / failed / conflict items with retry and discard.
- Per-annotation cloud icon: green check (synced), grey clock (pending), red exclamation (failed/conflict).

## 8. Background sync registration
- Register `sync` tag `outbox-drain` via Workbox's BackgroundSync where supported; fall back to the in-app drain loop on iOS Safari (no Background Sync API). This is a progressive enhancement — drain still works without it whenever the tab is open.

## 9. WBS update
Mark `PWA-3.x` as `Completed`, `PWA-4.x` as `In Progress` in `schedule_activities` via one data migration.

## Explicitly NOT in Phase 4
- Native camera/filesystem/push (Phase 5: Capacitor).
- CRDT-style fine-grained merge — we keep last-write-wins + manual resolution.
- Schema changes to Supabase tables (no `updated_at` added where missing; we use existing columns).

## Files to touch

```text
New:
  src/lib/offline/outbox.ts
  src/lib/offline/mutation-client.ts
  src/lib/offline/sync.ts
  src/lib/offline/conflict.ts
  src/components/SyncPanel.tsx
  src/components/ConflictResolver.tsx
Edit:
  src/lib/offline/db.ts            (schema v2 + outbox stores)
  src/components/PwaShell.tsx      (pending badge, Sync now)
  src/pages/Index.tsx              (annotation writes via mutation-client)
  src/components/MobileAnnotationSheet.tsx
  src/hooks/useDailyReport.ts
  src/main.tsx                     (kick off sync loop on boot)
  vite.config.ts                   (Workbox BackgroundSyncPlugin for /rest POSTs as fallback)
```

## Acceptance test
1. Open project online, go airplane mode.
2. Add 3 annotations, edit a daily report, attach a photo — UI updates instantly, each item shows "pending".
3. Re-enable network. Outbox drains, badges flip to green, server state matches local within seconds.
4. Force a conflict (edit same annotation on another device first) → `ConflictResolver` opens, user picks resolution, queue resumes.
5. Hard reload while offline → all pending items survive and resume when online.

## Technical notes
- Outbox writes are the only place we generate ids client-side; everywhere else continues to trust server defaults.
- Coordinates remain normalized at `scale: 1` (project rule) before enqueueing.
- All sync code is wrapped to never throw into React render; failures surface only via the SyncPanel + toast.
- Service worker remains disabled inside the Lovable editor preview; full verification happens on the installed PWA.
