---
stream_key: 08-photo-evidence
paths:
  - src/lib/native/camera.ts
  - src/pages/ProjectControls.tsx
  - supabase/functions/tag-photo/index.ts
  - supabase/storage/annotation-photos
  - src/lib/offline/db.ts
  - src/lib/offline/mutation-client.ts
shared_paths: []
---
# Photo Evidence

## Purpose
Allows inspectors to capture field photos (native camera or browser file input), store them in Supabase Storage, and have an AI model suggest the pay item the photo most likely documents. Confirmed photo–pay-item associations link photographic evidence to contract line items, supporting dispute resolution and RE review. This is distinct from document-management (which handles plan PDFs and formal submittals) — photo-evidence is annotation-centric and AI-assisted.

## Surfaces (files)
- `src/lib/native/camera.ts` — Cross-platform camera shim: Capacitor `Camera.getPhoto` on iOS/Android, `<input capture="environment">` fallback on web; returns `{ blob, mimeType }`
- `src/pages/ProjectControls.tsx` — Hosts `uploadPhoto` mutation (uploads blob to `annotation-photos` bucket, inserts `annotation_photos` row, fires `tag-photo` edge function fire-and-forget) and `confirmPhoto` mutation; renders photo gallery tab with confirm/pay-item-select UI (`ProjectControls.tsx:253-278`)
- `supabase/functions/tag-photo/index.ts` — Edge function: receives `photoId`, fetches photo + project pay items, calls Gemini 2.5 Flash via Lovable AI Gateway with `suggest_pay_item` tool, writes `ai_suggested_pay_item_id`, `ai_confidence`, `ai_rationale` back to `annotation_photos`
- `public.annotation_photos` — Table: `storage_path`, `uploaded_by`, `project_id`, `ai_suggested_pay_item_id`, `ai_confidence`, `ai_rationale`, `confirmed` (boolean)
- `supabase/storage/annotation-photos` — Storage bucket; paths follow `{projectId}/{userId}/{uuid}-{filename}`
- `src/lib/offline/db.ts` — IndexedDB schema includes `annotation_photos` store with `by_annotation` index, enabling offline queuing (`db.ts:44,72`)
- `src/lib/offline/mutation-client.ts` — Offline mutation registry maps `annotation_photos` table for sync (`mutation-client.ts:28`)

## Acceptance criteria
- On native (iOS/Android), tapping "Take Photo" opens the device camera via Capacitor; on web it opens a camera-preferred file picker.
- The uploaded file is stored in the `annotation-photos` bucket at `{projectId}/{userId}/{uuid}-{name}` and an `annotation_photos` row is inserted synchronously before the AI call.
- After upload, `tag-photo` is invoked; within a few seconds the photo card updates to show `ai_suggested_pay_item_id`, confidence score, and rationale without a manual refresh.
- An inspector can confirm or override the AI suggestion; confirming sets `confirmed = true` and the chosen `ai_suggested_pay_item_id`.
- The edge function enforces project membership via `is_project_member` RPC before spending AI credits.
- Offline-captured photos queue in IndexedDB and sync when connectivity is restored.

## Current state vs criteria
- **Camera capture** — implemented; dual-path shim covers native and web (`camera.ts:14-42`).
- **Upload + row insert** — implemented; `uploadPhoto` mutation does storage upload then DB insert, then fires tag-photo (`ProjectControls.tsx:253-268`).
- **AI tagging** — implemented; edge function uses `tool_choice` to force structured output, writes three columns back (`tag-photo/index.ts:119-124`).
- **Confirm/override** — implemented; `confirmPhoto` mutation sets `confirmed = true` and the chosen pay item (`ProjectControls.tsx:270-278`).
- **Project membership guard** — implemented in edge function via `is_project_member` RPC (`tag-photo/index.ts:39-43`).
- **Offline queuing** — **partial**: IndexedDB store and mutation registry exist (`db.ts:44,72`; `mutation-client.ts:28`), but camera capture itself requires a live camera API — blob cannot be retained offline without additional serialization logic.
- **Photo → annotation linkage** — **missing**: `annotation_photos` has no `annotation_id` foreign key in the surface-level queries; the `by_annotation` index in IndexedDB implies intent but the column is absent from insert payloads in `ProjectControls.tsx:258-260`.

## Cross-stream handoffs
- **Feeds from**: annotation/takeoff stream — photos are meant to document specific annotations, but the linkage column is not populated.
- **Feeds into**: daily-report-lifecycle — no explicit link; RE cannot currently view photos attached to a submitted report from within `ReReviewCard`.
- **Feeds into**: document-management — photos folder in `Documents.tsx` (`system_kind = 'photos'`) is a separate storage path; no automated bridge copies `annotation-photos` bucket objects into `project-documents`.

## Risks / debt
1. **`annotation_id` linkage is missing in practice** — the `by_annotation` IndexedDB index implies photos should be tied to annotations, but the insert in `ProjectControls.tsx` sets no `annotation_id`; photos float unanchored.
2. **AI call is fire-and-forget with no retry** — if `tag-photo` fails (rate limit, credits exhausted), the error is swallowed; the photo sits untagged with no user indication and no retry mechanism.
3. **Gallery lives only in ProjectControls** — the photo tab is buried in the PM-facing controls hub; inspectors using `DailyReport.tsx` or `ReReviewCard.tsx` have no way to view or attach photos within their workflow.
4. **Offline blob serialization unresolved** — IndexedDB store exists but camera blob is never serialized to it; offline capture will silently drop the photo.
