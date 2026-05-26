
# Phase 5 — Capacitor Native Bridge

Goal: ship the same web app as a true native iOS/Android binary so field inspectors get reliable camera, GPS, file system, and push capabilities — features that PWAs on iOS can't deliver. Web build stays the primary surface; native is an additional shell.

## 1. Capacitor scaffold
- Add deps: `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/ios`, `@capacitor/android`.
- `capacitor.config.ts` with:
  - `appId: app.lovable.25431cb14a594e7aad1424da9039ad81`
  - `appName: TakeoffPro`
  - `webDir: dist`
  - `server.url` pointing at the Lovable sandbox preview for hot-reload during dev; documented removal step for production builds.
- `.gitignore` additions for `ios/`, `android/` (added by the user after export to GitHub — we don't commit them).

## 2. Native capability shim (`src/lib/native/`)
A thin abstraction so the rest of the app stays platform-agnostic:
- `platform.ts` — `isNative()`, `isIOS()`, `isAndroid()` via `Capacitor.getPlatform()`.
- `camera.ts` — `capturePhoto()` uses `@capacitor/camera` on native, falls back to the existing `<input type="file" capture>` on web. Returns `{ blob, mimeType }`.
- `geolocation.ts` — `watchPosition()` uses `@capacitor/geolocation` on native (better accuracy + background permission flow), falls back to `navigator.geolocation` on web. The existing `GpsTraceControls` calls this shim instead of `navigator.geolocation` directly.
- `filesystem.ts` — `saveExport(filename, blob)` writes via `@capacitor/filesystem` + opens with `Share` on native; falls back to a regular `<a download>` on web. Used by export-utils and the daily-report Excel generator.
- `push.ts` — `registerPush()` calls `@capacitor/push-notifications` on native and writes the token to a new `device_tokens` table; no-op on web. Wired only after the user opts in.
- `app-state.ts` — listens to `App.addListener('appStateChange', ...)` to fire the same session-refresh + outbox-drain we already do on `visibilitychange`.

## 3. Photo capture wired into the outbox
- `MobileAnnotationSheet` "Attach photo" button now calls `capturePhoto()`. The returned blob is stored via `outbox_blobs` + a queued `annotation_photos` insert (already supported by the Phase 4 schema).
- Sync loop gains an `annotation_photos` adapter: upload blob to `annotation-photos` bucket → patch record's `storage_path` → insert DB row. Failures retry with the same backoff as other entities.

## 4. Push notifications
- New table `device_tokens (id, user_id, platform, token, created_at, last_seen_at)` with RLS limiting select/update/delete to the owning user.
- Edge function `send-push` (new) called by existing notification triggers (`daily_reports_status_side_effects`) when a report is submitted, approved, or rejected; uses APNs/FCM via a single provider (Firebase Cloud Messaging proxy is simplest). API keys via secrets — we'll ask for `FCM_SERVER_KEY` if/when the user wants this turned on.
- This phase wires the plumbing but ships push **disabled by default**; user must opt in from Settings.

## 5. iOS/Android specific polish
- `Status bar` plugin: set translucent on iOS, dark icons under the navy theme.
- `Splash screen` plugin: 2-second splash with TakeoffPro logo, then fade.
- `Keyboard` plugin: `setResizeMode('native')` so the daily-report form behaves correctly on iOS.
- Safe-area CSS variables (`env(safe-area-inset-*)`) already used by mobile shell; verify on notch devices.
- Android: enable `androidScheme: 'https'` so cookies/storage work consistently.

## 6. Build & deploy story
Because the Lovable sandbox can't run native tooling, the user runs these locally after Export to GitHub:
```
git pull
npm install
npx cap add ios && npx cap add android
npm run build
npx cap sync
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```
Document this in a new `docs/NATIVE_SETUP.md`.

## 7. App-store metadata (deliverables, not code)
Generate placeholders the user can swap:
- App icon set (already have 192/512 from Phase 2 — generate 1024 master).
- iOS launch storyboard + Android adaptive icon.
- Privacy nutrition labels checklist (camera, location, photo library, push).
- Short + long description, keywords.

## 8. WBS update
Mark `PWA-4.x` Completed and `PWA-5.x` In Progress in `schedule_activities` via one data update.

## Explicitly NOT in Phase 5
- App Store / Play Store submission — needs the user's developer accounts.
- Native biometric login (Face ID / fingerprint) — listed as Phase 6 hardening.
- Background location tracking — privacy review needed before enabling.

## Files to touch
```text
New:
  capacitor.config.ts
  src/lib/native/{platform,camera,geolocation,filesystem,push,app-state}.ts
  supabase/functions/send-push/index.ts
  docs/NATIVE_SETUP.md
Edit:
  src/components/MobileAnnotationSheet.tsx   (camera shim)
  src/components/GpsTraceControls.tsx        (geolocation shim)
  src/components/GpsCalibration.tsx          (geolocation shim)
  src/lib/export-utils.ts                    (filesystem shim)
  src/pages/DailyReport.tsx                  (filesystem shim for xlsx)
  src/main.tsx                               (init app-state listeners)
  src/hooks/useAuth.tsx                      (registerPush on login when opted in)
  package.json                               (capacitor deps)
Migration:
  device_tokens table + RLS
  WBS status update for PWA-4.x / PWA-5.x
```

## Acceptance test (web build still passes everything from Phases 1-4)
1. Run on iOS simulator: app opens to login, Google sign-in works in the in-app browser.
2. Open a project, take a photo via the native camera → photo appears on the annotation immediately, sync badge shows pending.
3. Toggle airplane mode, add 3 annotations, kill the app, reopen → annotations restored, queue still pending.
4. Re-enable network → queue drains, photos upload, badges go green.
5. Submit a daily report → push notification arrives on a second device logged in as the RE (once `FCM_SERVER_KEY` is configured).

## Technical notes
- Capacitor's WebView shares `localStorage` and `IndexedDB` with the web build, so the Phase 3-4 offline layer works unchanged.
- Service worker is **disabled** when running inside Capacitor (`Capacitor.isNativePlatform()` guard added to `pwa.ts` registration) — the native runtime handles caching itself.
- Coordinates remain normalized to `scale: 1` before storage (project rule).
- `server.url` in `capacitor.config.ts` must be removed for production builds; document this clearly.
