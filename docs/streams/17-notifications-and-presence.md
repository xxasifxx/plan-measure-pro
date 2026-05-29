---
stream_key: 17-notifications-and-presence
paths:
  - src/components/NotificationBell.tsx
  - src/hooks/useNotifications.ts
  - supabase/functions/send-push/index.ts
  - src/lib/native/push.ts
  - src/hooks/useProject.ts:421–448
  - src/pages/Index.tsx:795
shared_paths: []
---
# Notifications & Presence

## Purpose
Closes the feedback loop between field inspectors and Resident Engineers: when a daily report is submitted, approved, or rejected the right person is alerted immediately — via in-app bell or native push — rather than polling dashboards. The presence layer shows who is currently co-editing a project canvas in real time.

## Surfaces (files)
- `src/components/NotificationBell.tsx` — popover bell with unread badge, per-kind icons, `markRead`/`markAllRead`, navigation on click
- `src/hooks/useNotifications.ts` — `useQuery` against `notifications` + Supabase Realtime `INSERT` subscription; 60s polling fallback; `markRead`/`markAllRead` mutations
- `supabase/functions/send-push/index.ts` — edge function: reads `device_tokens`, calls FCM HTTP v1 API; gated on `FCM_SERVER_KEY` secret
- `src/lib/native/push.ts` — Capacitor `PushNotifications` shim; registers token to `device_tokens`; foreground Sonner toast; `unregisterPush`
- `src/hooks/useProject.ts:421–448` — Supabase Presence channel `presence:<projectId>`; tracks `{ name }`; `onlineUsers` array
- `src/pages/Index.tsx:795` — renders `"{onlineUsers.length} online"` badge in desktop toolbar

## Acceptance criteria
- Submitting a daily report creates a `report_submitted` notification row; RE's bell badge increments within 60s (or immediately via realtime).
- Approving/rejecting creates `report_approved`/`report_rejected` rows visible to inspector.
- Clicking a notification navigates to the correct route and marks it read.
- On Capacitor build, push token is written to `device_tokens` after permission granted.
- `send-push` delivers an FCM push when a notification is created.
- Two users with same project open show each other's name in the online-users badge.

## Current state vs criteria
- **Bell + realtime subscribe**: implemented — `useNotifications` subscribes to `postgres_changes` INSERT for `user_id=eq.{userId}`.
- **markRead / markAllRead**: implemented.
- **Navigation on click**: implemented — `KIND_META[n.kind].route()`.
- **Native push registration**: implemented — full Capacitor lifecycle in `lib/native/push.ts`.
- **send-push edge function**: implemented — FCM v1 batching; **partial** — only fires when called explicitly; no DB trigger wiring `notifications INSERT` → `send-push`.
- **Presence / online users**: implemented; **partial** — `name` tracked as empty string (`presenceChannel.track({ name: '' })`, line 443).
- **Notification creation on submit/approve/reject**: **partial** — no DB trigger or edge function found that auto-inserts into `notifications` on `daily_reports` status change.

## Cross-stream handoffs
- **Feeds from** daily-report-lifecycle: `daily_reports` status changes should trigger notification inserts.
- **Feeds from** identity-and-access: `useAuth`/`useProject` supply `userId` for channel key + RLS filter.
- **Consumed by** mobile-field-ergonomics: `NotificationBell` rendered in both desktop and mobile header.

## Risks / debt
- No confirmed trigger that auto-inserts into `notifications`; notification pipeline may be entirely manual/missing.
- Presence `name` always `''`; online user list shows "User" for everyone.
- `useNotifications` polls every 60s on web; poor UX fallback for time-sensitive RE actions.
- `send-push` reads `FCM_SERVER_KEY` but FCM HTTP v1 requires OAuth2 service-account tokens, not legacy server key; likely silent failures in production.
