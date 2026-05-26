# Phase 6 — Native Hardening & Store Readiness

Goal: take the Capacitor shell from Phase 5 to a state where inspectors can install it daily and we can submit to the App Store / Play Store. Web build remains the primary surface and must keep passing everything from Phases 1–5.

## 1. Biometric login (Face ID / Touch ID / fingerprint)
- Add `@capacitor-community/biometric-auth` (or `capacitor-native-biometric`).
- New shim `src/lib/native/biometric.ts` with `isAvailable()`, `enroll(session)`, `unlock()`.
- On successful Supabase login (native only), prompt: "Enable Face ID for faster sign-in?" → store the refresh token in the Keychain/Keystore via the plugin's secure storage.
- New `BiometricGate` component shown on cold start when a stored credential exists; falls back to email/password if biometric fails or is unavailable.
- Settings → Security panel to toggle on/off and re-enroll.

## 2. Push notifications — opt-in UI + wiring
- Wire `registerPush()` (already scaffolded in Phase 5 plan but not built) → writes token to `device_tokens`.
- New `Settings → Notifications` toggle. Default OFF. Toggling ON triggers `PushNotifications.requestPermissions()`.
- New edge function `send-push` invoked by existing `daily_reports_status_side_effects` trigger when a report is Submitted, Approved, or Rejected.
- Provider: Firebase Cloud Messaging (handles both APNs and FCM). Requires user-provided `FCM_SERVER_KEY` secret — will prompt via `add_secret` when the user is ready.
- In-app foreground handler shows a Sonner toast instead of the OS banner.

## 3. Background sync triggers
- iOS: `BackgroundFetch` plugin (`@capacitor-community/background-fetch`) registered with a 15-minute minimum interval to drain the outbox while the app is suspended.
- Android: same plugin uses WorkManager under the hood.
- Reuses `triggerSync()` from Phase 4 — no business logic changes.
- Disabled when the user opts out of "Background sync" in Settings (default ON for inspectors, OFF for PMs).

## 4. Native onboarding (first run)
- New `NativeFirstRun` flow shown only on `isNative()` first launch:
  1. Welcome / role detection
  2. Camera permission rationale → request
  3. Location permission rationale → request (with "While Using" vs "Always" explanation)
  4. Notification permission rationale → request
  5. Offer biometric enrollment
- Skippable; can be re-run from Settings.

## 5. App icon, splash, and store assets
- Generate 1024×1024 master icon (TakeoffPro mark on navy) via `imagegen`.
- Add `capacitor-assets` dev dep; document `npx capacitor-assets generate` in `NATIVE_SETUP.md`.
- Splash: navy background + centered logo, 1.5 s with fade.
- Generate screenshot mockups for App Store (6.7", 6.5", 5.5") and Play Store (phone + 7" tablet) using the existing landing-page renderer.
- Draft `docs/STORE_LISTING.md`: short description, long description, keywords, privacy nutrition labels (camera, location, photo library, push), support URL, marketing URL.

## 6. iOS / Android config polish
- `Info.plist` permission strings (camera, location-when-in-use, photo library add, Face ID).
- `AndroidManifest.xml` permissions (CAMERA, ACCESS_FINE_LOCATION, POST_NOTIFICATIONS, USE_BIOMETRIC).
- App Transport Security: production build forbids cleartext.
- Add `versionCode` / `versionName` bump helper script.

## 7. Telemetry & crash reporting (optional)
- Sentry SDK behind an opt-in build flag. Off by default; surfaced as a Settings toggle.
- No PII captured — only stack traces and breadcrumbs.

## 8. WBS update
- Mark `PWA-5.x` Completed and `PWA-6.x` In Progress in `schedule_activities` via one data update.

## Explicitly NOT in Phase 6
- App Store / Play Store submission itself (needs your Apple Developer + Google Play accounts).
- Tablet-specific layouts beyond what the responsive web build already does.
- Apple Watch / Wear OS companions.

## Files to touch
```text
New:
  src/lib/native/biometric.ts
  src/lib/native/push.ts
  src/lib/native/background-sync.ts
  src/components/BiometricGate.tsx
  src/components/NativeFirstRun.tsx
  src/components/SettingsNotifications.tsx
  src/components/SettingsSecurity.tsx
  supabase/functions/send-push/index.ts
  docs/STORE_LISTING.md
  src/assets/app-icon-master.png
Edit:
  src/main.tsx                 (mount BiometricGate + NativeFirstRun on native)
  src/hooks/useAuth.tsx        (biometric unlock path)
  src/pages/ProjectControls.tsx or new Settings route
  docs/NATIVE_SETUP.md         (capacitor-assets, store flow)
  package.json                 (biometric + background-fetch + capacitor-assets)
Migration:
  device_tokens table (if not already created in Phase 5 migration)
  WBS status update for PWA-5.x / PWA-6.x
Secrets (prompted when needed):
  FCM_SERVER_KEY
```

## What I'll need from you, and when
- **Now**: nothing — I can build all of Phase 6 except live push delivery.
- **When you want push to actually deliver**: an `FCM_SERVER_KEY` from a Firebase project (I'll prompt via the secrets flow).
- **When you want to submit**: Apple Developer account ($99/yr), Google Play account ($25 one-time), and a final logo PNG if you want to replace the generated placeholder.

## Acceptance test
1. Web build: all Phase 1–5 behaviour unchanged; biometric/push code tree-shaken out.
2. iOS simulator: cold start → BiometricGate appears after first enrollment, unlocks Supabase session.
3. Background sync: airplane mode → add annotations → background the app for 20 min → re-enable network → outbox drains without opening the app.
4. Push: submit a daily report on Device A → push arrives on Device B logged in as the RE.
5. `npx capacitor-assets generate` produces correct icon + splash sets for iOS and Android.
